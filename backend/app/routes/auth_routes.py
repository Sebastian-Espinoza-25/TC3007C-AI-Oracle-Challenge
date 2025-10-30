# app/routes/auth_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity
)
from ..services import auth_services as Auth

auth_bp = Blueprint("auth", __name__)

def _identity_payload(user: dict):
    # Lo que va dentro del JWT
    return {"id": user["user_id"], "role": user.get("role", "user"), "email": user.get("email")}

@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "email y password son requeridos"}), 400

    try:
        created = Auth.create_user(data)
        if isinstance(created, dict) and created.get("conflict"):
            return jsonify({"error": created["message"]}), 409

        ident = _identity_payload(created)
        access_token  = create_access_token(identity=ident, additional_claims=ident)
        refresh_token = create_refresh_token(identity=ident)

        return jsonify({
            "user": created,
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Error al registrar: {str(e)}"}), 500

@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email y password son requeridos"}), 400

    try:
        user = Auth.authenticate(email, password)
        if not user:
            return jsonify({"error": "Credenciales inválidas"}), 401

        ident = _identity_payload(user)
        access_token  = create_access_token(identity=ident, additional_claims=ident)
        refresh_token = create_refresh_token(identity=ident)

        return jsonify({
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token
        })
    except Exception as e:
        return jsonify({"error": f"Error en login: {str(e)}"}), 500

@auth_bp.get("/me")
@jwt_required()
def me():
    ident = get_jwt_identity()  # {"id", "role", "email"?}
    uid = ident.get("id")
    try:
        user = Auth.get_user_by_id(uid)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        return jsonify({"user": user})
    except Exception as e:
        return jsonify({"error": f"Error al obtener perfil: {str(e)}"}), 500

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    ident = get_jwt_identity()
    access_token = create_access_token(identity=ident, additional_claims=ident)
    return jsonify({"access_token": access_token})
