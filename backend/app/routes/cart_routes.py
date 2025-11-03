from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services import cart_services as svc

# Blueprint for cart routes
cart_bp = Blueprint("cart", __name__, url_prefix="/cart")

# Helper function to get user ID from JWT
def _uid():
    claims = get_jwt()  # extra claims
    uid = claims.get("id")
    if uid is not None:
        return uid
    # fallback
    ident = get_jwt_identity()
    try:
        return int(ident)
    except (TypeError, ValueError):
        return ident

# Route to get current user's cart
@cart_bp.get("/")
@jwt_required()
def get_cart():
    pool = current_app.config["DB_POOL"]
    data = svc.get_cart(pool, _uid())
    return jsonify(data), 200

# Route to add item to cart
@cart_bp.post("/items")
@jwt_required()
def add_item():
    body = request.get_json(silent=True) or {}
    article_id = body.get("article_id")
    qty = int(body.get("quantity", 1))
    if not article_id or qty <= 0:
        return jsonify({"error": "article_id y quantity>0 son requeridos"}), 400

    pool = current_app.config["DB_POOL"]
    out = svc.add_item(pool, _uid(), article_id, qty)
    if out.get("error"):
        return jsonify(out), 400
    return jsonify(out), 201

# Route to update item quantity in cart
@cart_bp.patch("/items/<string:article_id>")
@jwt_required()
def update_item(article_id: str):
    body = request.get_json(silent=True) or {}
    qty = body.get("quantity")
    if qty is None:
        return jsonify({"error": "quantity es requerido"}), 400
    qty = int(qty)

    pool = current_app.config["DB_POOL"]
    out = svc.update_item(pool, _uid(), article_id, qty)
    code = 200 if not out.get("error") else 400
    return jsonify(out), code

# Route to remove item from cart
@cart_bp.delete("/items/<string:article_id>")
@jwt_required()
def remove_item(article_id: str):
    pool = current_app.config["DB_POOL"]
    out = svc.remove_item(pool, _uid(), article_id)
    code = 200 if not out.get("error") else 400
    return jsonify(out), code

# Route to clear the cart
@cart_bp.delete("/")
@jwt_required()
def clear_cart():
    pool = current_app.config["DB_POOL"]
    out = svc.clear_cart(pool, _uid())
    return jsonify(out), 200
