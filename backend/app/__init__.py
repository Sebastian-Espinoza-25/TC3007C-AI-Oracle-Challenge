from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import timedelta
from .config import Config
from .routes.main_routes import main
from .routes.meta_routes import meta
from .routes.auth_routes import auth_bp
from .services.db.connection import create_pool

def create_app():
    app = Flask(__name__)

    # === Configuración base ===
    app.config.from_object(Config)

    # === Pool Oracle (se crea una sola vez y se guarda en config) ===
    app.config["DB_POOL"] = create_pool()

    # === JWT Config ===
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(seconds=Config.JWT_REFRESH_TOKEN_EXPIRES)

    # === Inicialización de extensiones ===
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # === Registro de Blueprints ===
    app.register_blueprint(main)
    app.register_blueprint(meta)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    # === Ruta base para verificar que el backend corre ===
    @app.route("/")
    def index():
        return {
            "message": "Backend Viora corriendo 🚀",
            "routes": {
                "auth": {
                    "register": "POST /api/auth/register",
                    "login": "POST /api/auth/login",
                    "me": "GET /api/auth/me",
                    "refresh": "POST /api/auth/refresh"
                }
            }
        }

    return app
