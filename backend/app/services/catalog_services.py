from typing import Dict, Optional, List, Tuple
import oracledb
from datetime import date, datetime


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


def _build_filters(
    q: Optional[str],
    product_types: Optional[List[str]],
    min_price: Optional[float],
    max_price: Optional[float],
    in_stock: Optional[bool],
    department: Optional[str],
    index_group: Optional[str],
    section: Optional[str],
) -> Tuple[str, Dict]:
    clauses: List[str] = []
    params: Dict = {}

    if q:
        clauses.append("LOWER(prod_name) LIKE '%' || LOWER(:q) || '%'")
        params["q"] = q

    if product_types:
        pt_binds = []
        for i, val in enumerate(product_types):
            key = f"pt{i}"
            pt_binds.append(f":{key}")
            params[key] = val
        clauses.append(f"product_type_name IN ({', '.join(pt_binds)})")

    if min_price is not None:
        clauses.append("price >= :min_price")
        params["min_price"] = float(min_price)
    if max_price is not None:
        clauses.append("price <= :max_price")
        params["max_price"] = float(max_price)

    if in_stock:
        clauses.append("stock > 0")

    if department:
        clauses.append("LOWER(department_name) = LOWER(:department)")
        params["department"] = department

    if index_group:
        clauses.append("LOWER(index_group_name) = LOWER(:index_group)")
        params["index_group"] = index_group

    if section:
        clauses.append("LOWER(section_name) = LOWER(:section)")
        params["section"] = section

    where_sql = "WHERE " + " AND ".join(clauses) if clauses else ""
    return where_sql, params


# LIST PRODUCTS
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
    section: Optional[str] = None,
    sort: Optional[str] = None,
    user_id: Optional[int] = None,
) -> Dict:

    where_sql, params = _build_filters(
        q=q,
        product_types=product_types,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        department=department,
        index_group=index_group,
        section=section,
    )

    # Default: random order (solo cuando sort no está definido)
    if sort is None:
        order_by = "ORDER BY DBMS_RANDOM.VALUE"
    elif sort == "price_asc":
        order_by = "ORDER BY price ASC, prod_name"
    elif sort == "price_desc":
        order_by = "ORDER BY price DESC, prod_name"
    elif sort == "name_desc":
        order_by = "ORDER BY prod_name DESC"
    else:
        order_by = "ORDER BY DBMS_RANDOM.VALUE"   # fallback

    # SIN PERSONALIZACIÓN
    if user_id is None:
        sql = f"""
            SELECT
                c.external_article_id,
                c.product_code,
                c.prod_name,
                c.price,
                c.stock,
                c.perceived_colour_master_name,
                c.section_name,
                c.image_url,
                NVL(r.avg_rating, 0)   AS avg_rating,
                NVL(r.rating_count, 0) AS rating_count
            FROM catalog c
            LEFT JOIN (
                SELECT
                    article_id,
                    AVG(rating) AS avg_rating,
                    COUNT(*)    AS rating_count
                FROM product_ratings
                GROUP BY article_id
            ) r
              ON r.article_id = c.external_article_id
            {where_sql}
            {order_by}
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        """

        params.update({"limit": limit, "offset": offset})

        with pool.acquire() as conn, conn.cursor() as cur:
            cur.execute(sql, params)
            rows = [_dict(cur, r) for r in cur.fetchall()]
        return {"items": rows, "limit": limit, "offset": offset}

    # CON PERSONALIZACIÓN
    params.update({
        "p_uid": int(user_id),
        "limit": limit,
        "offset": offset,
        "w_gender": 1.2,
        "w_dept": 1.0,
        "w_pg": 0.9,
        "w_sec": 0.6,
        "w_gg": 0.5,
        "w_col": 0.3,
    })

    secondary_order = order_by.replace("ORDER BY ", "")

    sql = f"""
        WITH prefs AS (
            SELECT facet, UPPER(TRIM(key_text)) AS key_text, weight
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
            p.section_name,
            p.image_url,
            NVL(r.avg_rating, 0)   AS avg_rating,
            NVL(r.rating_count, 0) AS rating_count,
            NVL(gender_p.weight,0) * CASE WHEN UPPER(TRIM(p.index_group_name))             = gender_p.key_text THEN :w_gender ELSE 0 END +
            NVL(dept_p.weight,0)   * CASE WHEN UPPER(TRIM(p.department_name))              = dept_p.key_text   THEN :w_dept   ELSE 0 END +
            NVL(pg_p.weight,0)     * CASE WHEN UPPER(TRIM(p.product_group_name))           = pg_p.key_text     THEN :w_pg     ELSE 0 END +
            NVL(sec_p.weight,0)    * CASE WHEN UPPER(TRIM(p.section_name))                 = sec_p.key_text    THEN :w_sec    ELSE 0 END +
            NVL(gg_p.weight,0)     * CASE WHEN UPPER(TRIM(p.garment_group_name))           = gg_p.key_text     THEN :w_gg     ELSE 0 END +
            NVL(col_p.weight,0)    * CASE WHEN UPPER(TRIM(p.perceived_colour_master_name)) = col_p.key_text    THEN :w_col    ELSE 0 END
            AS score_user
        FROM catalog p
        LEFT JOIN (
            SELECT
                article_id,
                AVG(rating) AS avg_rating,
                COUNT(*)    AS rating_count
            FROM product_ratings
            GROUP BY article_id
        ) r
          ON r.article_id = p.external_article_id
        LEFT JOIN prefs gender_p ON gender_p.facet='GENDER'
        LEFT JOIN prefs dept_p   ON dept_p.facet='DEPARTMENT'
        LEFT JOIN prefs pg_p     ON pg_p.facet='PRODUCT_GROUP'
        LEFT JOIN prefs sec_p    ON sec_p.facet='SECTION'
        LEFT JOIN prefs gg_p     ON gg_p.facet='GARMENT_GROUP'
        LEFT JOIN prefs col_p    ON col_p.facet='COLOUR'
        {where_sql}
        ORDER BY
            score_user DESC,
            ORA_HASH(p.external_article_id, 4096, :p_uid),
            {secondary_order}
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    """

    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = [_dict(cur, r) for r in cur.fetchall()]
    return {"items": rows, "limit": limit, "offset": offset}


