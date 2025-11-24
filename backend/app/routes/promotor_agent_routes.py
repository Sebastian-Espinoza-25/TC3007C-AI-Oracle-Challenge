from flask import Blueprint, jsonify, current_app, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.promotor_agent_service import (
    get_promo_for_amount_and_bank,
    get_promo_for_cart,
    apply_promo_to_cart,  
)

promotor_bp = Blueprint("promotor_agent", __name__, url_prefix="/api/promos")


@promotor_bp.route("/preview", methods=["POST"])
def promotor_preview():
    """
    Endpoint manual para probar el promotor:
    - Recibe { "amount": 1000, "bank_name": "BBVA" }
    - NO requiere JWT (útil para pruebas).
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
    - Devuelve:
        * current_promo (con benefit, meets_minimum, etc.)
        * next_promo
        * cart_id, cart_amount, bank_name, promo_applied
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


@promotor_bp.route("/cart/apply", methods=["POST"])
@jwt_required()
def apply_promo_from_cart():
    """
    Endpoint para APLICAR la promoción al carrito:
    - Usa el JWT para obtener user_id
    - Reutiliza get_promo_for_cart(...) para contexto
    - Llama apply_promo_to_cart(...) para:
        * validar que hay promo aplicable
        * evitar re-aplicar si promo_applied = 'Y'
        * calcular descuento y total final
        * actualizar carts.total_price y promo_applied = 'Y'
    
    """
    pool = current_app.config.get("DB_POOL")
    if pool is None:
        return jsonify({"error": "DB_POOL_NOT_CONFIGURED"}), 500

    user_id = get_jwt_identity()

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"error": "INVALID_IDENTITY"}), 401

    result = apply_promo_to_cart(pool, user_id_int)

    if "error" in result:
        code = result.get("error")

        # Mapeo simple de errores a HTTP status
        if code in ("NO_CART", "EMPTY_CART", "NO_APPLICABLE_PROMO", "PROMO_ALREADY_APPLIED", "UNKNOWN_PROMO_TYPE"):
            status = 400
        elif code == "DB_ERROR":
            status = 500
        else:
            status = 400

        return jsonify(result), status

    # Éxito: devolvemos el "ticket" de la promo aplicada
    return jsonify(result), 200
