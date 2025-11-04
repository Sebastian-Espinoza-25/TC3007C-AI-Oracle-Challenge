import os
import uuid
from datetime import datetime, timedelta

import oci

OCI_CONFIG_FILE = os.getenv("OCI_CONFIG_FILE", r"C:\Users\sebes\.oci\config")
OCI_PROFILE     = os.getenv("OCI_PROFILE", "DEFAULT")
OCI_NAMESPACE   = os.getenv("OCI_NAMESPACE")           
OCI_BUCKET      = os.getenv("OCI_BUCKET")              
OCI_REGION      = os.getenv("OCI_REGION")              

_config = oci.config.from_file(OCI_CONFIG_FILE, OCI_PROFILE)
_obj = oci.object_storage.ObjectStorageClient(_config)

def ping():
    """
    Verifies:
      1) namespace accesible (get_namespace),
      2) bucket exists (get_bucket),
      3) lists 1 object.
    """
    ns = _obj.get_namespace().data
    # get bucket
    bucket = _obj.get_bucket(ns, OCI_BUCKET).data

    # list 1 object
    objs = _obj.list_objects(ns, OCI_BUCKET, limit=1).data.objects
    sample = objs[0].name if objs else None

    return {
        "namespace": ns,
        "bucket": bucket.name,
        "region": _config["region"],
        "sample_object": sample,
    }

def put_test_object():
    """Sube un mini objeto de prueba (texto) para validar escritura."""
    ns = _obj.get_namespace().data
    name = f"health/ok-{uuid.uuid4()}.txt"
    body = f"[{datetime.utcnow().isoformat()}Z] health check OK"
    resp = _obj.put_object(
        ns, OCI_BUCKET, name, body.encode("utf-8"),
        content_type="text/plain; charset=utf-8",
        cache_control="no-store"
    )
    return {"object_name": name, "etag": getattr(resp, "etag", None)}

def presigned_url(object_name: str, minutes: int = 10) -> str:
    """Generates a presigned URL (PAR) for the given object valid for `minutes`."""
    ns = _obj.get_namespace().data
    details = oci.object_storage.models.CreatePreauthenticatedRequestDetails(
        name=f"read-{uuid.uuid4()}",
        access_type="ObjectRead",  # Object PAR
        time_expires=datetime.utcnow() + timedelta(minutes=minutes),
        object_name=object_name,
    )
    par = _obj.create_preauthenticated_request(
        namespace_name=ns,
        bucket_name=OCI_BUCKET,
        create_preauthenticated_request_details=details,
    ).data

    # endpoint 
    endpoint = _obj.base_client.endpoint.rstrip("/")
    # full URL
    return f"{endpoint}{par.access_uri}"


# --- Helpers ---
def key_from_external_id(external_id: str) -> str:
    """Builds deterministic key: products/<primeros3>/<id>.jpg"""
    return f"products/{external_id[:3]}/{external_id}.jpg"

def object_exists(object_key: str) -> bool:
    """HEAD to avoid death."""
    ns = _obj.get_namespace().data
    try:
        _obj.head_object(ns, OCI_BUCKET, object_key)
        return True
    except oci.exceptions.ServiceError as e:
        if getattr(e, "status", None) == 404:
            return False
        raise  

def par_for_external_id(external_id: str, minutes: int = 10, verify: bool = True) -> str | None:
    """Generates PAR for id If verify and not exists, returns None."""
    key = key_from_external_id(external_id)
    if verify and not object_exists(key):
        return None
    return presigned_url(key, minutes)

def par_for_external_ids(ids: list[str], minutes: int = 10, verify: bool = True) -> dict[str, str | None]:
    """Simple batch for multiple ids."""
    out: dict[str, str | None] = {}
    for eid in ids:
        out[eid] = par_for_external_id(eid, minutes=minutes, verify=verify)
    return out
