from datetime import datetime
import stripe
from flask import current_app
from app.utils.mail.mail import send_payment_confirmation_from_db


def get_stripe_key():
    """Set the Stripe API key dynamically from Flask config."""
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]


def create_payment_intent(pool, user_id, amount, currency="MXN"):
    """Create a Stripe PaymentIntent and store it as pending in the DB."""
    get_stripe_key()

    intent = stripe.PaymentIntent.create(
        amount=int(amount * 100), 
        currency=currency.lower(),
        metadata={"user_id": user_id}
    )

    with pool.acquire() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO payments (user_id, amount, currency, payment_provider, payment_intent_id, status)
            VALUES (:1, :2, :3, 'STRIPE', :4, 'PENDING')
        """, [user_id, amount, currency, intent["id"]])
        conn.commit()

    return intent["client_secret"]


def confirm_payment(pool, provider_ref, stripe_event):
    """
    Handle Stripe webhook when a payment succeeds.
    Updates the payment status, creates an invoice,
    and triggers the confirmation email.
    """
    with pool.acquire() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE payments
               SET status = 'SUCCEEDED',
                   updated_at = SYSTIMESTAMP
             WHERE payment_intent_id = :1
        """, [provider_ref])

        cursor.execute("""
            INSERT INTO invoices (user_id, amount, currency, status)
            SELECT user_id, amount, currency, 'GENERATED'
              FROM payments WHERE payment_intent_id = :1
        """, [provider_ref])

        conn.commit()

    try:
        send_payment_confirmation_from_db(pool, provider_ref)
    except Exception as e:
        print(f"⚠️ Error sending confirmation email: {e}")


def list_payment_methods(pool, user_id):
    """Retrieve all stored payment methods for the given user."""
    with pool.acquire() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT payment_method_id, brand, type, last4, created_at
              FROM payment_methods
             WHERE user_id = :1
             ORDER BY created_at DESC
        """, [user_id])
        return [
            dict(zip([col[0].lower() for col in cursor.description], row))
            for row in cursor.fetchall()
        ]


def add_payment_method(pool, user_id, brand, type, last4):
    """Insert a new payment method for the given user."""
    with pool.acquire() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO payment_methods (user_id, brand, type, last4)
            VALUES (:1, :2, :3, :4)
        """, [user_id, brand, type, last4])
        conn.commit()


def get_invoices(pool, user_id):
    """Retrieve all invoices for a specific user."""
    with pool.acquire() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT invoice_id, amount, currency, created_at, status, description
              FROM invoices
             WHERE user_id = :1
             ORDER BY created_at DESC
        """, [user_id])
        return [
            dict(zip([col[0].lower() for col in cursor.description], row))
            for row in cursor.fetchall()
        ]