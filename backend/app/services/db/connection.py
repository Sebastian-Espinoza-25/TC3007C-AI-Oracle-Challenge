import os
from dotenv import load_dotenv
import oracledb

load_dotenv()

# Connection configuration
DB_USER = os.getenv("DB_USER", "ADMIN")
DB_PASSWORD = os.getenv("DB_PASSWORD")
CONNECT_STRING = os.getenv("DB_ALIAS", "oraclechallenge_medium")

TNS_ADMIN = os.getenv("TNS_ADMIN")
WALLET_LOCATION = os.getenv("WALLET_LOCATION")
WALLET_PASSWORD = os.getenv("WALLET_PASSWORD")

def create_pool():
    """
    Creates a pool of connections to use in Flask.
    """
    pool_kwargs = {
        "user": DB_USER,
        "password": DB_PASSWORD,
        "dsn": CONNECT_STRING,
    }

    # Wallet Thin mode
    if TNS_ADMIN:
        pool_kwargs["config_dir"] = TNS_ADMIN
    if WALLET_LOCATION:
        pool_kwargs["wallet_location"] = WALLET_LOCATION
    if WALLET_PASSWORD:
        pool_kwargs["wallet_password"] = WALLET_PASSWORD

    pool = oracledb.create_pool(**pool_kwargs)
    print("Oracle connection pool created successfully.")
    return pool


def test_connection():
    """
    Quick test to verify connection to db
    """
    try:
        pool = create_pool()
        with pool.acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 FROM DUAL")
                result = cursor.fetchone()
                print(f"Connected successfully! Query result: {result[0]}")
    except Exception as e:
        print(f" Connection failed: {e}")
