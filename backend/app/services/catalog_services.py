# app/services/catalog_services.py
from typing import Dict, Optional, List, Tuple
import oracledb
from datetime import date, datetime

def _coerce(value):
    # Converts types from oracledb to standard Python types
    if isinstance(value, oracledb.LOB):
        #read clob
        data = value.read()  
        try:
            # close the LOB to free resources
            value.close()          
        except Exception:
            pass
        return data
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value

def _dict(cur, row) -> Dict:
    cols = [d[0] for d in cur.description]
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

    # Order
    order_by = "ORDER BY prod_name"
    if sort == "price_asc":
        order_by = "ORDER BY price ASC, prod_name"
    elif sort == "price_desc":
        order_by = "ORDER BY price DESC, prod_name"
    elif sort == "name_desc":
        order_by = "ORDER BY prod_name DESC"

    sql = f"""
    SELECT external_article_id, product_code, prod_name, price, stock
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

        
from typing import Dict, Optional

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
      detail_desc
    FROM catalog
    WHERE external_article_id = :external_article_id
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"external_article_id": external_article_id})
            row = cur.fetchone()
            return _dict(cur, row) if row else None
