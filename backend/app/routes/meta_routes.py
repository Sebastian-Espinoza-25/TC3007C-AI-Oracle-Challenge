from flask import Blueprint, current_app, request, jsonify
from app.services.db.metadata import list_tables

meta = Blueprint("meta", __name__, url_prefix="/meta")
"""
Routes for metadata information

Endpoints:
- GET /meta/tables
"""

@meta.get("/tables")
def get_tables():
    """
    GET /meta/tables?schema=ADMIN&include_views=true
    """
    schema = request.args.get("schema")
    include_views = request.args.get("include_views", "false").lower() == "true"

    try:
        pool = current_app.config["DB_POOL"]
        data = list_tables(pool, schema=schema, include_views=include_views)
        return jsonify({"ok": True, **data}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
