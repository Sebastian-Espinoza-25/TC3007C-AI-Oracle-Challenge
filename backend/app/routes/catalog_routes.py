from flask import Blueprint, request, jsonify, current_app
from app.services import catalog_services as svc
from app.services.object_storage_service import (
    par_for_external_ids, par_for_external_id, key_from_external_id
)

catalog_bp = Blueprint("catalog", __name__, url_prefix="/catalog")

def _parse_bool(val: str | None):
    if val is None:
        return None
    return val.lower() in ("1", "true", "yes", "y")

@catalog_bp.get("/")
def list_catalog():
    """
    GET /catalog/?q=&limit=&offset=...
    """
    q = (request.args.get("q") or "").strip()
    try:
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return jsonify({"error": "limit/offset deben ser enteros"}), 400

    # múltiples product_types
    product_types = request.args.getlist("product_type")
    if not product_types:
        csv = (request.args.get("product_types") or "").strip()
        if csv:
            product_types = [s.strip() for s in csv.split(",") if s.strip()]

    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)
    in_stock = _parse_bool(request.args.get("in_stock"))
    department = request.args.get("department")
    index_group = request.args.get("index_group")
    sort = request.args.get("sort")  # price_asc|price_desc|name_asc|name_desc

    pool = current_app.config["DB_POOL"]
    data = svc.list_products(
        pool,
        q=q if q else None,
        limit=limit,
        offset=offset,
        product_types=product_types or None,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        department=department or None,
        index_group=index_group or None,
        sort=sort or None,
    )
    total = svc.count_products(
        pool,
        q=q if q else None,
        product_types=product_types or None,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        department=department or None,
        index_group=index_group or None,
    )

    # New: attach image URLs via presigned URLs (PARs)
    items = data["items"]
    ids = [it["external_article_id"] for it in items]  
    # duration of the presigned URL
    minutes = int(request.args.get("image_minutes", 30))
    # verify existence and get mapping
    mapping = par_for_external_ids(ids, minutes=minutes, verify=True)

    for it in items:
        eid = it["external_article_id"]
        url = mapping.get(eid)
        it["image_url"] = url          # None if no image
        it["has_image"] = bool(url)    # True/False
        it["image_key"] = key_from_external_id(eid)  # deterministic key

    data["total"] = total
    return jsonify(data), 200



@catalog_bp.get("/<string:external_article_id>")
def product_detail(external_article_id: str):
    pool = current_app.config["DB_POOL"]
    prod = svc.get_product(pool, external_article_id)
    if not prod:
        return jsonify({"error": "Producto no encontrado"}), 404

    # Attach image URL via presigned URL (PAR)
    minutes = int(request.args.get("image_minutes", 30))
    url = par_for_external_id(external_article_id, minutes=minutes, verify=True)
    prod["image_url"] = url
    prod["has_image"] = bool(url)
    prod["image_key"] = key_from_external_id(external_article_id)

    return jsonify(prod), 200

# To visualize available product types for filtering
@catalog_bp.get("/product_types")
def facets_product_types():
    pool = current_app.config["DB_POOL"]
    items = svc.get_distinct_product_types(pool)
    return jsonify({"items": items}), 200