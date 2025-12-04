# app/services/preferences_services.py
from typing import List, Dict
from flask import current_app

NORMALIZATION_MAP = {
    "COLOUR": {
        "Unknown": "Unknown",
        "Undefined": "Unknown",
        "Mole": "Brown",
        "Khaki Green": "Green",
        "Yellowish Green": "Green",
        "Bluish Green": "Blue",
        "Lilac Purple": "Purple",
    },
    "GARMENT_GROUP": {
        "Under-, Nightwear": "Nightwear",
        "Jersey Basic": "Jersey",
        "Jersey Fancy": "Jersey",
        "Knitwear": "Knitwear",
        "Dressed": "Dresses",
        "Dresses Ladies": "Dresses",
        "Dresses/Skirts Girls": "Dresses",
        "Trousers Denim": "Trousers",
        "Special Offers": "Other",
        "Unknown": "Other",
    },
    "DEPARTMENT": {
        "Men Other 2": "Men Other",
        "Men Other": "Men Other",
        "Ladies Other": "Ladies Other",
        "Basics": "Basics",
        "Basic 1": "Basics",
        "Jersey": "Jersey",
        "Jersey Fancy": "Jersey",
        "Jersey Basic": "Jersey",
        "Boots": "Shoes",
        "Divided Shoes": "Shoes",
        "Kids & Baby Shoes": "Shoes",
    },
    "SECTION": {
        "Men Other 2": "Men Other",
        "Men Other": "Men Other",
        "Ladies Other": "Ladies Other",
        "Mens Outerwear": "Outerwear",
        "Kids Outerwear": "Outerwear",
        "Womens Jackets": "Outerwear",
    },
    "PRODUCT_GROUP": {
        "Garment Upper Body": "Upper Body",
        "Garment Lower Body": "Lower Body",
        "Garment Full Body": "Full Body",
        "Underwear/Nightwear": "Nightwear",
        "Nightwear": "Nightwear",
        "Interior Textile": "Home",
        "Furniture": "Home",
    }
}

FACETS = ("GENDER", "DEPARTMENT", "PRODUCT_GROUP", "SECTION", "GARMENT_GROUP", "COLOUR")

ONBOARDING_WEIGHTS = {
    "GENDER": 1,
    "DEPARTMENT": 1,
    "PRODUCT_GROUP": 1,
    "SECTION": 1,
    "GARMENT_GROUP": 1,
    "COLOUR": 1,
}

PURCHASE_WEIGHTS = {
    "GENDER": 1.0,
    "DEPARTMENT": 1,
    "PRODUCT_GROUP": 1,
    "SECTION": 1,
    "GARMENT_GROUP": 1,
    "COLOUR": 1,
}

MERGE_SQL = """
MERGE INTO user_pref_kv t
USING (
  SELECT :user_id AS user_id,
         :facet   AS facet,
         UPPER(TRIM(:key_text)) AS key_text,
         :inc     AS inc
  FROM dual
) s
ON (t.user_id = s.user_id AND t.facet = s.facet AND t.key_text = s.key_text)
WHEN MATCHED THEN
  UPDATE SET t.weight = t.weight + s.inc, t.updated_at = SYSTIMESTAMP
WHEN NOT MATCHED THEN
  INSERT (user_id, facet, key_text, weight)
  VALUES (s.user_id, s.facet, s.key_text, s.inc)
"""

def _infer_gender(row: Dict) -> str | None:
    for txt in [(row.get("index_group_name") or ""), (row.get("section_name") or ""), (row.get("department_name") or "")]:
        low = txt.lower()
        if "men" in low:
            return "Menswear"
        if "lady" in low or "women" in low or "ladies" in low:
            return "Ladieswear"
        if "divided" in low:
            return "Divided"
    return None

def _rows_for_article(user_id: int, prod: Dict, weights: Dict[str, float]) -> List[Dict]:
    out: List[Dict] = []

    # --- 1. Género inferido ---
    g = _infer_gender(prod)
    if g:
        norm_g = _normalize_value("GENDER", g)
        if norm_g:
            out.append({
                "user_id": user_id,
                "facet": "GENDER",
                "key_text": norm_g,
                "inc": float(weights["GENDER"])
            })

    # --- 2. Otras facetas con normalización ---
    mapping = {
        "DEPARTMENT":    prod.get("department_name"),
        "PRODUCT_GROUP": prod.get("product_group_name"),
        "SECTION":       prod.get("section_name"),
        "GARMENT_GROUP": prod.get("garment_group_name"),
        "COLOUR":        prod.get("perceived_colour_master_name"),
    }

    for facet, value in mapping.items():
        if value and facet in weights:
            norm_value = _normalize_value(facet, value)
            if norm_value:
                out.append({
                    "user_id": user_id,
                    "facet": facet,
                    "key_text": norm_value,
                    "inc": float(weights[facet])
                })

    return out


