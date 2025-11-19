from typing import Dict, Optional, List
import oracledb
from datetime import datetime, date

def _coerce(value):
    if isinstance(value, oracledb.LOB):
        data = value.read()
        try:
            value.close()
        except Exception:
            pass
        return data
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value

def _dict(cur, row) -> Dict:
    cols = [d[0].lower() for d in cur.description]
    return {k: _coerce(v) for k, v in zip(cols, row)}

# ---------------------------------------------------------------------
# Crear/actualizar rating (upsert)
# ---------------------------------------------------------------------
def upsert_rating(pool, user_id: int, article_id: str, rating: int,
                  review_text: Optional[str] = None) -> Dict:
    if rating < 1 or rating > 5:
        raise ValueError("rating debe estar entre 1 y 5")

    sql = """
        MERGE INTO product_ratings pr
        USING (SELECT :user_id AS user_id,
                      :article_id AS article_id
               FROM dual) src
        ON (pr.user_id = src.user_id AND pr.article_id = src.article_id)
        WHEN MATCHED THEN
          UPDATE
             SET rating     = :rating,
                 review_text    = :review_text,
                 updated_at = SYSTIMESTAMP
        WHEN NOT MATCHED THEN
          INSERT (user_id, article_id, rating, review_text)
          VALUES (:user_id, :article_id, :rating, :review_text)
    """

    params = {
        "user_id": int(user_id),
        "article_id": article_id,
        "rating": int(rating),
        "review_text": review_text
    }

    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()

    # Devolvemos la fila actualizada
    return get_user_rating_for_article(pool, user_id, article_id)

# ---------------------------------------------------------------------
# Obtener rating de un usuario para un artículo
# ---------------------------------------------------------------------
def get_user_rating_for_article(pool, user_id: int, article_id: str) -> Optional[Dict]:
    sql = """
        SELECT rating_id, user_id, article_id,
               rating, review_text, created_at, updated_at
        FROM product_ratings
        WHERE user_id = :user_id
          AND article_id = :article_id
    """
    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(sql, {"user_id": int(user_id), "article_id": article_id})
        row = cur.fetchone()
        return _dict(cur, row) if row else None

# ---------------------------------------------------------------------
# Listar ratings de un producto
# ---------------------------------------------------------------------
def list_ratings_for_article(pool, article_id: str,
                             limit: int = 20, offset: int = 0) -> Dict:
    sql = """
        SELECT rating_id, user_id, article_id,
               rating, review_text, created_at, updated_at
        FROM product_ratings
        WHERE article_id = :article_id
        ORDER BY created_at DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """
    params = {
        "article_id": article_id,
        "limit": int(limit),
        "offset": int(offset)
    }
    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = [_dict(cur, r) for r in cur.fetchall()]
    return {"items": rows, "limit": limit, "offset": offset}

# ---------------------------------------------------------------------
# Resumen de rating de un producto (promedio y total)
# ---------------------------------------------------------------------
def get_rating_summary_for_article(pool, article_id: str) -> Dict:
    sql = """
        SELECT
          NVL(AVG(rating), 0) AS avg_rating,
          COUNT(*) AS rating_count
        FROM product_ratings
        WHERE article_id = :article_id
    """
    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(sql, {"article_id": article_id})
        row = cur.fetchone()
        return {
            "avg_rating": float(row[0]) if row[0] is not None else 0.0,
            "rating_count": int(row[1])
        }
