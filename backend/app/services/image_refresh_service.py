import oracledb
from datetime import datetime, timedelta
from typing import List, Set, Dict

from app.services.object_storage_service import (
    key_from_external_id,
    presigned_url,
    _obj,
    OCI_BUCKET
)

# Obtener TODAS las keys del bucket
def list_all_object_keys() -> Set[str]:
    ns = _obj.get_namespace().data
    keys = set()
    next_start = None

    while True:
        resp = _obj.list_objects(
            ns,
            OCI_BUCKET,
            start_after=next_start,
            limit=1000
        ).data

        for obj in resp.objects:
            keys.add(obj.name)

        if not resp.next_start_with:
            break

        next_start = resp.next_start_with

    return keys


# Generar PAR solo si el objeto existe y no está en BD
def _generate_par(eid: str, days: int, valid_keys: Set[str], skip_existing: bool, existing_url: str | None):
    if skip_existing and existing_url:
        return eid, existing_url

    key = key_from_external_id(eid)
    if key not in valid_keys:
        return eid, None

    url = presigned_url(key, minutes=days * 1440)
    return eid, url


# ================================
# REFRESH CON OFFSET
# ================================
def refresh_all_image_urls(pool, days_valid=30, limit=None, offset=0, skip_existing=True):
    updated = 0
    processed = 0
    skipped = 0

    with pool.acquire() as conn, conn.cursor() as cur:

        sql = f"""
            SELECT external_article_id
            FROM catalog
            WHERE (image_url IS NULL OR :skip_existing = 0)
            ORDER BY db_article_id
            OFFSET :offset ROWS
            FETCH NEXT :limit ROWS ONLY
        """

        cur.execute(sql, {
            "skip_existing": 1 if skip_existing else 0,
            "offset": offset,
            "limit": limit
        })

        batch = []
        BATCH_SIZE = 500

        for row in cur:
            eid = row[0]
            processed += 1
            batch.append(eid)

            if len(batch) >= BATCH_SIZE:
                updated_count = _process_batch(conn, batch, days_valid)
                updated += updated_count
                batch = []

        if batch:
            updated_count = _process_batch(conn, batch, days_valid)
            updated += updated_count

    return {
        "processed": processed,
        "updated": updated,
        "skipped": skipped
    }


# Procesa un batch de 500
def _process_batch(conn, batch_ids, days_valid):
    pars = {}

    print(f"[refresh] Generating PARs for batch of {len(batch_ids)} items...")

    for eid in batch_ids:
        key = key_from_external_id(eid)
        try:
            url = presigned_url(key, minutes=days_valid * 1440)
        except Exception:
            url = None
        pars[eid] = url

    with conn.cursor() as cur:
        cur.executemany("""
            UPDATE catalog
            SET image_url = :url
            WHERE external_article_id = :eid
        """, [{"url": pars[e], "eid": e} for e in batch_ids])

        conn.commit()

    print(f"[refresh] Batch completed → {len(batch_ids)} updated.")
    return len(batch_ids)