# COUNT PRODUCTS
def count_products(
    pool,
    q: Optional[str],
    product_types: Optional[List[str]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    department: Optional[str] = None,
    index_group: Optional[str] = None,
    section: Optional[str] = None,
) -> int:
    where_sql, params = _build_filters(
        q=q,
        product_types=product_types,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        department=department,
        index_group=index_group,
        section=section,
    )

    sql = f"SELECT COUNT(*) FROM catalog {where_sql}"
    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return int(cur.fetchone()[0])


# GET DISTINCT PRODUCT TYPES
def get_distinct_product_types(pool) -> list[dict]:
    sql = """
        SELECT
            INITCAP(LOWER(TRIM(product_type_name))) AS product_type_name,
            COUNT(*) AS cnt
        FROM catalog
        WHERE product_type_name IS NOT NULL
        GROUP BY INITCAP(LOWER(TRIM(product_type_name)))
        ORDER BY product_type_name
    """
    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(sql)
        return [_dict(cur, r) for r in cur.fetchall()]


# GET PRODUCT
def get_product(pool, external_article_id: str) -> Optional[Dict]:
    sql = """
        SELECT
            c.external_article_id,
            c.product_code,
            c.prod_name,
            c.price,
            c.stock,
            c.detail_desc,
            c.perceived_colour_master_name,
            c.section_name,
            c.image_url,
            NVL(r.avg_rating, 0)   AS avg_rating,
            NVL(r.rating_count, 0) AS rating_count
        FROM catalog c
        LEFT JOIN (
            SELECT
                article_id,
                AVG(rating) AS avg_rating,
                COUNT(*)    AS rating_count
            FROM product_ratings
            GROUP BY article_id
        ) r
          ON r.article_id = c.external_article_id
        WHERE c.external_article_id = :external_article_id
    """
    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(sql, {"external_article_id": external_article_id})
        row = cur.fetchone()
        return _dict(cur, row) if row else None


# UPDATE IMAGE URL
def update_image_url(pool, external_id: str, url: str | None):
    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE catalog
            SET image_url = :url
            WHERE external_article_id = :eid
            """,
            {"url": url, "eid": external_id}
        )
        conn.commit()


def list_filter_options(pool):
    sql = """
        SELECT
            DISTINCT INITCAP(LOWER(TRIM(product_type_name))) AS product_type_name,
            INITCAP(LOWER(TRIM(department_name))) AS department_name,
            INITCAP(LOWER(TRIM(index_group_name))) AS index_group_name,
            INITCAP(LOWER(TRIM(section_name))) AS section_name,
            INITCAP(LOWER(TRIM(product_group_name))) AS product_group_name,
            INITCAP(LOWER(TRIM(garment_group_name))) AS garment_group_name,
            INITCAP(LOWER(TRIM(perceived_colour_master_name))) AS colour_name
        FROM catalog
    """

    with pool.acquire() as conn, conn.cursor() as cur:
        cur.execute(sql)

        product_types = set()
        departments = set()
        index_groups = set()
        sections = set()
        product_groups = set()
        garment_groups = set()
        colours = set()

        for row in cur.fetchall():
            (
                pt,
                dep,
                ig,
                sec,
                pg,
                gg,
                col
            ) = row

            if pt: product_types.add(pt)
            if dep: departments.add(dep)
            if ig: index_groups.add(ig)
            if sec: sections.add(sec)
            if pg: product_groups.add(pg)
            if gg: garment_groups.add(gg)
            if col: colours.add(col)

    return {
        "product_types": sorted(product_types),
        "departments": sorted(departments),
        "index_groups": sorted(index_groups),
        "sections": sorted(sections),
        "product_groups": sorted(product_groups),
        "garment_groups": sorted(garment_groups),
        "colours": sorted(colours),
    }
