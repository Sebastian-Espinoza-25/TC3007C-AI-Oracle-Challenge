import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_ALIAS = os.getenv("DB_ALIAS", "oraclechallenge_medium")
    TNS_ADMIN = os.getenv("TNS_ADMIN")              # ruta del wallet (config_dir)
    WALLET_LOCATION = os.getenv("WALLET_LOCATION")  # (thin)
    WALLET_PASSWORD = os.getenv("WALLET_PASSWORD")  # (thin)
