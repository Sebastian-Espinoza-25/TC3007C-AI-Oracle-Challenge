from flask import Blueprint, request, jsonify, current_app
import stripe
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.payments_services import (
    create_payment_intent,
    confirm_payment,
    list_payment_methods,
    add_payment_method,
    get_invoices,
)
from app.utils.mail.mail import send_payment_confirmation_from_db
from app.utils.mail.mail import send_email
import os

payments_bp = Blueprint("payments_bp", __name__)


# Create a Payment Intent
@payments_bp.post("/intent")
@jwt_required()
def create_intent():
    user_id = get_jwt_identity()
    pool = current_app.config["DB_POOL"]

    try:
        # amount from frontend is ignored; DB cart total is used.
        client_secret = create_payment_intent(pool, user_id)
        return jsonify({"client_secret": client_secret}), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    except Exception:
        current_app.logger.exception("Error creating payment intent")
        return jsonify({"error": "Internal server error"}), 500


# Stripe Webhook
@payments_bp.post("/webhook")
def webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            current_app.config["STRIPE_WEBHOOK_SECRET"],
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # IGNORAR TODO excepto payment_intent.succeeded
    event_type = event["type"]
    if event_type != "payment_intent.succeeded":
        return jsonify({"ignored": True}), 200

    # SOLO AQUÍ procesamos el pago porque ya existe en DB
    pool = current_app.config["DB_POOL"]
    intent_id = event["data"]["object"]["id"]
    confirm_payment(pool, intent_id, event)

    return jsonify({"received": True}), 200


# Get saved payment methods
@payments_bp.get("/methods")
@jwt_required()
def get_methods():
    user_id = get_jwt_identity()
    pool = current_app.config["DB_POOL"]
    methods = list_payment_methods(pool, user_id)
    return jsonify(methods), 200


# Add a new payment method
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


# Get user invoices
@payments_bp.get("/invoices")
@jwt_required()
def invoices():
    user_id = get_jwt_identity()
    pool = current_app.config["DB_POOL"]
    invoices = get_invoices(pool, user_id)
    return jsonify(invoices), 200


# Send confirmation email (triggered manually by client after payment)
@payments_bp.post("/send_confirmation")
@jwt_required()
def send_confirmation():
    user_id = get_jwt_identity()
    data = request.json or {}
    intent_id = data.get("intent_id") or data.get("provider_ref")
    if not intent_id:
        return jsonify({"error": "Missing intent_id"}), 400

    pool = current_app.config["DB_POOL"]
    try:
        # First, check DB to see if payment already marked as SUCCEEDED
        with pool.acquire() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT status
                  FROM paymentss
                 WHERE payment_intent_id = :1
                """,
                [intent_id],
            )
            row = cursor.fetchone()

        if row and row[0] == "SUCCEEDED":
            # Payment already processed in DB — just send the email
            send_payment_confirmation_from_db(pool, intent_id)
            return jsonify({"sent": True, "note": "sent_via_db"}), 200

        # Otherwise, check Stripe to ensure the PaymentIntent actually succeeded
        try:
            stripe.api_key = current_app.config.get("STRIPE_SECRET_KEY")
            pi = stripe.PaymentIntent.retrieve(intent_id)
        except Exception as e:
            current_app.logger.exception("Error retrieving PaymentIntent from Stripe")
            return jsonify({"error": "Failed to retrieve PaymentIntent"}), 500

        if pi and pi.status == "succeeded":
            # Process the payment server-side (same logic as webhook)
            try:
                confirm_payment(pool, intent_id, pi)
                return jsonify({"sent": True, "note": "processed_and_sent"}), 200
            except Exception:
                current_app.logger.exception("Error processing payment via confirm_payment")
                return jsonify({"error": "Failed to process payment"}), 500
        else:
            return jsonify({"error": "PaymentIntent not succeeded on Stripe"}), 400
    except Exception:
        current_app.logger.exception("Error sending confirmation email")
        return jsonify({"error": "Failed to send confirmation email"}), 500


# Quick confirmation: send an email immediately using provided payload
# This bypasses DB verification and Stripe lookup and is intended for
# best-effort immediate receipts when the client already has the user
# email and wants a fast confirmation. The SMTP configuration must be
# present in the environment for this to work.
@payments_bp.post("/send_quick_confirmation")
@jwt_required()
def send_quick_confirmation():
        user_id = get_jwt_identity()
        data = request.json or {}

        recipient = data.get("email")
        amount = data.get("amount")
        currency = data.get("currency") or "USD"
        provider_ref = data.get("provider_ref") or data.get("intent_id")
        name = data.get("name") or ""

        if not recipient:
                return jsonify({"error": "Missing email"}), 400

        # Basic payload validation
        try:
                amount_val = float(amount) if amount is not None else None
        except Exception:
                amount_val = None

        # Compose a simple HTML receipt similar to DB-based version
        html = f"""
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;
                                padding: 1.5rem; background-color: #f9f9f9; border-radius: 10px;">
            <h2 style="color: #2d3748;">Confirmación de Pago</h2>
            <p style="font-size: 16px; color: #4a5568;">Hola {name},</p>

            <p style="font-size: 16px; color: #4a5568;">
                Recibimos tu pago exitosamente. Gracias por tu compra.
            </p>

            <p style="font-size: 16px; color: #4a5568;">
                {f"<strong>Monto:</strong> {currency} ${amount_val:.2f}<br/>" if amount_val is not None else ""}
                {f"<strong>Referencia:</strong> {provider_ref}" if provider_ref else ""}
            </p>

            <p style="font-size: 16px; color: #4a5568;">
                Tu transacción aparecerá en tu factura en breve.
            </p>

            <div style="margin-top: 2rem;">
                <p style="font-size: 14px; color: #a0aec0;">— El equipo de Allure</p>
            </div>
        </div>
        """

        try:
                # Attempt to send using the shared helper; it will raise on failure
                send_email(recipient, "✅ Confirmación de Pago", html)
                return jsonify({"sent": True, "note": "sent_quick"}), 200
        except Exception:
                current_app.logger.exception("Error sending quick confirmation email")
                return jsonify({"error": "Failed to send email"}), 500