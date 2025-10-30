from flask import Blueprint, current_app, jsonify

main = Blueprint('main', __name__)

@main.route('/')
def home():
    return "Welcome to the Flask Backend!"

@main.route("/health/db")
def health_db():
    try:
        pool = current_app.config["DB_POOL"]
        with pool.acquire() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM DUAL")
                val = cur.fetchone()[0]
        return jsonify(ok=True, db=val), 200
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500
