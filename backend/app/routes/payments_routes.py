from flask import Blueprint, request, jsonify, current_app
import stripe
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.payments_services import (
    create_payment_intent,
    confirm_payment,
    list_payment_methods,
    add_payment_method,
    get_invoices
)

payments_bp = Blueprint("payment_bp", __name__, url_prefix="/payment")

# Crear un Payment Intent
@payments_bp.post("/intent")
@jwt_required()
def create_intent():
    data = request.json
    user_id = get_jwt_identity()
    pool = current_app.config["DB_POOL"]

    # Validar campo obligatorio
    if "amount" not in data:
        return jsonify({"error": "Missing amount field"}), 400

    client_secret = create_payment_intent(pool, user_id, data["amount"])
    return jsonify({"client_secret": client_secret}), 201


# Webhook de Stripe
@payments_bp.post("/webhook")
def webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, current_app.config["STRIPE_WEBHOOK_SECRET"]
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # Confirmar pago exitoso
    if event["type"] == "payment_intent.succeeded":
        pool = current_app.config["DB_POOL"]
        confirm_payment(pool, event["data"]["object"]["id"], event)

    return jsonify({"received": True}), 200


# Obtener métodos de pago guardados
@payments_bp.get("/methods")
@jwt_required()
def get_methods():
    user_id = get_jwt_identity()
    pool = current_app.config["DB_POOL"]
    methods = list_payment_methods(pool, user_id)
    return jsonify(methods), 200


# Agregar un nuevo método de pago
@payments_bp.post("/methods")
@jwt_required()
def add_method():
    user_id = get_jwt_identity()
    data = request.json
    pool = current_app.config["DB_POOL"]

    required_fields = ["brand", "type", "last4"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    add_payment_method(pool, user_id, data["brand"], data["type"], data["last4"])
    return jsonify({"message": "Payment method added successfully."}), 201


# Obtener facturas del usuario
@payments_bp.get("/invoices")
@jwt_required()
def invoices():
    user_id = get_jwt_identity()
    pool = current_app.config["DB_POOL"]
    invoices = get_invoices(pool, user_id)
    return jsonify(invoices), 200