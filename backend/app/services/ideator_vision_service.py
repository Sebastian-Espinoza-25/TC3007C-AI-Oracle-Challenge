# app/services/ideator_agent/ideator_vision_service.py

import os
import base64
import json
import mimetypes
import oci
import re
import time
from langchain_core.messages import HumanMessage
from langchain_community.chat_models import ChatOCIGenAI

OCI_COMPARTMENT_ID = os.getenv("OCI_COMPARTMENT_ID")
OCI_GENAI_IDEATOR_MODEL_ID = os.getenv("OCI_GENAI_MODEL_ID")
OCI_GENAI_ENDPOINT = os.getenv(
    "OCI_GENAI_ENDPOINT",
    "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com"
)

if not OCI_COMPARTMENT_ID:
    raise RuntimeError("Missing environment variable: OCI_COMPARTMENT_ID")

if not OCI_GENAI_IDEATOR_MODEL_ID:
    raise RuntimeError("Missing environment variable: OCI_GENAI_MODEL_ID")

config = oci.config.from_file("~/.oci/config", "DEFAULT")

llm = ChatOCIGenAI(
    model_id=OCI_GENAI_IDEATOR_MODEL_ID,
    service_endpoint=OCI_GENAI_ENDPOINT,
    compartment_id=OCI_COMPARTMENT_ID,
    provider="meta",
    model_kwargs={
        "temperature": 0.2,
        "top_p": 0.8,
        "top_k": 0,
        "max_tokens": 500,
    },
)

FALLBACK = {
    "description": "",
    "product_type_name": "",
    "product_group_name": "",
    "graphical_appearance_name": "",
    "colour_group_name": "",
    "index_group_name": ""
}


def _extract_json(s: str):
    s = s.strip()
    try:
        return json.loads(s)
    except:
        pass

    matches = re.findall(r"\{[\s\S]*?\}", s)
    for m in matches[::-1]:
        try:
            return json.loads(m)
        except:
            continue
    return None


def _looks_bad(s: str) -> bool:
    s = s.strip()
    if not s or "{" not in s or "}" not in s:
        return True
    punct = sum(ch in "!?*-=_" for ch in s)
    return punct / max(1, len(s)) > 0.65


def build_prompt(user_text: str):
    return f"""
Extract catalog information for the SINGLE most visible sellable fashion product in the image.

Rules:
- Describe only what is visible.
- UK English spelling.
- 2–3 sentences max.
- Natural-language values.
- No extra products.
- Neutral tone.

Return ONLY a JSON object with these EXACT keys:

{{
  "description": "...",
  "product_type_name": "...",
  "product_group_name": "...",
  "graphical_appearance_name": "...",
  "colour_group_name": "...",
  "index_group_name": "..."
}}
"""


def describe_image_with_oci(image_bytes: bytes, text: str = "") -> dict:
    mime = mimetypes.guess_type("img.jpg")[0] or "image/jpeg"
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime};base64,{img_b64}"

    prompt = build_prompt(text)

    msg = HumanMessage(content=[
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": data_url}},
    ])

    for attempt in range(5):
        try:
            resp = llm.invoke([msg], response_format={"type": "json_object"})
        except Exception:
            resp = llm.invoke([msg])

        raw = resp.content

        if isinstance(raw, list):
            raw = "".join(
                part.get("text", str(part)) if isinstance(part, dict) else str(part)
                for part in raw
            )

        raw = str(raw)

        if not _looks_bad(raw):
            parsed = _extract_json(raw)
            if parsed:
                return {
                    "description": parsed.get("description", ""),
                    "product_type_name": parsed.get("product_type_name", ""),
                    "product_group_name": parsed.get("product_group_name", ""),
                    "graphical_appearance_name": parsed.get("graphical_appearance_name", ""),
                    "colour_group_name": parsed.get("colour_group_name", ""),
                    "index_group_name": parsed.get("index_group_name", "")
                }

        time.sleep(0.2)

    return FALLBACK.copy()
