from datetime import datetime
import stripe
import logging
from flask import current_app
from app.utils.mail.mail import send_payment_confirmation_from_db

# Logger setup
logger = logging.getLogger("stripe_payments")


def get_stripe_key():
    """Set the Stripe API key dynamically from Flask config."""
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]


def create_payment_intent(pool, user_id, amount=None, currency="MXN"):
    """
    Create a Stripe PaymentIntent using the user's OPEN cart total.
    - We ignore the 'amount' sent by frontend and trust DB (cart.total_price).
    """
    get_stripe_key()

    # 1) Get user's OPEN cart and its total from DB
    with pool.acquire() as conn:
        cursor = conn.cursor()
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

    # 2) Create PaymentIntent in Stripe based on cart_total
    intent = stripe.PaymentIntent.create(
        amount=int(cart_total * 100),
        currency=currency.lower(),
        metadata={"user_id": user_id, "cart_id": cart_id},
    )

    # 3) Store the payment as PENDING in DB
    with pool.acquire() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO payments (
                user_id,
                amount,
                currency,
                payment_provider,
                payment_intent_id,
                status
            )
            VALUES (:1, :2, :3, 'STRIPE', :4, 'PENDING')
            """,
            [user_id, cart_total, currency, intent["id"]],
        )
        conn.commit()

    return intent["client_secret"]


def confirm_payment(pool, provider_ref, stripe_event):
    """
    Handle Stripe webhook when a payment succeeds.

    Flow:
    1) Lock payment row and get user/amount.
    2) Find user's OPEN cart (lock it).
    3) Fetch all cart_items (lock rows).
    4) Check stock in catalog for each article (lock).
    5) Deduct stock.
    6) Create order.
    7) Create order_items from cart_items.
    8) Create invoice with status 'PAID'.
    9) Update payment with SUCCEEDED, order_id, invoice_id.
    10) Close the cart.
    11) Commit transaction.
    12) Send confirmation email.
    """
    with pool.acquire() as conn:
        cursor = conn.cursor()

        try:
            # 1) Get and lock the payment row
            cursor.execute(
                """
                SELECT payment_id, user_id, amount, currency
                  FROM payments
                 WHERE payment_intent_id = :1
                 FOR UPDATE
                """,
                [provider_ref],
            )
            pay_row = cursor.fetchone()
            if not pay_row:
                raise ValueError("Payment not found for this intent_id.")

            payment_id, user_id, pay_amount, pay_currency = pay_row

            # 2) Get and lock user's OPEN cart
            cursor.execute(
                """
                SELECT cart_id, total_price
                  FROM carts
                 WHERE user_id = :1
                   AND status = 'OPEN'
                 ORDER BY created_at DESC
                 FETCH FIRST 1 ROW ONLY
                 FOR UPDATE
                """,
                [user_id],
            )
            cart_row = cursor.fetchone()
            if not cart_row:
                raise ValueError("No OPEN cart found for user when confirming payment.")

            cart_id, cart_total = cart_row

            # 3) Get and lock cart_items
            cursor.execute(
                """
                SELECT article_id, quantity, price
                  FROM cart_items
                 WHERE cart_id = :1
                 FOR UPDATE
                """,
                [cart_id],
            )
            cart_items = cursor.fetchall()
            if not cart_items:
                raise ValueError("Cart has no items.")

            # 4) Recalculate total from cart_items
            calculated_total = 0
            for article_id, quantity, price in cart_items:
                calculated_total += quantity * price

            # Sanity check
            if abs(calculated_total - cart_total) > 0.01:
                logger.warning(
                    f"[SANITY CHECK MISMATCH] cart_total={cart_total} "
                    f"vs items_total={calculated_total} (cart_id={cart_id}, user={user_id})"
                )

            # 5) Check stock for each article and lock catalog rows
            for article_id, quantity, price in cart_items:
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
                    raise ValueError(f"Article {article_id} not found in catalog.")

                (current_stock,) = stock_row
                if current_stock < quantity:
                    raise ValueError(
                        f"Not enough stock for article {article_id}. "
                        f"Requested {quantity}, available {current_stock}."
                    )

            # 6) Deduct stock
            for article_id, quantity, price in cart_items:
                cursor.execute(
                    """
                    UPDATE catalog
                       SET stock = stock - :2
                     WHERE external_article_id = :1
                    """,
                    [article_id, quantity],
                )

            # 7) Get shipping address
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

            # 8) Create order
            order_id_var = cursor.var(int)
            cursor.execute(
                """
                INSERT INTO orders (
                    user_id,
                    order_address,
                    payment_date,
                    total_price
                )
                VALUES (
                    :1,
                    :2,
                    SYSTIMESTAMP,
                    :3
                )
                RETURNING order_id INTO :4
                """,
                [user_id, order_address, calculated_total, order_id_var],
            )
            order_id = int(order_id_var.getvalue()[0])

            # 9) Create order_items
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

            # 10) Create invoice (PAID)
            invoice_id_var = cursor.var(int)
            cursor.execute(
                """
                INSERT INTO invoices (
                    user_id,
                    order_id,
                    amount,
                    currency,
                    status,
                    description
                )
                VALUES (
                    :1,
                    :2,
                    :3,
                    :4,
                    'PAID',
                    :5
                )
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

            # 11) Update payment
            cursor.execute(
                """
                UPDATE payments
                   SET status     = 'SUCCEEDED',
                       updated_at = SYSTIMESTAMP,
                       order_id   = :2,
                       invoice_id = :3
                 WHERE payment_intent_id = :1
                """,
                [provider_ref, order_id, invoice_id],
            )

            # 12) Close cart
            cursor.execute(
                """
                UPDATE carts
                   SET status = 'CLOSED'
                 WHERE cart_id = :1
                """,
                [cart_id],
            )

            # 13) Commit transaction
            conn.commit()

        except Exception:
            conn.rollback()
            raise

    # 14) Send email outside DB transaction
    try:
        send_payment_confirmation_from_db(pool, provider_ref)
    except Exception as e:
        logger.error(f"Error sending confirmation email: {e}")