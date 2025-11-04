import os
from dotenv import load_dotenv

# .env
load_dotenv()

class Config:
    # === (Oracle Cloud) ===
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_ALIAS = os.getenv("DB_ALIAS", "oraclechallenge_medium")
    TNS_ADMIN = os.getenv("TNS_ADMIN")
    WALLET_LOCATION = os.getenv("WALLET_LOCATION")
    WALLET_PASSWORD = os.getenv("WALLET_PASSWORD")

    # === Flask / JWT ===
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 2592000))
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"

    # === Stripe ===
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLIC_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

    # === Email (SMTP) ===
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")