from typing import List, Dict

def list_tables(pool, schema: str | None = None, include_views: bool = False) -> Dict[str, list]:
    """
    Lists tables (and optionally views) in the given schema.
    If schema is None, lists tables in the current user's schema.
    """
    tables: List[str] = []
    views: List[str] = []

    with pool.acquire() as conn:
        with conn.cursor() as cur:
            if schema:
                cur.execute("""
                    SELECT table_name FROM all_tables
                    WHERE owner = :owner
                    ORDER BY table_name
                """, dict(owner=schema.upper()))
            else:
                cur.execute("SELECT table_name FROM user_tables ORDER BY table_name")
            tables = [r[0] for r in cur.fetchall()]

            if include_views:
                if schema:
                    cur.execute("""
                        SELECT view_name FROM all_views
                        WHERE owner = :owner
                        ORDER BY view_name
                    """, dict(owner=schema.upper()))
                else:
                    cur.execute("SELECT view_name FROM user_views ORDER BY view_name")
                views = [r[0] for r in cur.fetchall()]

    return {"tables": tables, "views": views if include_views else []}
