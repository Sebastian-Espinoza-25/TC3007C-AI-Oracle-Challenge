# app/routes/ideator_agent_routes.py

from flask import Blueprint, request, jsonify

from app.services.ideator_vision_service import (
    describe_image_with_oci,
)

from app.services.ideator_recommender_services import (
    get_recommendations_from_json,
)

ideator_agent_bp = Blueprint("ideator_agent", __name__)


@ideator_agent_bp.post("/image")
def analyze_image():
    if "image" not in request.files:
        return jsonify({"error": "Missing image file"}), 400

    image_file = request.files["image"]
    img_bytes = image_file.read()

    user_text = request.form.get("text", "")

    # 1) Vision Agent
    vision_json = describe_image_with_oci(img_bytes, user_text)

    # 2) Cluster Recommender
    rec_ids = get_recommendations_from_json(vision_json, k=10)

    return jsonify({
        "vision": vision_json,
        "recommendations": rec_ids
    }), 200
