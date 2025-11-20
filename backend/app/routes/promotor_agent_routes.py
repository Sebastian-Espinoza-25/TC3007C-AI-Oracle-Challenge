from flask import Blueprint, jsonify, current_app, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.promotor_agent_service import (
    get_promo_for_amount_and_bank,
    get_promo_for_cart,
)

promotor_bp = Blueprint("promotor_agent", __name__, url_prefix="/api/promos")


@promotor_bp.route("/preview", methods=["POST"])
def promotor_preview():
    """
    Endpoint manual para probar el promotor:
    - Recibe { "amount": 1000, "bank_name": "BBVA" }
    - NO requiere JWT (útil para pruebas con Postman).
    """
    data = request.get_json() or {}

    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "amount debe ser numérico"}), 400

    bank_name = str(data.get("bank_name") or "").strip()

    promo_payload = get_promo_for_amount_and_bank(amount, bank_name)

    return jsonify(
        {
            "input": {"amount": amount, "bank_name": bank_name},
            "promotion": promo_payload,
        }
    ), 200


@promotor_bp.route("/cart", methods=["GET"])
@jwt_required()
def promotor_from_cart():
    """
    Endpoint principal:
    - Usa el JWT para obtener user_id
    - Lee el carrito OPEN del usuario en la DB
    - Lee el banco (si existe método de pago)
    - Llama al RAG de promociones
    """
    pool = current_app.config.get("DB_POOL")
    if pool is None:
        return jsonify({"error": "DB_POOL_NOT_CONFIGURED"}), 500

    user_id = get_jwt_identity()

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"error": "INVALID_IDENTITY"}), 401

    payload = get_promo_for_cart(pool, user_id_int)
    return jsonify(payload), 200
