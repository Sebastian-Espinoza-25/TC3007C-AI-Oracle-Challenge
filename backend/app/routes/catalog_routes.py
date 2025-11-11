from flask import Blueprint, request, jsonify, current_app
from app.services import catalog_services as svc
from app.services.visual_agent_service import predict as predict
from app.services.object_storage_service import (
    par_for_external_ids, par_for_external_id, key_from_external_id
)

catalog_bp = Blueprint("catalog", __name__)

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

    user_id = request.args.get("uid", type=int)

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
        user_id=user_id,
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

@catalog_bp.get("/visual_agent")
def catalog_visual_agent():
    """
    GET /catalog/visual_agent?ids=010...,011...&k=10
    También acepta JSON en el body:
    {
      "ids": ["010...", "011..."],
      "k": 10
    }
    """
    # 1. intentar querystring
    raw_ids = (request.args.get("ids") or "").strip()

    seed_ids = []
    k = request.args.get("k", default=None, type=int)

    if raw_ids:
        seed_ids = [s.strip() for s in raw_ids.split(",") if s.strip()]
    else:
        # 2. si no venían en query, intentar body JSON
        data = request.get_json(silent=True) or {}
        body_ids = data.get("ids")
        if body_ids and isinstance(body_ids, list):
            seed_ids = [str(x).strip() for x in body_ids if str(x).strip()]
        if k is None:
            k = data.get("k", 10)

    if not seed_ids:
        return jsonify({"error": "Debes enviar ids en query (?ids=...) o en JSON {\"ids\": [...]}"}), 400

    if k is None:
        k = 10

    # 3. pedir recomendaciones al servicio
    try:
        rec_ids = predict(seed_ids, k=k)
        rec_ids = [str(x) for x in rec_ids]
    except Exception as e:
        return jsonify({"error": f"Error al obtener recomendaciones del modelo: {e}"}), 500

    if not rec_ids:
        return jsonify({"items": [], "total": 0}), 200

    # 4. traer productos
    pool = current_app.config["DB_POOL"]
    items = []
    for eid in rec_ids:
        prod = svc.get_product(pool, eid)
        if prod:
            items.append(prod)

    # 5. imágenes
    minutes = int(request.args.get("image_minutes", 30))
    mapping = par_for_external_ids(rec_ids, minutes=minutes, verify=True)

    for it in items:
        eid = it["external_article_id"]
        url = mapping.get(eid)
        it["image_url"] = url
        it["has_image"] = bool(url)
        it["image_key"] = key_from_external_id(eid)

    return jsonify({
        "items": items,
        "total": len(items),
        "seeds": seed_ids,
        "recommended_ids": rec_ids,
    }), 200
