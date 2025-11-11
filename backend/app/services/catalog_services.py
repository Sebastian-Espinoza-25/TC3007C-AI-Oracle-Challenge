# app/services/catalog_services.py
from typing import Dict, Optional, List, Tuple
import oracledb
from datetime import date, datetime

def _coerce(value):
    # Converts types from oracledb to standard Python types
    if isinstance(value, oracledb.LOB):
        data = value.read()  # read CLOB
        try:
            value.close()      # free resources
        except Exception:
            pass
        return data
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value

def _dict(cur, row) -> Dict:
    cols = [d[0].lower() for d in cur.description]
    out = {}
    for k, v in zip(cols, row):
        out[k] = _coerce(v)
    return out

def _build_filters(
    q: Optional[str],
    product_types: Optional[List[str]],
    min_price: Optional[float],
    max_price: Optional[float],
    in_stock: Optional[bool],
    department: Optional[str],
    index_group: Optional[str],
) -> Tuple[str, Dict]:
    """
    Construye WHERE dinámico y el diccionario de parámetros.
    """
    clauses = []
    params: Dict = {}

    # Search By Name
    if q:
        clauses.append("LOWER(prod_name) LIKE LOWER('%' || :q || '%')")
        params["q"] = q

    # Product types (IN (:pt0, :pt1, ...))
    if product_types:
        pt_binds = []
        for i, val in enumerate(product_types):
            key = f"pt{i}"
            pt_binds.append(f":{key}")
            params[key] = val
        clauses.append(f"product_type_name IN ({', '.join(pt_binds)})")

    # Price range
    if min_price is not None:
        clauses.append("price >= :min_price")
        params["min_price"] = float(min_price)
    if max_price is not None:
        clauses.append("price <= :max_price")
        params["max_price"] = float(max_price)

    # Stock > 0
    if in_stock:
        clauses.append("stock > 0")

    # Department / Index group
    if department:
        clauses.append("LOWER(department_name) = LOWER(:department)")
        params["department"] = department
    if index_group:
        clauses.append("LOWER(index_group_name) = LOWER(:index_group)")
        params["index_group"] = index_group

    where_sql = "WHERE " + " AND ".join(clauses) if clauses else ""
    return where_sql, params


