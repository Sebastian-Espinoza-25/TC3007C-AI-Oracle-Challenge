from __future__ import annotations
from typing import List, Union
from threading import Lock

# model
from app.services.visual_agent.catalog_cluster_recommender import ClusterRecommender

# route for .pkl
_MODEL_PATH = "app/services/visual_agent/agente_visual_cluster.pkl"

# model cache in memory
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
            if _model is None:  # doble check
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
    :param article_ids: Seed IDs (the ones you have in the cart)
    :param k: how many to return
    """
    model = _get_model()

    # tu modelo ya trae este método:
    # rec.recommend_cart_ids([...], k=10, mode="max", dentro_cluster=True, return_scores=False)
    recs = model.recommend_cart_ids(
        article_ids,
        k=k,
        mode=mode,
        dentro_cluster=dentro_cluster,
        return_scores=with_scores,
    )
    return recs


