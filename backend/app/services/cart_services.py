# app/services/cart_services.py
from typing import Dict, Optional, List
import oracledb
from datetime import date, datetime


# Helper functions 
def _coerce(v):
    """Normalizes data types for JSON serialization"""
    if isinstance(v, oracledb.LOB):
        data = v.read()
        try:
            v.close()
        except:
            pass
        return data
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def _dict(cur, row) -> Dict:
    """Converts a DB row to a dictionary with column names as keys"""
    cols = [d[0] for d in cur.description]
    return {k: _coerce(v) for k, v in zip(cols, row)}


# Core cart logic 

def _get_or_create_open_cart(conn, user_id: int) -> int:
    """Obtains or creates an OPEN cart for the user"""
    with conn.cursor() as cur:
        # Search for existing OPEN cart
        cur.execute("""
            SELECT cart_id
            FROM carts
            WHERE user_id = :1 AND status = 'OPEN'
            FETCH FIRST 1 ROWS ONLY
        """, [user_id])
        r = cur.fetchone()
        if r:
            return int(r[0])

        # If not found, create one
        cur.execute("""
            INSERT INTO carts (user_id, status, total_price)
            VALUES (:1, 'OPEN', 0)
        """, [user_id])

        # Read back the new cart_id
        cur.execute("""
            SELECT cart_id
            FROM carts
            WHERE user_id = :1 AND status = 'OPEN'
            ORDER BY cart_id DESC
            FETCH FIRST 1 ROWS ONLY
        """, [user_id])
        new_id = int(cur.fetchone()[0])
        return new_id

# Recalculate cart total
def _recalc_cart_total(conn, cart_id: int):
    """Recalculates the total price of the cart"""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE carts c
               SET total_price = (
                   SELECT NVL(SUM(ci.quantity * ci.price), 0)
                   FROM cart_items ci
                   WHERE ci.cart_id = c.cart_id
               )
             WHERE c.cart_id = :1
        """, [cart_id])

# Get price and stock of an article
def _get_price_and_stock(conn, article_id: str) -> Optional[Dict]:
    """Obtains price and stock for a given article_id"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT price, stock, prod_name
            FROM catalog
            WHERE external_article_id = :1
        """, [article_id])
        r = cur.fetchone()
        if not r:
            return None
        return {"price": float(r[0]), "stock": int(r[1]), "name": r[2]}


# Service functions

# Get current cart
def get_cart(pool, user_id: int) -> Dict:
    """Obtains the current cart for the user"""
    with pool.acquire() as conn:
        cart_id = _get_or_create_open_cart(conn, user_id)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                  ci.cart_item_id,
                  ci.article_id,
                  ci.quantity,
                  ci.price,
                  (ci.quantity * ci.price) AS line_total,
                  c.prod_name
                FROM cart_items ci
                JOIN catalog c ON c.external_article_id = ci.article_id
                WHERE ci.cart_id = :1
                ORDER BY c.prod_name
            """, [cart_id])
            items = [_dict(cur, r) for r in cur.fetchall()]

            cur.execute("SELECT total_price FROM carts WHERE cart_id = :1", [cart_id])
            total = float(cur.fetchone()[0] or 0)

    return {"cart_id": cart_id, "items": items, "total": total}

# Add item to cart
def add_item(pool, user_id: int, article_id: str, qty: int) -> Dict:
    if qty <= 0:
        return {"error": "quantity debe ser > 0"}

    with pool.acquire() as conn:
        conn.autocommit = False
        try:
            info = _get_price_and_stock(conn, article_id)
            if not info:
                return {"error": "SKU no existe"}
            if qty > info["stock"]:
                return {"error": f"Stock insuficiente (disponible: {info['stock']})"}

            cart_id = _get_or_create_open_cart(conn, user_id)

            with conn.cursor() as cur:
                # Try to update existing item
                cur.execute("""
                    UPDATE cart_items
                       SET quantity = quantity + :qty,
                           price    = :price
                     WHERE cart_id  = :cid
                       AND article_id = :aid
                """, {"qty": qty, "price": info["price"], "cid": cart_id, "aid": article_id})

                # If no rows were updated, insert new item
                if cur.rowcount == 0:
                    cur.execute("""
                        INSERT INTO cart_items (cart_id, article_id, quantity, price)
                        VALUES (:cid, :aid, :qty, :price)
                    """, {"cid": cart_id, "aid": article_id, "qty": qty, "price": info["price"]})
            # Recalculate total
            _recalc_cart_total(conn, cart_id)
            conn.commit()
            return get_cart(pool, user_id)

        except Exception as e:
            try: conn.rollback()
            except: pass
            return {"error": str(e)}


# Update item quantity in cart
def update_item(pool, user_id: int, article_id: str, qty: int) -> Dict:
    """Updates the quantity of an item in the cart"""
    with pool.acquire() as conn:
        conn.autocommit = False
        try:
            cart_id = _get_or_create_open_cart(conn, user_id)
            if qty <= 0:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM cart_items
                        WHERE cart_id = :1 AND article_id = :2
                    """, [cart_id, article_id])
            else:
                info = _get_price_and_stock(conn, article_id)
                if not info:
                    return {"error": "SKU no existe"}
                if qty > info["stock"]:
                    return {"error": f"Stock insuficiente (disponible: {info['stock']})"}

                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE cart_items
                        SET quantity = :1, price = :2
                        WHERE cart_id = :3 AND article_id = :4
                    """, [qty, info["price"], cart_id, article_id])

            _recalc_cart_total(conn, cart_id)
            conn.commit()
            return get_cart(pool, user_id)

        except Exception as e:
            try:
                conn.rollback()
            except:
                pass
            return {"error": str(e)}

# Remove item from cart
def remove_item(pool, user_id: int, article_id: str) -> Dict:
    """Removes an item from the cart"""
    with pool.acquire() as conn:
        conn.autocommit = False
        try:
            cart_id = _get_or_create_open_cart(conn, user_id)
            with conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM cart_items
                    WHERE cart_id = :1 AND article_id = :2
                """, [cart_id, article_id])
            _recalc_cart_total(conn, cart_id)
            conn.commit()
            return get_cart(pool, user_id)
        except Exception as e:
            try:
                conn.rollback()
            except:
                pass
            return {"error": str(e)}

# Clear the cart
def clear_cart(pool, user_id: int) -> Dict:
    """Empties all items from the cart"""
    with pool.acquire() as conn:
        conn.autocommit = False
        try:
            cart_id = _get_or_create_open_cart(conn, user_id)
            with conn.cursor() as cur:
                cur.execute("DELETE FROM cart_items WHERE cart_id = :1", [cart_id])
            _recalc_cart_total(conn, cart_id)
            conn.commit()
            return {"cart_id": cart_id, "items": [], "total": 0}
        except Exception as e:
            try:
                conn.rollback()
            except:
                pass
            return {"error": str(e)}
