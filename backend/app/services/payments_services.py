from datetime import datetime
import stripe
import logging
from flask import current_app
from app.utils.mail.mail import send_payment_confirmation_from_db

# Logger setup
logger = logging.getLogger("stripe_payments")

# Database table names
TABLE_PAYMENTS = "paymentss"
TABLE_INVOICES = "invoicess"
TABLE_METHODS = "payment_methodss"


def get_stripe_key():
    """Set the Stripe API key dynamically from Flask config."""
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]


def create_payment_intent(pool, user_id, amount=None, currency="MXN"):
    """
    Create a Stripe PaymentIntent using the user's OPEN cart total.
    - Ignores amount from frontend.
    - Creates an ORDER + ORDER_ITEMS from the current cart.
    - Stores a PENDING payment linked to that order.
    """
    get_stripe_key()

    with pool.acquire() as conn:
        cursor = conn.cursor()

        # 1) Get user's OPEN cart
        cursor.execute(
            """
            SELECT cart_id, total_price
              FROM carts
             WHERE user_id = :1
               AND status = 'OPEN'
             ORDER BY created_at DESC
             FETCH FIRST 1 ROW ONLY
            """,
            [user_id],
        )
        cart_row = cursor.fetchone()

        if not cart_row:
            raise ValueError("User has no OPEN cart to pay.")

        cart_id, cart_total = cart_row

        # 2) Get cart items
        cursor.execute(
            """
            SELECT article_id, quantity, price
              FROM cart_items
             WHERE cart_id = :1
            """,
            [cart_id],
        )
        cart_items = cursor.fetchall()
        if not cart_items:
            raise ValueError("Cart has no items.")

        # 3) Recalculate total from cart_items (sanity check)
        calculated_total = sum(q * p for _, q, p in cart_items)
        if abs(calculated_total - cart_total) > 0.01:
            logger.warning(
                f"[SANITY CHECK MISMATCH @intent] cart_total={cart_total} "
                f"vs items_total={calculated_total}"
            )
            # Usamos calculated_total para el intent y la orden
            cart_total = calculated_total

        # 4) Get shipping address
        cursor.execute(
            """
            SELECT address
              FROM app_user
             WHERE user_id = :1
            """,
            [user_id],
        )
        addr_row = cursor.fetchone()
        order_address = addr_row[0] if addr_row and addr_row[0] else "N/A"

        # 5) Create ORDER (aún sin pago confirmado)
        order_id_var = cursor.var(int)
        cursor.execute(
            """
            INSERT INTO orders (
                user_id,
                order_address,
                payment_date,
                total_price
            )
            VALUES (:1, :2, NULL, :3)
            RETURNING order_id INTO :4
            """,
            [user_id, order_address, cart_total, order_id_var],
        )
        order_id = int(order_id_var.getvalue()[0])

        # 6) Create ORDER_ITEMS from cart_items
        for article_id, quantity, price in cart_items:
            cursor.execute(
                """
                INSERT INTO order_items (
                    order_id,
                    article_id,
                    quantity,
                    price
                )
                VALUES (:1, :2, :3, :4)
                """,
                [order_id, article_id, quantity, price],
            )

        # Commit so order + order_items exist BEFORE hitting Stripe
        conn.commit()

    # 7) Create PaymentIntent in Stripe
    intent = stripe.PaymentIntent.create(
        amount=int(cart_total * 100),
        currency=currency.lower(),
        metadata={
            "user_id": str(user_id),
            "cart_id": str(cart_id),
            "order_id": str(order_id),
        },
        payment_method_types=["card"],
        expand=["payment_method"],
    )

    # 8) Extract payment method info (if already attached)
    pm_info = None
    if intent.get("payment_method") and intent["payment_method"]["type"] == "card":
        card = intent["payment_method"]["card"]
        pm_info = {
            "brand": card["brand"],
            "type": "card",
            "last4": card["last4"],
        }

        # Save to DB (card info)
        add_payment_method(
            pool,
            user_id,
            card["brand"],
            "card",
            card["last4"],
        )

    # 9) Store the payment as PENDING in DB, linked to order_id
    with pool.acquire() as conn:
        cursor = conn.cursor()
        print("DEBUG intent id:", intent["id"], type(intent["id"]))
        cursor.execute(
            f"""
            INSERT INTO {TABLE_PAYMENTS} (
                user_id,
                amount,
                currency,
                payment_provider,
                payment_intent_id,
                status,
                order_id
            )
            VALUES (:1, :2, :3, 'STRIPE', :4, 'PENDING', :5)
            """,
            [user_id, cart_total, currency, str(intent["id"]), order_id],
        )
        conn.commit()

    return {
        "client_secret": intent["client_secret"],
        "payment_method": pm_info,
        "order_id": order_id,  # por si lo quieres en el front
    }


