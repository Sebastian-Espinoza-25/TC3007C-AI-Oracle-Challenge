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
OCI_GENAI_IDEATOR_MODEL_ID = os.getenv("OCI_GENAI_IDEATOR_MODEL_ID")
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
TARGET AS HINT
- Target product (query): {user_text}.
- If target = "", set the SINGLE most visible sellable product in the image as the target.
- If target does not have a product, set the SINGLE most visible sellable product in the image as the target.
- Treat the target as a hint of what the user is looking for, NOT as the answer.
- Identify the SINGLE most visible sellable product in the image.
- If that product matches the target exactly, set target_found to true.
- If that product is a close variant of the target (e.g., target=sweater but image shows cardigan/hoodie/jumper), set target_found to true BUT use the OBSERVED product type name.
- Ignore the rest of the clothing items and never mention them.

RULES
- Describe only what is clearly visible. No hedging (never write “appears”, “seems”, “likely”, “approximately”, “may/could be”).
- UK English spelling (moulded, elasticated, zip, colour).
- One sellable product per response (if a pair or multipack, treat it as a single product).
- Keep description 2–3 sentences (minimum 2 full sentences, ≤ ~60 words total); only the target object, lead with colour, then material/construction and notable features and specific details, maintaining a factual neutral tone.

NEVER MENTION
- other garments
- how it is worn (e.g., tucked in, layered)
- any pairing or styling language

CATALOG FIELDS
Provide the same catalog keys but use free-form labels that accurately describe what is visible instead of selecting from fixed vocabularies.
- product_type_name:
  [ "Top","Shirt","T-shirt","Sweater","Hoodie","Jacket","Coat","Dress","Skirt","Trousers","Jeans",
    "Shorts","Leggings/Tights","Socks","Underwear","Bra","Shoes","Bag","Belt","Hat","Scarf",
    "Gloves","Sunglasses","Watch",etc]
- product_group_name:
  [ "Garment Upper body","Garment Lower body","Socks & Tights","Underwear","Footwear","Accessories","Nightwear","Bags","Furniture","Cosmetic","Swimwear",etc]
- graphical_appearance_name:
  [ "Solid","Stripe","All over pattern","Melange","Printed text/logo","Colour block","Denim","Argyle","Dot","Mesh","Contrast","Jacquard","Metallic","Neps","Check",etc]
- colour_group_name:
  [ "Black","White","Off White","Light Beige","Beige","Grey","Light Grey","Dark Grey","Light Blue",
    "Blue","Dark Blue","Navy","Green","Light Green","Dark Green","Yellow","Orange","Red",
    "Pink","Purple","Brown","Burgundy","Multi",etc]
- index_group_name:
  [ "Ladieswear","Ladies Accessories","Menswear","Baby","Children","Divided","Sport","Lingeries/Tight",etc]

OUTPUT
- Return *only* a single JSON object, no prose, no markdown. Keys exactly:
{{
  "description": "...",
  "product_type_name": "...",
  "product_group_name": "...",
  "graphical_appearance_name": "...",
  "colour_group_name": "...",
  "index_group_name": "...",
  "target_found": "..."
}}
- If a value cannot be confirmed, respond with "unknown" for that field. Never add extra keys.
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
