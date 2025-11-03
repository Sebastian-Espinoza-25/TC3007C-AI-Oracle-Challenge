from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required, get_jwt_identity
)
from ..services import auth_services as Auth

auth_bp = Blueprint("auth", __name__)

def _claims_from_user(user: dict) -> dict:
    """
    Extra claims que queremos dentro del JWT (no como identity).
    """
    return {
        "id": user["user_id"],
        "role": user.get("role", "user"),
        "email": user.get("email"),
    }

@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "email y password son requeridos"}), 400

    try:
        created = Auth.create_user(data)
        if isinstance(created, dict) and created.get("conflict"):
            return jsonify({"error": created["message"]}), 409

        claims = _claims_from_user(created)
        user_id_str = str(created["user_id"])  # identity debe ser string

        access_token  = create_access_token(identity=user_id_str, additional_claims=claims)
        refresh_token = create_refresh_token(identity=user_id_str)

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

        claims = _claims_from_user(user)
        user_id_str = str(user["user_id"])

        access_token  = create_access_token(identity=user_id_str, additional_claims=claims)
        refresh_token = create_refresh_token(identity=user_id_str)

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
    # identity es el user_id como string
    uid_str = get_jwt_identity()
    try:
        user = Auth.get_user_by_id(int(uid_str))
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        return jsonify({"user": user})
    except Exception as e:
        return jsonify({"error": f"Error al obtener perfil: {str(e)}"}), 500

@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    uid_str = get_jwt_identity()  # viene del refresh token
    # Puedes volver a cargar al usuario para reconstruir claims, o reciclar solo el id:
    try:
        user = Auth.get_user_by_id(int(uid_str))
        claims = _claims_from_user(user) if user else {"id": int(uid_str)}
        new_access = create_access_token(identity=uid_str, additional_claims=claims)
        return jsonify({"access_token": new_access})
    except Exception as e:
        return jsonify({"error": f"Error al refrescar token: {str(e)}"}), 500