def _fetch_products_by_ids(pool, article_ids: List[str]) -> List[Dict]:
    if not article_ids:
        return []
    ebinds = {f"eid{i}": str(x) for i, x in enumerate(article_ids)}
    pbinds = {f"pid{i}": str(x) for i, x in enumerate(article_ids)}
    eplace = ", ".join(f":eid{i}" for i in range(len(article_ids)))
    pplace = ", ".join(f":pid{i}" for i in range(len(article_ids)))
    sql = f"""
      SELECT external_article_id,
             department_name,
             product_group_name,
             section_name,
             garment_group_name,
             perceived_colour_master_name,
             index_group_name
      FROM catalog
      WHERE external_article_id IN ({eplace})
         OR product_code        IN ({pplace})
    """
    binds = {}
    binds.update(ebinds)
    binds.update(pbinds)
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, binds)
            cols = [d[0].lower() for d in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]

def _merge_rows(pool, rows: List[Dict]) -> int:
    if not rows:
        return 0
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.executemany(MERGE_SQL, rows)
        conn.commit()
    return len(rows)

def _set_first_time_done(pool, user_id: int) -> None:
    """
    Marca que el usuario YA completó el formulario de preferencias.
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE app_user SET first_time = 'N' WHERE user_id = :1",
                [int(user_id)]
            )
        conn.commit()

def record_from_article_ids(user_id: int, article_ids: List[str], event: str) -> int:
    pool = current_app.config["DB_POOL"]
    weights = ONBOARDING_WEIGHTS if event == "onboarding" else PURCHASE_WEIGHTS
    prods = _fetch_products_by_ids(pool, article_ids)
    rows: List[Dict] = []
    for p in prods:
        rows.extend(_rows_for_article(user_id, p, weights))

    changed = _merge_rows(pool, rows)

    # Si es el formulario inicial ("onboarding"),
    # marcamos que el usuario YA NO es de primera vez.
    if event == "onboarding" and changed > 0:
        _set_first_time_done(pool, user_id)

    return changed

def record_from_order(user_id: int, order_id: int) -> int:
    pool = current_app.config["DB_POOL"]
    sql = """
      SELECT oi.article_id
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      WHERE oi.order_id = :oid AND o.user_id = :uid
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"oid": int(order_id), "uid": int(user_id)})
            article_ids = [r[0] for r in cur.fetchall()]
    if not article_ids:
        return 0
    return record_from_article_ids(user_id, article_ids, event="purchase")

def get_user_profile(user_id: int) -> Dict[str, Dict[str, float]]:
    pool = current_app.config["DB_POOL"]
    out: Dict[str, Dict[str, float]] = {}
    sql = """
      SELECT facet, key_text, weight
      FROM user_pref_kv
      WHERE user_id = :1
      ORDER BY facet, weight DESC
    """
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, [int(user_id)])
            for facet, key_text, weight in cur.fetchall():
                facet = str(facet)
                out.setdefault(facet, {})[str(key_text)] = float(weight)
    return out

def reset_user_profile(user_id: int) -> int:
    pool = current_app.config["DB_POOL"]
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_pref_kv WHERE user_id = :1", [int(user_id)])
        conn.commit()
    return 1

def _normalize_value(facet: str, value: str) -> str:
    if not value:
        return None

    value = value.strip()

    # Aplicar mapa de normalización
    mapping = NORMALIZATION_MAP.get(facet, {})
    if value in mapping:
        return mapping[value]

    # Normalizaciones generales
    low = value.lower()

    # Combinar plurales / singulares
    if low.endswith("s") and low[:-1].title() in mapping:
        return low[:-1].title()

    # Combinar variantes “Other”
    if "other" in low:
        return "Other"

    # Combinar variantes “Unknown”
    if "unknown" in low or "undefined" in low:
        return "Unknown"

    return value