def list_products(
    pool,
    q: Optional[str],
    limit: int = 20,
    offset: int = 0,
    product_types: Optional[List[str]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    department: Optional[str] = None,
    index_group: Optional[str] = None,
    sort: Optional[str] = None,  # "price_asc", "price_desc", "name_asc", "name_desc"
    user_id: Optional[int] = None,  # personalización
) -> Dict:

    where_sql, params = _build_filters(
        q=q,
        product_types=product_types,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        department=department,
        index_group=index_group,
    )

    # Orden natural (si no hay user_id)
    order_by = "ORDER BY prod_name"
    if sort == "price_asc":
        order_by = "ORDER BY price ASC, prod_name"
    elif sort == "price_desc":
        order_by = "ORDER BY price DESC, prod_name"
    elif sort == "name_desc":
        order_by = "ORDER BY prod_name DESC"

    # Sin personalización → query original
    if user_id is None:
        sql = f"""
        SELECT external_article_id, product_code, prod_name, price, stock, perceived_colour_master_name
        FROM catalog
        {where_sql}
        {order_by}
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        """
        params["limit"] = limit
        params["offset"] = offset

        with pool.acquire() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = [_dict(cur, r) for r in cur.fetchall()]
        return {"items": rows, "limit": limit, "offset": offset}

    # ---- Personalización: con user_id ----
    facet_w = {
        "GENDER":        1.2,  # empuja Menswear/Ladieswear/Divided
        "DEPARTMENT":    1.0,
        "PRODUCT_GROUP": 0.9,
        "SECTION":       0.6,
        "GARMENT_GROUP": 0.5,
        "COLOUR":        0.3,
    }

    # score primero y luego tu sort actual
    personalized_order = "ORDER BY score_user DESC, " + order_by.replace("ORDER BY ", "")

    # OJO: usar :p_uid (no :uid) para evitar ORA-01745 por colisión con UID
    params["p_uid"] = int(user_id)

    sql = f"""
    WITH prefs AS (
      SELECT facet, key_text, weight
      FROM user_pref_kv
      WHERE user_id = :p_uid
    )
    SELECT
      p.external_article_id,
      p.product_code,
      p.prod_name,
      p.price,
      p.stock,
      p.perceived_colour_master_name,
      -- Score agregado por afinidad a preferencias
      NVL(gender_p.weight, 0) * {facet_w["GENDER"]} +
      NVL(dept_p.weight,   0) * {facet_w["DEPARTMENT"]} +
      NVL(pg_p.weight,     0) * {facet_w["PRODUCT_GROUP"]} +
      NVL(sec_p.weight,    0) * {facet_w["SECTION"]} +
      NVL(gg_p.weight,     0) * {facet_w["GARMENT_GROUP"]} +
      NVL(col_p.weight,    0) * {facet_w["COLOUR"]}   AS score_user
    FROM catalog p
    -- GENDER: inferido y comparado con index_group_name (Menswear/Ladieswear/Divided)
    LEFT JOIN prefs gender_p ON gender_p.facet='GENDER'
                            AND gender_p.key_text = p.index_group_name
    -- DEPARTMENT
    LEFT JOIN prefs dept_p   ON dept_p.facet='DEPARTMENT'
                            AND dept_p.key_text = p.department_name
    -- PRODUCT_GROUP
    LEFT JOIN prefs pg_p     ON pg_p.facet='PRODUCT_GROUP'
                            AND pg_p.key_text = p.product_group_name
    -- SECTION
    LEFT JOIN prefs sec_p    ON sec_p.facet='SECTION'
                            AND sec_p.key_text = p.section_name
    -- GARMENT_GROUP
    LEFT JOIN prefs gg_p     ON gg_p.facet='GARMENT_GROUP'
                            AND gg_p.key_text = p.garment_group_name
    -- COLOUR
    LEFT JOIN prefs col_p    ON col_p.facet='COLOUR'
                            AND col_p.key_text = p.perceived_colour_master_name
    {where_sql}
    {personalized_order}
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """

    params["limit"] = limit
    params["offset"] = offset

    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = [_dict(cur, r) for r in cur.fetchall()]

    return {"items": rows, "limit": limit, "offset": offset}


def count_products(
    pool,
    q: Optional[str],
    product_types: Optional[List[str]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    department: Optional[str] = None,
    index_group: Optional[str] = None,
) -> int:
    where_sql, params = _build_filters(
        q=q,
        product_types=product_types,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        department=department,
        index_group=index_group,
    )
    sql = f"SELECT COUNT(*) FROM catalog {where_sql}"
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return int(cur.fetchone()[0])


def get_distinct_product_types(pool) -> list[dict]:
    """
    Returns normalized product types (capitalized) with their counts.
    Example: {"PRODUCT_TYPE_NAME": "Dress", "CNT": 10362}
    """
    sql = """
    SELECT
        INITCAP(LOWER(TRIM(product_type_name))) AS product_type_name,
        COUNT(*) AS cnt
    FROM catalog
    WHERE product_type_name IS NOT NULL
    GROUP BY INITCAP(LOWER(TRIM(product_type_name)))
    ORDER BY product_type_name
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            return [_dict(cur, r) for r in cur.fetchall()]


def get_product(pool, external_article_id: str) -> Optional[Dict]:
    """
    Obtains detailed information about a product by its external_article_id.
    """
    sql = """
    SELECT
      external_article_id,
      product_code,
      prod_name,
      price,
      stock,
      detail_desc,
      perceived_colour_master_name
    FROM catalog
    WHERE external_article_id = :external_article_id
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"external_article_id": external_article_id})
            row = cur.fetchone()
            return _dict(cur, row) if row else None