# List payment methods for a user
def list_payment_methods(pool, user_id):
    with pool.acquire() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT brand, type, last4
              FROM {TABLE_METHODS}
             WHERE user_id = :1
            """,
            [user_id],
        )
        rows = cursor.fetchall()

        return [
            {"brand": r[0], "type": r[1], "last4": r[2]}
            for r in rows
        ]


# Add a new payment method for a user
def add_payment_method(pool, user_id, brand, type, last4):
    with pool.acquire() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            INSERT INTO {TABLE_METHODS} (user_id, brand, type, last4)
            VALUES (:1, :2, :3, :4)
            """,
            [user_id, brand, type, last4],
        )
        conn.commit()


# Get invoices for a user
def get_invoices(pool, user_id):
    with pool.acquire() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"""
            SELECT invoice_id, amount, currency, status, description, created_at
              FROM {TABLE_INVOICES}
             WHERE user_id = :1
             ORDER BY created_at DESC
            """,
            [user_id],
        )
        rows = cursor.fetchall()

        return [
            {
                "invoice_id": r[0],
                "amount": r[1],
                "currency": r[2],
                "status": r[3],
                "description": r[4],
                "created_at": r[5],
            }
            for r in rows
        ]


def confirm_payment(pool, provider_ref, stripe_event):
    """
    Handle Stripe webhook when a payment succeeds.
    - Uses existing ORDER created at intent time.
    - Deducts stock, creates INVOICE, closes carts, updates PAYMENT.
    """

    provider_ref = str(provider_ref)

    with pool.acquire() as conn:
        cursor = conn.cursor()

        try:
            # 1) Get payment row and lock it
            cursor.execute(
                f"""
                SELECT payment_id,
                       user_id,
                       amount,
                       currency,
                       order_id
                  FROM {TABLE_PAYMENTS}
                 WHERE payment_intent_id = :1
                   AND payment_provider = 'STRIPE'
                 FOR UPDATE
                """,
                [provider_ref],
            )

            pay_row = cursor.fetchone()
            if not pay_row:
                raise ValueError("Payment not found for this intent_id.")

            payment_id, user_id, pay_amount, pay_currency, order_id = pay_row

            if order_id is None:
                raise ValueError("Payment has no linked order_id.")

            # 2) Get order_items for the order
            cursor.execute(
                """
                SELECT article_id, quantity, price
                  FROM order_items
                 WHERE order_id = :1
                 FOR UPDATE
                """,
                [order_id],
            )
            order_items = cursor.fetchall()
            if not order_items:
                raise ValueError("Order has no items.")

            # 3) Recalculate total from order_items
            calculated_total = sum(q * p for _, q, p in order_items)

            if abs(calculated_total - pay_amount) > 0.01:
                logger.warning(
                    f"[SANITY CHECK MISMATCH @webhook] payment.amount={pay_amount} "
                    f"vs order_items_total={calculated_total}"
                )

            # 4) Check and lock stock from catalog
            for article_id, quantity, _ in order_items:
                cursor.execute(
                    """
                    SELECT stock
                      FROM catalog
                     WHERE external_article_id = :1
                     FOR UPDATE
                    """,
                    [article_id],
                )
                stock_row = cursor.fetchone()
                if not stock_row:
                    raise ValueError(f"Article {article_id} not found.")

                if stock_row[0] < quantity:
                    raise ValueError(
                        f"Not enough stock for article {article_id}. "
                        f"Requested {quantity}, available {stock_row[0]}."
                    )

            # 5) Deduct stock
            for article_id, quantity, _ in order_items:
                cursor.execute(
                    """
                    UPDATE catalog
                       SET stock = stock - :2
                     WHERE external_article_id = :1
                    """,
                    [article_id, quantity],
                )

            # 6) Update ORDER payment_date
            cursor.execute(
                """
                UPDATE orders
                   SET payment_date = SYSTIMESTAMP
                 WHERE order_id = :1
                """,
                [order_id],
            )

            # 7) Create INVOICE for this paid order
            invoice_id_var = cursor.var(int)
            cursor.execute(
                f"""
                INSERT INTO {TABLE_INVOICES} (
                    user_id,
                    order_id,
                    amount,
                    currency,
                    status,
                    description
                )
                VALUES (:1, :2, :3, :4, 'PAID', :5)
                RETURNING invoice_id INTO :6
                """,
                [
                    user_id,
                    order_id,
                    calculated_total,
                    pay_currency,
                    f"Stripe payment for order {order_id}",
                    invoice_id_var,
                ],
            )
            invoice_id = int(invoice_id_var.getvalue()[0])

            # 8) Update PAYMENT row
            cursor.execute(
                f"""
                UPDATE {TABLE_PAYMENTS}
                   SET status     = 'SUCCEEDED',
                       updated_at = SYSTIMESTAMP,
                       invoice_id = :2
                 WHERE payment_id = :1
                """,
                [payment_id, invoice_id],
            )

            # 9) Close all OPEN carts for this user
            cursor.execute(
                """
                UPDATE carts
                   SET status = 'CLOSED'
                 WHERE user_id = :1
                   AND status = 'OPEN'
                """,
                [user_id],
            )

            # 10) Commit all DB changes
            conn.commit()

        except Exception:
            conn.rollback()
            raise

    # 11) Send email (outside DB transaction)
    try:
        send_payment_confirmation_from_db(pool, provider_ref)
    except Exception as e:
        logger.error(f"Error sending confirmation email: {e}")