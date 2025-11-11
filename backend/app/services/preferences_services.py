# app/services/preferences_services.py
from typing import List, Dict
from flask import current_app

# Facetas que mapearemos desde catalog
FACETS = ("GENDER", "DEPARTMENT", "PRODUCT_GROUP", "SECTION", "GARMENT_GROUP", "COLOUR")

# Pesos por tipo de evento
ONBOARDING_WEIGHTS = {
    "GENDER":        2.0,
    "DEPARTMENT":    1.5,
    "PRODUCT_GROUP": 1.0,
    "SECTION":       0.6,
    "GARMENT_GROUP": 0.5,
    "COLOUR":        0.3,
}

PURCHASE_WEIGHTS = {
    "GENDER":        3.0,
    "DEPARTMENT":    2.5,
    "PRODUCT_GROUP": 2.0,
    "SECTION":       1.5,
    "GARMENT_GROUP": 1.0,
    "COLOUR":        0.5,
}

# MERGE para upsert de preferencias
MERGE_SQL = """
MERGE INTO user_pref_kv t
USING (
  SELECT :user_id AS user_id, :facet AS facet, :key_text AS key_text, :inc AS inc
  FROM dual
) s
ON (t.user_id = s.user_id AND t.facet = s.facet AND t.key_text = s.key_text)
WHEN MATCHED THEN
  UPDATE SET t.weight = t.weight + s.inc, t.updated_at = SYSTIMESTAMP
WHEN NOT MATCHED THEN
  INSERT (user_id, facet, key_text, weight)
  VALUES (s.user_id, s.facet, s.key_text, s.inc)
"""

def _infer_gender(row: Dict) -> str | None:
    """
    Intenta inferir 'Menswear' | 'Ladieswear' | 'Divided' a partir de distintas columnas.
    """
    candidates = [
        (row.get("index_group_name") or "").strip(),
        (row.get("section_name") or "").strip(),
        (row.get("department_name") or "").strip(),
    ]
    for txt in candidates:
        low = txt.lower()
        if "men" in low:
            return "Menswear"
        if "lady" in low or "women" in low or "ladies" in low:
            return "Ladieswear"
        if "divided" in low:
            return "Divided"
    return None

def _rows_for_article(user_id: int, prod: Dict, weights: Dict[str, float]) -> List[Dict]:
    """
    Convierte un producto del catálogo en múltiples filas facet/key_text/inc para MERGE.
    Espera columnas: department_name, product_group_name, section_name,
                     garment_group_name, perceived_colour_master_name, index_group_name
    """
    out: List[Dict] = []

    # GENDER (inferido)
    g = _infer_gender(prod)
    if g:
        out.append({
            "user_id": user_id,
            "facet": "GENDER",
            "key_text": g,
            "inc": float(weights["GENDER"]),
        })

    mapping = {
        "DEPARTMENT":    prod.get("department_name"),
        "PRODUCT_GROUP": prod.get("product_group_name"),
        "SECTION":       prod.get("section_name"),
        "GARMENT_GROUP": prod.get("garment_group_name"),
        "COLOUR":        prod.get("perceived_colour_master_name"),
    }
    for facet, key in mapping.items():
        if key and facet in weights:
            out.append({
                "user_id": user_id,
                "facet": facet,
                "key_text": key,
                "inc": float(weights[facet]),
            })
    return out

def _fetch_products_by_ids(pool, article_ids: List[str]) -> List[Dict]:
    """
    Trae filas mínimas del catálogo para un conjunto de external_article_id.
    """
    if not article_ids:
        return []
    sql = """
      SELECT external_article_id,
             department_name,
             product_group_name,
             section_name,
             garment_group_name,
             perceived_colour_master_name,
             index_group_name
      FROM catalog
      WHERE external_article_id IN ({})
    """.format(", ".join([f":id{i}" for i in range(len(article_ids))]))
    binds = {f"id{i}": str(eid) for i, eid in enumerate(article_ids)}

    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, binds)
            cols = [d[0].lower() for d in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]

def _merge_rows(pool, rows: List[Dict]) -> int:
    """
    Ejecuta el MERGE en batch.
    """
    if not rows:
        return 0
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.executemany(MERGE_SQL, rows)
        conn.commit()
    return len(rows)

def record_from_article_ids(user_id: int, article_ids: List[str], event: str) -> int:
    """
    Sube pesos a preferencias a partir de una lista de external_article_id.
    event: 'onboarding' | 'purchase'
    """
    pool = current_app.config["DB_POOL"]
    weights = ONBOARDING_WEIGHTS if event == "onboarding" else PURCHASE_WEIGHTS
    prods = _fetch_products_by_ids(pool, article_ids)
    rows: List[Dict] = []
    for p in prods:
        rows.extend(_rows_for_article(user_id, p, weights))
    return _merge_rows(pool, rows)

def record_from_order(user_id: int, order_id: int) -> int:
    """
    Sube pesos usando los artículos de una orden del usuario (verifica pertenencia).
    """
    pool = current_app.config["DB_POOL"]
    sql = """
      SELECT oi.article_id
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE oi.order_id = :oid AND o.user_id = :uid
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"oid": int(order_id), "uid": int(user_id)})
            article_ids = [r[0] for r in cur.fetchall()]
    if not article_ids:
        return 0
    return record_from_article_ids(user_id, article_ids, event="purchase")

def get_user_profile(user_id: int) -> Dict[str, Dict[str, float]]:
    """
    Devuelve el perfil crudo del usuario como { facet: { key_text: weight } }.
    (Usa binds POSICIONALES para evitar ORA-01745.)
    """
    pool = current_app.config["DB_POOL"]
    out: Dict[str, Dict[str, float]] = {}
    sql = """
      SELECT facet, key_text, weight
      FROM user_pref_kv
      WHERE user_id = :1
      ORDER BY facet, weight DESC
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, [int(user_id)])
            for facet, key_text, weight in cur.fetchall():
                facet = str(facet)
                out.setdefault(facet, {})[str(key_text)] = float(weight)
    return out

def reset_user_profile(user_id: int) -> int:
    """
    Borra todas las preferencias del usuario.
    (Usa bind POSICIONAL para evitar ORA-01745.)
    """
    pool = current_app.config["DB_POOL"]
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_pref_kv WHERE user_id = :1", [int(user_id)])
        conn.commit()
    return 1
