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
    Verifica:
      1) namespace accesible,
      2) bucket existe (get_bucket),
      3) (opcional) lista 1 objeto si hay.
    """
    ns = _obj.get_namespace().data
    # get_bucket falla si no existe o no tienes permiso
    bucket = _obj.get_bucket(ns, OCI_BUCKET).data

    # intentamos listar 1 objeto, por si ya hay algo
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
    """Crea una URL firmada (PAR) de lectura para el objeto dado."""
    ns = _obj.get_namespace().data
    details = oci.object_storage.models.CreatePreauthenticatedRequestDetails(
        name=f"read-{uuid.uuid4()}",
        access_type="ObjectRead",
        time_expires=datetime.utcnow() + timedelta(minutes=minutes),
        object_name=object_name,
    )
    par = _obj.create_preauthenticated_request(
        namespace_name=ns,
        bucket_name=OCI_BUCKET,
        create_preauthenticated_request_details=details,
    ).data
    endpoint = f"https://objectstorage.{_config['region']}.oraclecloud.com"
    return f"{endpoint}/n/{ns}/b/{OCI_BUCKET}/p/{par.id}"
