from __future__ import annotations

import json
from typing import Dict, Any, Optional
from threading import Lock

import oracledb

from app.services.promotor_agent.promos_rag import PromoRAG
from app.services.cart_services import get_cart  # Reusamos cart service

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
                    except:
                        pass
                _rag = rag
    return _rag

# Obtener promoción para monto y banco
def get_promo_for_amount_and_bank(amount: float, bank_name: str) -> Dict[str, Any]:
    rag = _get_rag()
    raw = rag.promotor(amount, bank_name or "")
    return json.loads(raw)


# Obtener el banco del usuario
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

# Orquesta todo para obtener promoción desde el carrito
def get_promo_for_cart(pool, user_id: int) -> Dict[str, Any]:
    """
    Orquesta todo:
      - reutiliza get_cart(...) para obtener cart_id y total
      - consulta el banco del método de pago
      - llama al RAG de promociones
    """
    # Reusar servicio de carrito
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

    # Banco del usuario
    bank_name = _fetch_user_bank(pool, user_id)

    # Llamar al RAG
    promo_payload = get_promo_for_amount_and_bank(amount, bank_name)

    # Enriquecer la respuesta con contexto del carrito
    promo_payload.update(
        {
            "cart_id": cart_id,
            "cart_amount": amount,
            "bank_name": bank_name or "",
        }
    )

    return promo_payload
