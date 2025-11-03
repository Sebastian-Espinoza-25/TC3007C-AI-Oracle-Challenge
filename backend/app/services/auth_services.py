from werkzeug.security import generate_password_hash, check_password_hash
from app.services.db.connection import create_pool

pool = create_pool()  # crea el pool UNA sola vez

USER_COLS = [
    "user_id","email","password_hash","role","age","name",
    "notifications","postal_code","first_time","address"
]

def _row_to_user_dict(row):
    if not row:
        return None
    d = dict(zip(USER_COLS, row))
    for k in ("notifications","first_time"):
        v = d.get(k)
        if isinstance(v, bytes):
            v = v.decode()
        if isinstance(v, str):
            d[k] = v.strip()
    return d

def email_exists(email: str) -> bool:
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM app_user WHERE email = :1", [email])
            return cur.fetchone() is not None

def get_user_by_id(user_id: int):
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT user_id, email, password_hash, role, age, name,
                       notifications, postal_code, first_time, address
                FROM app_user
                WHERE user_id = :1
            """, [user_id])
            u = _row_to_user_dict(cur.fetchone())
            if not u:
                return None
            u.pop("password_hash", None)
            return u

def get_user_by_email(email: str):
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT user_id, email, password_hash, role, age, name,
                       notifications, postal_code, first_time, address
                FROM app_user
                WHERE email = :1
            """, [email])
            return _row_to_user_dict(cur.fetchone())

def create_user(user_data: dict):
    required = ("email","password")
    for f in required:
        if not user_data.get(f):
            raise ValueError(f"Campo requerido: {f}")

    email = user_data["email"].strip().lower()
    if email_exists(email):
        return {"conflict": True, "message": "El email ya está registrado"}

    pwd_hash = generate_password_hash(user_data["password"])

    params = {
        "email": email,
        "password_hash": pwd_hash,
        "role": user_data.get("role","user"),
        "age": user_data.get("age"),
        "name": user_data.get("name"),
        "notifications": user_data.get("notifications","N"),
        "postal_code": user_data.get("postal_code"),
        "first_time": user_data.get("first_time","Y"),
        "address": user_data.get("address"),
    }

    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO app_user
                    (email, password_hash, role, age, name,
                     notifications, postal_code, first_time, address)
                VALUES
                    (:1, :2, :3, :4, :5, :6, :7, :8, :9)
            """, [
                params["email"], params["password_hash"], params["role"],
                params["age"], params["name"], params["notifications"],
                params["postal_code"], params["first_time"], params["address"]
            ])
            conn.commit()

            cur.execute("""
                SELECT user_id, email, password_hash, role, age, name,
                       notifications, postal_code, first_time, address
                FROM app_user
                WHERE email = :1
            """, [email])
            u = _row_to_user_dict(cur.fetchone())
            u.pop("password_hash", None)
            return u

def authenticate(email: str, password: str):
    if not email or not password:
        return None
    email = email.strip().lower()

    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT user_id, email, password_hash, role, age, name,
                       notifications, postal_code, first_time, address
                FROM app_user
                WHERE email = :1
            """, [email])
            full = _row_to_user_dict(cur.fetchone())

    if not full:
        return None

    pwd_hash = full.get("password_hash")
    if pwd_hash and check_password_hash(pwd_hash, password):
        full.pop("password_hash", None)
        return full

    # Fallback temporal (idealmente elimínalo si no lo necesitas):
    if full.get("password_hash") == password:
        full.pop("password_hash", None)
        return full

    return None
