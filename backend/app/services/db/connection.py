import os
from dotenv import load_dotenv
import oracledb
load_dotenv()

# DB USER and PASSWORD
DB_USER = os.getenv("DB_USER", "ADMIN")
DB_PASSWORD = os.getenv("DB_PASSWORD")  

# TNS ALIAS or default
CONNECT_STRING = os.getenv("DB_ALIAS", "oraclechallenge_medium")

# WALLET Settings
TNS_ADMIN = os.getenv("TNS_ADMIN")               
WALLET_LOCATION = os.getenv("WALLET_LOCATION")   
WALLET_PASSWORD = os.getenv("WALLET_PASSWORD")   

def run_app():
    try:

        # Connection pool parameters
        pool_kwargs = {
            "user": DB_USER,
            "password": DB_PASSWORD,
            "dsn": CONNECT_STRING,
        }

        # If using a wallet with TNS_ADMIN
        if TNS_ADMIN:
            pool_kwargs["config_dir"] = TNS_ADMIN

        # THIN mode
        if WALLET_LOCATION:
            pool_kwargs["wallet_location"] = WALLET_LOCATION
        if WALLET_PASSWORD:
            pool_kwargs["wallet_password"] = WALLET_PASSWORD

        pool = oracledb.create_pool(**pool_kwargs)

        with pool.acquire() as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 FROM DUAL")
                result = cursor.fetchone()
                if result:
                    print(f"Connected successfully! Query result: {result[0]}")
    except oracledb.Error as e:
        print(f"Could not connect to the database - Error occurred: {str(e)}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_app()
