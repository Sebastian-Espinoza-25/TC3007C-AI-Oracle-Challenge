from flask import Blueprint, request, jsonify
from langchain_community.chat_models import ChatOCIGenAI
from langchain_core.messages import HumanMessage

from app.services.ideator_vision_service import describe_image_with_oci
from app.services.ideator_recommender_services import (
    get_recommendations_from_json,
    cluster_model,
)

import json
import os

chat_bp = Blueprint("ideator_agent_chat", __name__)

# ==========================
# Cargar modelos
# ==========================
CHAT_MODEL_ID = os.getenv("OCI_GENAI_MODEL_ID")      # ← modelo de TEXTO
VISION_MODEL_ID = os.getenv("OCI_GENAI_IDEATOR_MODEL_ID")  # ← modelo de IMAGEN

ENDPOINT = os.getenv("OCI_GENAI_ENDPOINT")
COMPARTMENT = os.getenv("OCI_COMPARTMENT_ID")

# Modelo de chat → rápido, optimizado para texto
chat_llm = ChatOCIGenAI(
    model_id=CHAT_MODEL_ID,
    service_endpoint=ENDPOINT,
    compartment_id=COMPARTMENT,
    provider="meta",
    model_kwargs={"temperature": 0.4},
)


@chat_bp.post("/chat")
def ideator_chat():

    text = (request.form.get("text") or "").strip()

    # fallback: historial
    if not text and "messages" in request.form:
        try:
            history = json.loads(request.form["messages"])
            if history:
                text = history[-1].get("text", "").strip()
        except:
            pass

    image_bytes = request.files["image"].read() if "image" in request.files else None

    if not text and not image_bytes:
        return jsonify({"error": "Missing 'text' or 'image'"}), 400

    # ======================================================
    # 1) Imagen → visión + recommendations
    # ======================================================
    if image_bytes:
        vision_json = describe_image_with_oci(image_bytes, text)
        rec_ids = get_recommendations_from_json(vision_json)

        return jsonify({
            "answer": "Entendido. Analicé tu imagen y encontré algunas opciones que podrían gustarte.",
            "recommendations": rec_ids,
            "vision": vision_json
    }), 200


    # ======================================================
    # 2) Texto → clasificar intención (chat vs buscar)
    # ======================================================
    intent_prompt = f"""
Clasifica la intención del usuario.

Mensaje: "{text}"

Responde SOLO:
chat  → si está conversando
buscar → si quiere productos, sugerencias o moda
"""

    intent = chat_llm.invoke([HumanMessage(content=intent_prompt)]).content.strip().lower()

    # ======================================================
    # 3) Intención → recomendar productos
    # ======================================================
    if intent == "buscar":
        df = cluster_model.recommend_from_text(text, k=10)
        ids = df["article_id"].tolist()

        return jsonify({
            "answer": "Aquí tienes algunas opciones que podrían interesarte:",
            "recommendations": ids
        }), 200

    # ======================================================
    # 4) Intención → conversación natural
    # ======================================================
    chat_prompt = f"""
Eres ATELLIER, un asistente amable para e-commerce.

- amable, natural y breve
- no repites lo que dijo el usuario
- tono ligero, fashion-advisor
- si el usuario saluda → saludas
- si agradece → respondes con cortesía
- si pregunta algo fuera de moda o e-commerce. Dices que no puedes hablar de eso

Mensaje del usuario:
{text}

Responde solo la frase final.
"""

    response = chat_llm.invoke([HumanMessage(content=chat_prompt)]).content

    return jsonify({
        "answer": response,
        "recommendations": []
    }), 200
