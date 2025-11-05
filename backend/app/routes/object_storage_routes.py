# app/routes/storage_routes.py
from flask import Blueprint, jsonify, request
from app.services.object_storage_service import (
    ping, put_test_object, presigned_url,
    par_for_external_id, par_for_external_ids
)

storage_bp = Blueprint("storage", __name__, url_prefix="/api/storage")

@storage_bp.get("/health")
def storage_health():
    data = ping()
    return jsonify({"ok": True, **data})

# Obtain direct url
@storage_bp.get("/product-image")
def product_image():
    """
    GET /api/storage/product-image?external_article_id=<ID>&minutes=10&verify=true
    """
    ext_id = request.args.get("external_article_id")
    if not ext_id:
        return jsonify({"error": "external_article_id es requerido"}), 400

    minutes = int(request.args.get("minutes", 10))
    verify  = request.args.get("verify", "true").lower() != "false"

    url = par_for_external_id(ext_id, minutes=minutes, verify=verify)
    if not url:
        return jsonify({"error": "imagen no encontrada", "id": ext_id}), 404

    return jsonify({"id": ext_id, "url": url})

# Batch obtain direct urls
@storage_bp.post("/product-images")
def product_images():
    """
    POST /api/storage/product-images
    JSON body: { "ids": ["0108775015","0108775044",...], "minutes": 10, "verify": true }
    """
    payload = request.get_json(silent=True) or {}
    ids = payload.get("ids") or []
    if not ids or not isinstance(ids, list):
        return jsonify({"error": "ids (lista) es requerido"}), 400

    minutes = int(payload.get("minutes", 10))
    verify  = bool(payload.get("verify", True))

    mapping = par_for_external_ids(ids, minutes=minutes, verify=verify)
    return jsonify({"ok": True, "images": mapping})
