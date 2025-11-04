# app/routes/storage_routes.py
from flask import Blueprint, jsonify, request
from app.services.object_storage_service import ping, put_test_object, presigned_url

storage_bp = Blueprint("storage", __name__, url_prefix="/api/storage")

@storage_bp.get("/health")
def storage_health():
    """Confirma conexión a Object Storage y existencia del bucket."""
    data = ping()
    return jsonify({"ok": True, **data})

@storage_bp.post("/test-upload")
def storage_test_upload():
    """Sube un archivo de texto pequeño y devuelve su nombre y PAR."""
    data = put_test_object()
    url = presigned_url(data["object_name"], minutes=10)
    return jsonify({"ok": True, **data, "url": url})
