# app/routes/preferences_routes.py
from flask import Blueprint, request, jsonify
from app.services import preferences_services as svc

preferences_bp = Blueprint("preferences", __name__)

@preferences_bp.post("/users/<int:user_id>/prefs/onboarding")
def prefs_onboarding(user_id: int):
    data = request.get_json(silent=True) or {}
    likes = data.get("likes") or []
    if not isinstance(likes, list) or not likes:
        return jsonify({"error": "Debes enviar 'likes': [external_article_id, ...]"}), 400
    updated = svc.record_from_article_ids(user_id, [str(x) for x in likes], event="onboarding")
    return jsonify({
        "updated": updated,
        "first_time": "N"
    }), 200


@preferences_bp.post("/users/<int:user_id>/prefs/purchase")
def prefs_purchase(user_id: int):
    data = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    if not order_id:
        return jsonify({"error": "Debes enviar 'order_id'"}), 400
    updated = svc.record_from_order(user_id, int(order_id))
    return jsonify({"updated": updated}), 200

@preferences_bp.get("/users/<int:user_id>/prefs")
def prefs_get(user_id: int):
    profile = svc.get_user_profile(user_id)
    return jsonify({"user_id": user_id, "profile": profile}), 200

@preferences_bp.delete("/users/<int:user_id>/prefs")
def prefs_reset(user_id: int):
    svc.reset_user_profile(user_id)
    return jsonify({"reset": True}), 200
