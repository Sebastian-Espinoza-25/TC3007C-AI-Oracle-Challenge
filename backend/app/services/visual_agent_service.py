from __future__ import annotations
from typing import List, Union
from threading import Lock
import os

# model
from app.services.visual_agent.catalog_cluster_recommender import ClusterRecommender

# Load model path from environment
_MODEL_PATH = os.getenv(
    "VISUAL_MODEL_PATH",
    "app/services/visual_agent/agente_visual_cluster.pkl"  # default for local dev
)

# Model cache in memory
_model: ClusterRecommender | None = None
_model_lock = Lock()


def _get_model() -> ClusterRecommender:
    """
    Loads the model only once (lazy load) and keeps it in memory.
    This way it doesn't read the .pkl on every request.
    """
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = ClusterRecommender.load(_MODEL_PATH)
    return _model


def predict(
    article_ids: List[str],
    k: int = 10,
    mode: str = "avg",
    dentro_cluster: bool = True,
    with_scores: bool = False,
) -> Union[List[str], List[dict]]:
    """
    Given a list of seed article_ids, returns recommended article_ids based on visual similarity.
    """
    model = _get_model()

    recs = model.recommend_cart_ids(
        article_ids,
        k=k,
        mode=mode,
        dentro_cluster=dentro_cluster,
        return_scores=with_scores,
    )
    return recs
