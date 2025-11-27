# app/services/ideator_agent/ideator_recommender_service.py

import warnings
from sklearn.exceptions import InconsistentVersionWarning
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

from app.services.ideator_agent.catalog_cluster_recommender import ClusterRecommender

MODEL_PATH = "app/services/ideator_agent/agente_ideador_cluster_with_weights.pkl"

# Modelo cargado una sola vez
try:
    cluster_model = ClusterRecommender.load(MODEL_PATH)
except Exception as e:
    raise RuntimeError(
        f"Error loading cluster model from {MODEL_PATH}: {e}"
    )


def get_recommendations_from_json(payload: dict, k: int = 10):
    """
    Recibe el JSON del Vision Agent y regresa IDs recomendados.
    """

    recommended_ids = cluster_model.recommend_from_payload_ids(
        payload=payload,
        k=k,
        dentro_cluster=True,
        mode="max"
    )

    return recommended_ids
