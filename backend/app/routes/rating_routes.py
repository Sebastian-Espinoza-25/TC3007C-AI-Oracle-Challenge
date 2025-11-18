from flask import Blueprint, request, jsonify, current_app
from app.services import ratings_services as svc

ratings_bp = Blueprint("ratings", __name__, url_prefix="/ratings")

@ratings_bp.post("/")
def create_or_update_rating():
    """
    POST /ratings/
    Body JSON:
    {
      "user_id": 123,              # luego lo sustituyes por el que venga del JWT
      "article_id": "0549262001",
      "rating": 4,
      "review_text": "Me encantó la tela"
    }
    """
    data = request.get_json() or {}
    user_id = data.get("user_id")   # TODO: tomarlo de auth
    article_id = data.get("article_id")
    rating = data.get("rating")
    review_text = data.get("review_text")

    if not user_id or not article_id or rating is None:
        return jsonify({"error": "user_id, article_id y rating son obligatorios"}), 400

    try:
        rating = int(rating)
    except ValueError:
        return jsonify({"error": "rating debe ser entero 1-5"}), 400

    if rating < 1 or rating > 5:
        return jsonify({"error": "rating debe estar entre 1 y 5"}), 400

    pool = current_app.config["DB_POOL"]

    try:
        row = svc.upsert_rating(pool, user_id=user_id,
                                article_id=article_id,
                                rating=rating,
                                review_text=review_text)
    except Exception as e:
        return jsonify({"error": f"Error al guardar rating: {e}"}), 500

    return jsonify({"rating": row}), 200

@ratings_bp.get("/<string:article_id>")
def list_ratings(article_id: str):
    """
    GET /ratings/<article_id>?limit=20&offset=0
    """
    try:
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return jsonify({"error": "limit/offset deben ser enteros"}), 400

    pool = current_app.config["DB_POOL"]
    data = svc.list_ratings_for_article(pool, article_id, limit=limit, offset=offset)
    summary = svc.get_rating_summary_for_article(pool, article_id)

    data["summary"] = summary
    return jsonify(data), 200
