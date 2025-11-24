from __future__ import annotations

import json
from typing import Dict, Any, Optional
from threading import Lock

from app.services.promotor_agent.promos_rag import PromoRAG
from app.services.cart_services import get_cart  # Reusamos servicio de carrito

# cache de RAG en memoria
_rag: Optional[PromoRAG] = None
_rag_lock = Lock()


def _get_rag() -> PromoRAG:
    """
    Carga el PromoRAG solo una vez y lo deja en memoria.
    """
    global _rag
    if _rag is None:
        with _rag_lock:
            if _rag is None:
                rag = PromoRAG()

                from app.services.db.connection import get_oracle_conn

                conn = get_oracle_conn()
                try:
                    rag.initialize(rebuild_index=False, conn=conn)
                finally:
                    try:
                        conn.close()
                    except Exception:
                        pass
                _rag = rag
    return _rag


def get_promo_for_amount_and_bank(amount: float, bank_name: str) -> Dict[str, Any]:
    """
    Llama al RAG directamente para un monto y banco específicos.
    """
    rag = _get_rag()
    raw = rag.promotor(amount, bank_name or "")
    return json.loads(raw)


def _fetch_user_bank(pool, user_id: int) -> str:
    """
    Obtiene el banco del método de pago del usuario.
    Usa la tabla PAYMENT_METHODS y toma el método más reciente.
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT bank
                FROM payment_methodss
                WHERE user_id = :1
                ORDER BY created_at DESC
                FETCH FIRST 1 ROWS ONLY
                """,
                [user_id],
            )
            row = cur.fetchone()
            if row and row[0]:
                return str(row[0])
    # Si no hay banco, devolver cadena vacía
    return ""


def _fetch_cart_promo_flag(pool, cart_id: int) -> str:
    """
    Lee la bandera promo_applied del carrito.
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT promo_applied FROM carts WHERE cart_id = :1",
                [cart_id],
            )
            row = cur.fetchone()
            if row and row[0]:
                return str(row[0])
    return "N"


def get_promo_for_cart(pool, user_id: int) -> Dict[str, Any]:
    """
    Orquesta todo:
      - reutiliza get_cart(...) para obtener cart_id y total
      - consulta el banco del método de pago
      - llama al RAG de promociones
    """
    cart_data = get_cart(pool, user_id)

    if "error" in cart_data:
        return cart_data

    cart_id = cart_data.get("cart_id")
    amount = float(cart_data.get("total", 0) or 0.0)

    if cart_id is None:
        return {
            "error": "NO_CART",
            "message": "No se encontró un carrito activo para este usuario.",
        }

    if amount <= 0:
        return {
            "error": "EMPTY_CART",
            "message": "El carrito está vacío, agrega productos para ver promociones.",
        }

    # Banco del usuario (puede venir vacío si aún no registra método de pago)
    bank_name = _fetch_user_bank(pool, user_id)

    # Llamar al RAG
    promo_payload = get_promo_for_amount_and_bank(amount, bank_name)

    # Leer si ya hay promo aplicada en BD
    promo_flag = _fetch_cart_promo_flag(pool, cart_id)
    promo_applied = promo_flag == "Y"

    # Enriquecer la respuesta con contexto del carrito
    promo_payload.update(
        {
            "cart_id": cart_id,
            "cart_amount": amount,
            "bank_name": bank_name or "",
            "promo_applied": promo_applied,
        }
    )

    return promo_payload


def apply_promo_to_cart(pool, user_id: int) -> Dict[str, Any]:
    """
    Aplica la promoción actual al carrito del usuario.

    Protección:
      - Si promo_applied = 'Y' en BD, NO deja volver a aplicar la promo.

    Flujo:
    - Reusa get_promo_for_cart(...) para obtener:
        * cart_id
        * cart_amount
        * bank_name
        * current_promo (con benefit, meets_minimum, etc.)
        * promo_applied
    - Valida que:
        * haya una promo aplicable
        * promo_applied sea False
    - Calcula descuento y total final.
    - Actualiza carts.total_price + promo_applied = 'Y' en la BD.
    - Devuelve un "ticket" con:
        * monto original
        * descuento aplicado
        * monto final
        * promo aplicada
    """
    if pool is None:
        return {
            "error": "DB_POOL_NOT_CONFIGURED",
            "message": "No hay pool de conexiones configurado.",
        }

    promo_context = get_promo_for_cart(pool, user_id)

    # Errores del flujo previo (sin carrito, carrito vacío, etc.)
    if "error" in promo_context:
        return promo_context

    cart_id = promo_context.get("cart_id")
    amount = float(promo_context.get("cart_amount", 0) or 0.0)
    bank_name = promo_context.get("bank_name") or ""
    promo_applied = bool(promo_context.get("promo_applied"))

    if promo_applied:
        return {
            "error": "PROMO_ALREADY_APPLIED",
            "message": "Ya se aplicó una promoción a este carrito. Agrega o modifica productos para recalcular nuevas promociones.",
        }

    current = promo_context.get("current_promo") or {}
    benefit = current.get("benefit")
    meets_minimum = bool(current.get("meets_minimum"))

    if not benefit or not meets_minimum:
        # No hay promo aplicable o no se cumple el mínimo
        return {
            "error": "NO_APPLICABLE_PROMO",
            "message": "No hay una promoción aplicable que cumpla el mínimo para este carrito.",
            "promotion": current,
        }

    promo_type = benefit.get("type")
    original_amount = amount
    discount_amount = 0.0
    final_amount = amount

    if promo_type == "descuento_porcentaje":
        # Descuento directo sobre el total del carrito
        try:
            percentage = float(benefit.get("percentage", 0) or 0.0)
        except (TypeError, ValueError):
            percentage = 0.0
        discount_amount = round(original_amount * (percentage / 100.0), 2)
        final_amount = round(original_amount - discount_amount, 2)

    elif promo_type == "msi":
        # MSI: normalmente no cambia el total, solo las condiciones de pago.
        discount_amount = 0.0
        final_amount = original_amount

    else:
        # Tipo de promoción no soportado aún
        return {
            "error": "UNKNOWN_PROMO_TYPE",
            "message": f"Tipo de promoción no soportado: {promo_type}",
            "promotion": current,
        }

    # Persistimos el nuevo total del carrito + flag de promo aplicada
    with pool.acquire() as conn:
        conn.autocommit = False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE carts
                       SET total_price   = :1,
                           promo_applied = 'Y'
                     WHERE cart_id      = :2
                    """,
                    [final_amount, cart_id],
                )
            conn.commit()
        except Exception as e:
            try:
                conn.rollback()
            except Exception:
                pass
            return {
                "error": "DB_ERROR",
                "message": str(e),
            }

    # Ticket de respuesta
    ticket = {
        "cart_id": cart_id,
        "bank_name": bank_name,
        "original_amount": original_amount,
        "discount_amount": discount_amount,
        "final_amount": final_amount,
        "applied_promo": current,
    }

    return ticket
