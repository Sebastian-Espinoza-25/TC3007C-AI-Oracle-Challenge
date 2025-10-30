import os
from dotenv import load_dotenv

# Cargar variables del archivo .env
load_dotenv()

class Config:
    # === Configuración de la base de datos (Oracle Cloud) ===
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_ALIAS = os.getenv("DB_ALIAS", "oraclechallenge_medium")  # nombre del servicio en el tnsnames.ora
    TNS_ADMIN = os.getenv("TNS_ADMIN")  # ruta al wallet (por ejemplo: ./Wallet_OracleChallenge)
    WALLET_LOCATION = os.getenv("WALLET_LOCATION")  # opcional si usas thin mode
    WALLET_PASSWORD = os.getenv("WALLET_PASSWORD")  # opcional si el wallet está cifrado

    # === Configuración de Flask / JWT ===
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))  # 1 hora
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 2592000))  # 30 días
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
