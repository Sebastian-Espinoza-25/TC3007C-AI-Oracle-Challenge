from flask import Blueprint, request, jsonify, current_app
from app.services import catalog_services as svc
from app.services.visual_agent_service import predict as predict
from app.services.object_storage_service import (
    par_for_external_ids, par_for_external_id, key_from_external_id
)
from app.services.image_refresh_service import refresh_all_image_urls

catalog_bp = Blueprint("catalog", __name__)


def _parse_bool(val: str | None):
    if val is None:
        return None
    return val.lower() in ("1", "true", "yes", "y")


# GET /catalog
@catalog_bp.get("/")
def list_catalog():
    q = (request.args.get("q") or "").strip()

    try:
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return jsonify({"error": "limit/offset deben ser enteros"}), 400

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
    section = request.args.get("section")
    sort = request.args.get("sort")
    user_id = request.args.get("uid", type=int)

    pool = current_app.config["DB_POOL"]

    # Trae los productos desde la BD
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
        section=section or None,
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
        section=section or None,
    )

    # Logica de imagenes
    items = data["items"]

    for it in items:
        eid = it["external_article_id"]

        if it.get("image_url"):  # Si ya existe la URL guardada en DB
            it["has_image"] = True
        else:
            it["image_url"] = None  # o "no-image" como quieras
            it["has_image"] = False

        it["image_key"] = key_from_external_id(eid)

    data["total"] = total
    return jsonify(data), 200

# GET /catalog/<id>
@catalog_bp.get("/<string:external_article_id>")
def product_detail(external_article_id: str):
    pool = current_app.config["DB_POOL"]
    prod = svc.get_product(pool, external_article_id)

    if not prod:
        return jsonify({"error": "Producto no encontrado"}), 404

    # Usar solo URLs guardadas
    if prod.get("image_url"):
        prod["has_image"] = True
    else:
        prod["image_url"] = None
        prod["has_image"] = False

    prod["image_key"] = key_from_external_id(external_article_id)

    return jsonify(prod), 200


# GET /catalog/product_types
@catalog_bp.get("/product_types")
def facets_product_types():
    pool = current_app.config["DB_POOL"]
    items = svc.get_distinct_product_types(pool)
    return jsonify({"items": items}), 200


# POST /catalog/visual_agent
@catalog_bp.post("/visual_agent")
def catalog_visual_agent():
    raw_ids = (request.args.get("ids") or "").strip()
    seed_ids = []
    k = request.args.get("k", default=None, type=int)

    if raw_ids:
        seed_ids = [s.strip() for s in raw_ids.split(",") if s.strip()]
    else:
        data = request.get_json(silent=True) or {}
        body_ids = data.get("ids")
        if body_ids and isinstance(body_ids, list):
            seed_ids = [str(x).strip() for x in body_ids if str(x).strip()]
        if k is None:
            k = data.get("k", 10)

    if not seed_ids:
        return jsonify({"error": "Debes enviar ids en JSON o query"}), 400

    if k is None:
        k = 10

    # Obtener recomendaciones del modelo
    try:
        rec_ids = predict(seed_ids, k=k)
        rec_ids = [str(x) for x in rec_ids]
    except Exception as e:
        return jsonify({"error": f"Error al obtener recomendaciones: {e}"}), 500

    pool = current_app.config["DB_POOL"]

    items = []
    for eid in rec_ids:
        prod = svc.get_product(pool, eid)
        if prod:
            # usar solo URL guardada
            if prod.get("image_url"):
                prod["has_image"] = True
            else:
                prod["image_url"] = None
                prod["has_image"] = False

            prod["image_key"] = key_from_external_id(eid)
            items.append(prod)

    return jsonify({
        "items": items,
        "total": len(items),
        "seeds": seed_ids,
        "recommended_ids": rec_ids,
    }), 200

# POST /catalog/refresh_images
@catalog_bp.post("/refresh_images")
def refresh_images():
    days = request.args.get("days", default=30, type=int)
    limit = request.args.get("limit", default=None, type=int)
    offset = request.args.get("offset", default=0, type=int)
    skip_existing = request.args.get("skip_existing", default="true").lower() in ("1", "true", "yes")

    pool = current_app.config["DB_POOL"]

    result = refresh_all_image_urls(
        pool,
        days_valid=days,
        limit=limit,
        offset=offset,
        skip_existing=skip_existing
    )

    return jsonify({
        "status": "ok",
        "message": "Image URLs refreshed successfully",
        "details": result
    }), 200

@catalog_bp.get("/filters")
def get_filter_options():
    pool = current_app.config["DB_POOL"]
    options = svc.list_filter_options(pool)
    return jsonify(options)
