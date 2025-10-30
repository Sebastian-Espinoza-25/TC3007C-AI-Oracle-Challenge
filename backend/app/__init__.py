from flask import Flask
from .routes.main_routes import main
from .routes.meta_routes import meta
from .services.db.connection import create_pool

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config.from_object('app.config.Config')

    # Create once DB connection pool
    app.config["DB_POOL"] = create_pool()

    # Register Blueprints
    app.register_blueprint(main)
    app.register_blueprint(meta)

    return app