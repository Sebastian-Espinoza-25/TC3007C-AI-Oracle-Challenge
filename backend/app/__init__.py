from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import timedelta
from .config import Config
from .routes.main_routes import main
from .routes.meta_routes import meta
from .routes.object_storage_routes import storage_bp
from .routes.auth_routes import auth_bp
from .routes.catalog_routes import catalog_bp
from .routes.cart_routes import cart_bp
from .services.db.connection import create_pool

def create_app():
    app = Flask(__name__)

    # Base config
    app.config.from_object(Config)

    # Database pool connection
    app.config["DB_POOL"] = create_pool()

    # JWT Config
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(seconds=Config.JWT_REFRESH_TOKEN_EXPIRES)

    # Inicialización de extensiones
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Blueprints 
    app.register_blueprint(main)
    app.register_blueprint(meta)
    app.register_blueprint(storage_bp, url_prefix="/api/storage")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(catalog_bp, url_prefix="/api/catalog")
    app.register_blueprint(cart_bp, url_prefix="/api/cart")



    # Base route
    @app.route("/")
    def index():
        return {
            "message": "Backend Viora corriendo 🚀",
            "routes": {
                "meta": {
                    "tables": "GET /meta/tables",
                    "table_rows": "GET /meta/table_rows?table=<table_name>"
                },
                "auth": {
                    "register": "POST /api/auth/register",
                    "login": "POST /api/auth/login",
                    "me": "GET /api/auth/me",
                    "refresh": "POST /api/auth/refresh"
                },
                "catalog": {
                    "list_catalog": "GET /api/catalog/?q=<query>&limit=<limit>&offset=<offset>",
                    "product_detail": "GET /api/catalog/<external_article_id>"    
                },
                "cart": {
                    "get_cart": "GET /api/cart/",
                    "add_item": "POST /api/cart/items",
                    "update_item": "PATCH /api/cart/items/<external_article_id>",
                    "remove_item": "DELETE /api/cart/items/<external_article_id>",
                    "clear_cart": "DELETE /api/cart/"
                }
            
        }
    }, 200

    return app
