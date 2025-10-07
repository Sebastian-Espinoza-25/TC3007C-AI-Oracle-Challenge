from flask import Flask
from .routes.main_routes import main

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config.from_object('app.config.Config')

    # Register Blueprints
    app.register_blueprint(main)

    return app