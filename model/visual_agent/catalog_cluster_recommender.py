
"""
catalog_cluster_recommender.py 

Recomendador basado en CLUSTERING (ML no supervisado)
- Features: TF-IDF(n-gramas 1–2, min_df configurable) sobre texto + OneHot en categóricas (todo sparse).
- Reducción: TruncatedSVD (LSA) → embedding d-dimensional (svd_components).
- Clustering: KMeans (k fijo o auto-k por silhouette sobre muestra).
- Ranking: similitud coseno en el embedding, por defecto restringido al MISMO clúster.

IDs: Se manejan como strings para preservar ceros a la izquierda.
Columna sintética: "__text_all__" se crea dentro de fit(), y se refuerza en _build_pipeline().

"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Dict, Tuple
import warnings
import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.decomposition import TruncatedSVD
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import cosine_similarity
from scipy import sparse


def _safe_series(df: pd.DataFrame, col: str) -> pd.Series:
    return df[col] if col in df.columns else pd.Series([""] * len(df), index=df.index)


def _coalesce_text(df: pd.DataFrame, cols: Sequence[str]) -> pd.Series:
    """Concatena columnas de texto (si no existen, devuelve vacío)."""
    if not cols:
        return pd.Series([""] * len(df), index=df.index)
    out = _safe_series(df, cols[0]).fillna("").astype(str)
    for c in cols[1:]:
        out = out.str.cat(_safe_series(df, c).fillna("").astype(str), sep=" ")
    return out


@dataclass
class ClusterRecommender:
    # Configuración de features
    text_cols: List[str] = field(default_factory=lambda: ["prod_name", "detail_desc"])
    cat_cols: List[str]  = field(default_factory=lambda: [
        "garment_group_name", "section_name", "index_name",
        "graphical_appearance_name", "perceived_colour_master_name",
        "perceived_colour_value_name"
    ])
    min_df: int = 2
    ngram_range: Tuple[int, int] = (1, 2)
    svd_components: int = 128

    # Clustering / aleatoriedad
    random_state: int = 42
    sample_for_k: int = 10000
    k_candidates: Sequence[int] = (8, 12, 16, 20, 24, 32)
    max_iter: int = 300
    n_init: int = 10

    # Artefactos aprendidos
    _df: Optional[pd.DataFrame] = None
    _article_index: Dict[str, int] = field(default_factory=dict)
    _feature_pipeline: Optional[Pipeline] = None
    _X_reduced: Optional[np.ndarray] = None
    _kmeans: Optional[KMeans] = None
    _labels_: Optional[np.ndarray] = None

    # -------------------------
    # Construcción del pipeline
    # -------------------------
    def _build_pipeline(self, df: pd.DataFrame) -> Pipeline:
        # Defensa doble: asegura __text_all__
        if "__text_all__" not in df.columns:
            df["__text_all__"] = (
                df.get("prod_name", "").fillna("").astype(str) + " " +
                df.get("detail_desc", "").fillna("").astype(str)
            )

        # desde aquí, FUERA del if
        text_features = Pipeline(steps=[
            ("tfidf", TfidfVectorizer(min_df=self.min_df, ngram_range=self.ngram_range))
        ])

        cat_existing = [c for c in self.cat_cols if c in df.columns]

        try:
            ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
        except TypeError:
            ohe = OneHotEncoder(handle_unknown="ignore", sparse=True)

        transformers = [("text", text_features, "__text_all__")]
        if cat_existing:
            transformers.append(("cat", ohe, cat_existing))

        coltx = ColumnTransformer(transformers=transformers, remainder="drop", sparse_threshold=1.0)
        pipe = Pipeline(steps=[
            ("features", coltx),
            ("svd", TruncatedSVD(n_components=self.svd_components, random_state=self.random_state))
        ])
        return pipe

    # ---------
    # Entrenar
    # ---------
    def fit(self, df: pd.DataFrame, k: Optional[int] = None) -> "ClusterRecommender":
        if "article_id" not in df.columns:
            raise ValueError("El DataFrame debe contener la columna 'article_id'.")

        # Copia + crea texto unificado
        self._df = df.reset_index(drop=True).copy()
        self._df["__text_all__"] = _coalesce_text(self._df, self.text_cols)

        # Preservar ceros a la izquierda: IDs como string
        self._article_index = {str(aid): i for i, aid in enumerate(self._df["article_id"].astype(str).values)}

        # Pipeline de features + SVD
        self._feature_pipeline = self._build_pipeline(self._df)
        X_reduced = self._feature_pipeline.fit_transform(self._df)
        if sparse.issparse(X_reduced):
            X_reduced = X_reduced.toarray()
        self._X_reduced = X_reduced

        # Elegir k si no se fija
        if k is None:
            k = self._choose_k(self._X_reduced)

        # KMeans
        self._kmeans = KMeans(n_clusters=k, random_state=self.random_state, n_init=self.n_init, max_iter=self.max_iter)
        self._labels_ = self._kmeans.fit_predict(self._X_reduced)
        return self

    def _choose_k(self, X: np.ndarray) -> int:
        n = X.shape[0]
        if n == 0:
            raise ValueError("No hay filas para entrenar. Revisa tu DataFrame.")
        if n > self.sample_for_k:
            rng = np.random.default_rng(self.random_state)
            idx = rng.choice(n, size=self.sample_for_k, replace=False)
            X_sample = X[idx]
        else:
            X_sample = X

        best_k, best_score = None, -1.0
        for k in self.k_candidates:
            if k >= len(X_sample):  # se requiere al menos k < n
                continue
            try:
                labels = KMeans(n_clusters=k, random_state=self.random_state,
                                n_init=self.n_init, max_iter=self.max_iter).fit_predict(X_sample)
                score = silhouette_score(X_sample, labels, metric="euclidean")
                if score > best_score:
                    best_k, best_score = k, score
            except Exception as e:
                warnings.warn(f"Silhouette falló para k={k}: {e}")
        if best_k is None:
            best_k = min(self.k_candidates)
        return best_k

    def _ensure_fitted(self):
        if self._df is None or self._X_reduced is None or self._kmeans is None or self._labels_ is None:
            raise RuntimeError("Modelo no entrenado. Llama primero a .fit(df).")

    # ------------------
    # Consultas básicas
    # ------------------
    def embedding(self, article_id: str) -> np.ndarray:
        self._ensure_fitted()
        idx = self._article_index.get(str(article_id))
        if idx is None:
            raise ValueError(f"article_id {article_id} no existe en el DataFrame.")
        return self._X_reduced[idx]

    def cluster_of(self, article_id: str) -> int:
        self._ensure_fitted()
        idx = self._article_index.get(str(article_id))
        if idx is None:
            raise ValueError(f"article_id {article_id} no existe en el DataFrame.")
        return int(self._labels_[idx])

    # -----------------
    # Recomendaciones
    # -----------------
    def recommend_for(self, article_id: str, k: int = 10, exclude_same_product: bool = True) -> pd.DataFrame:
        self._ensure_fitted()
        idx = self._article_index.get(str(article_id))
        if idx is None:
            raise ValueError(f"article_id {article_id} no existe en el DataFrame.")

        cl = self._labels_[idx]
        in_cluster = np.where(self._labels_ == cl)[0]

        q = self._X_reduced[idx].reshape(1, -1)
        sims = cosine_similarity(q, self._X_reduced[in_cluster])[0]

        candidates = self._df.iloc[in_cluster].copy()
        candidates["__sim__"] = sims

        # excluir mismo product_code si existe
        if exclude_same_product and "product_code" in candidates.columns and "product_code" in self._df.columns:
            prod_code = str(self._df.iloc[idx].get("product_code", ""))
            candidates["product_code"] = candidates["product_code"].astype(str)
            candidates = candidates[candidates["product_code"] != prod_code]

        # excluir el mismo artículo
        candidates = candidates[candidates["article_id"].astype(str) != str(article_id)]

        cols = ["article_id","product_code","prod_name","garment_group_name",
                "section_name","index_name","perceived_colour_master_name",
                "graphical_appearance_name","__sim__"]
        cols = [c for c in cols if c in candidates.columns]
        return candidates.sort_values("__sim__", ascending=False).head(k)[cols]

    def recommend_for_cart(self, article_ids: Sequence[str], k: int = 10, diversity: bool = True) -> pd.DataFrame:
        self._ensure_fitted()
        indices = []
        for aid in article_ids:
            idx = self._article_index.get(str(aid))
            if idx is not None:
                indices.append(idx)
        if not indices:
            raise ValueError("Ninguno de los article_id del carrito está en el DataFrame.")

        clusters = np.unique(self._labels_[indices])
        in_clusters = np.where(np.isin(self._labels_, clusters))[0]

        Q = self._X_reduced[indices]
        C = self._X_reduced[in_clusters]
        sims = cosine_similarity(C, Q).max(axis=1)

        candidates = self._df.iloc[in_clusters].copy()
        candidates["__sim__"] = sims

        in_cart_ids = set(str(a) for a in article_ids)
        candidates = candidates[~candidates["article_id"].astype(str).isin(in_cart_ids)]

        if diversity:
            selected_rows = []
            used_codes = set()
            used_groups = set()
            if "product_code" in candidates.columns:
                candidates["product_code"] = candidates["product_code"].astype(str)
            for _, row in candidates.sort_values("__sim__", ascending=False).iterrows():
                code = row.get("product_code", None)
                group = row.get("garment_group_name", None)
                if (code not in used_codes) or (group not in used_groups):
                    selected_rows.append(row)
                    if code is not None: used_codes.add(code)
                    if group is not None: used_groups.add(group)
                if len(selected_rows) >= k:
                    break
            out = pd.DataFrame(selected_rows)
        else:
            out = candidates.sort_values("__sim__", ascending=False).head(k)

        cols = ["article_id","product_code","prod_name","garment_group_name",
                "section_name","index_name","perceived_colour_master_name",
                "graphical_appearance_name","__sim__"]
        cols = [c for c in cols if c in out.columns]
        return out[cols]

    # ------------------
    # Utilidad / Export
    # ------------------
    def fit_transform_df(self) -> pd.DataFrame:
        self._ensure_fitted()
        df_out = self._df.copy()
        df_out["cluster"] = self._labels_
        return df_out

    def save(self, path: str) -> None:
        import joblib
        self._ensure_fitted()
        joblib.dump({
            "article_index": self._article_index,
            "feature_pipeline": self._feature_pipeline,
            "X_reduced": self._X_reduced,
            "kmeans": self._kmeans,
            "labels_": self._labels_,
            "params": {
                "text_cols": self.text_cols,
                "cat_cols": self.cat_cols,
                "min_df": self.min_df,
                "ngram_range": self.ngram_range,
                "svd_components": self.svd_components,
                "random_state": self.random_state,
                "sample_for_k": self.sample_for_k,
                "k_candidates": self.k_candidates,
                "max_iter": self.max_iter,
                "n_init": self.n_init,
            }
        }, path)

    @staticmethod
    def load(path: str) -> "ClusterRecommender":
        import joblib
        payload = joblib.load(path)
        obj = ClusterRecommender(
            text_cols=payload["params"]["text_cols"],
            cat_cols=payload["params"]["cat_cols"],
            min_df=payload["params"]["min_df"],
            ngram_range=tuple(payload["params"]["ngram_range"]),
            svd_components=payload["params"]["svd_components"],
            random_state=payload["params"]["random_state"],
            sample_for_k=payload["params"]["sample_for_k"],
            k_candidates=tuple(payload["params"]["k_candidates"]),
            max_iter=payload["params"]["max_iter"],
            n_init=payload["params"]["n_init"],
        )
        obj._article_index = payload["article_index"]
        obj._feature_pipeline = payload["feature_pipeline"]
        obj._X_reduced = payload["X_reduced"]
        obj._kmeans = payload["kmeans"]
        obj._labels_ = payload["labels_"]
        return obj

    def recommend_cart(self, article_ids, k=10, mode="max", dentro_cluster=True):
        idxs = [self._article_index.get(str(a)) for a in article_ids]
        idxs = [i for i in idxs if i is not None]
        if not idxs:
            raise ValueError("IDs no encontrados.")

        # Candidatos: unión de clústeres de las anclas (o todo)
        cand_idx = (np.where(np.isin(self._labels_, np.unique(self._labels_[idxs])))[0]
                    if dentro_cluster else np.arange(self._X_reduced.shape[0]))

        C = self._X_reduced[cand_idx]
        Q = self._X_reduced[idxs]

        # score: max / avg(centroide) / min
        if mode == "max":
            sims = cosine_similarity(C, Q).max(axis=1)
        elif mode == "avg":
            sims = cosine_similarity(C, Q.mean(axis=0, keepdims=True)).ravel()
        elif mode == "min":
            sims = cosine_similarity(C, Q).min(axis=1)
        else:
            raise ValueError("mode debe ser 'max' | 'avg' | 'min'")

        out = self._df.iloc[cand_idx].copy()
        out["__sim__"] = sims
        out = out[~out["article_id"].astype(str).isin(set(map(str, article_ids)))]

        cols = ["article_id","product_code","prod_name","garment_group_name",
                "section_name","index_name","perceived_colour_master_name",
                "graphical_appearance_name","__sim__"]
        return out.sort_values("__sim__", ascending=False).head(k)[
            [c for c in cols if c in out.columns]
        ]
