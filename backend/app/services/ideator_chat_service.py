# app/services/ideator_agent/ideator_chat_service.py

from app.services.ideator_vision_service import describe_image_with_oci
from app.services.ideator_recommender_services import get_recommendations_from_json
from langchain_community.chat_models import ChatOCIGenAI
from langchain_core.messages import HumanMessage, AIMessage

import uuid
import os
import oci

OCI_COMPARTMENT_ID = os.getenv("OCI_COMPARTMENT_ID")
OCI_GENAI_IDEATOR_MODEL_ID = os.getenv("OCI_GENAI_IDEATOR_MODEL_ID")
OCI_GENAI_ENDPOINT = os.getenv(
    "OCI_GENAI_ENDPOINT",
    "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com"
)

if not OCI_COMPARTMENT_ID:
    raise RuntimeError("Missing environment variable: OCI_COMPARTMENT_ID")

if not OCI_GENAI_IDEATOR_MODEL_ID:
    raise RuntimeError("Missing environment variable: OCI_GENAI_IDEATOR_MODEL_ID")

OCI_CONFIG_FILE = os.getenv("OCI_CONFIG_FILE", "/backend/.oci/config")
OCI_PROFILE = os.getenv("OCI_PROFILE", "DEFAULT")

config = oci.config.from_file(OCI_CONFIG_FILE, OCI_PROFILE)


# Memoria en RAM — puedes cambiar luego a Redis
CHAT_SESSIONS = {}


def get_session(session_id: str):
    if session_id not in CHAT_SESSIONS:
        CHAT_SESSIONS[session_id] = []
    return CHAT_SESSIONS[session_id]


# LLM para conversación
llm_chat = ChatOCIGenAI(
    model_id=OCI_GENAI_IDEATOR_MODEL_ID, 
    service_endpoint=OCI_GENAI_ENDPOINT,
    compartment_id=OCI_COMPARTMENT_ID,
    provider="meta",
    model_kwargs={
        "temperature": 0.2,
        "max_tokens": 250,
    }
)


def process_chat_message(text: str, image_bytes: bytes | None, session_id: str):
    session = get_session(session_id)

    # === Si hay imagen ===
    if image_bytes:
        vision_json = describe_image_with_oci(image_bytes, text)
        recs = get_recommendations_from_json(vision_json, k=10)

        response_text = (
            "Entendido. Analicé tu imagen.\n\n"
            f"**Descripción:** {vision_json['description']}\n\n"
            f"Aquí tienes recomendaciones similares:\n{recs}"
        )

        session.append({"role": "user", "text": text, "image": True})
        session.append({"role": "assistant", "text": response_text})

        return response_text

    # Conversación normal
    messages = []

    for m in session:
        if m["role"] == "user":
            messages.append(HumanMessage(content=m["text"]))
        else:
            messages.append(AIMessage(content=m["text"]))

    messages.append(HumanMessage(content=text))

    resp = llm_chat.invoke(messages)
    assistant_text = resp.content

    session.append({"role": "user", "text": text})
    session.append({"role": "assistant", "text": assistant_text})

    return assistant_text
