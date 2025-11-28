# app/services/ideator_text_service.py

import os
import json
import re
import oci

# ============================================
# Load OCI config
# ============================================
OCI_CONFIG = oci.config.from_file(os.path.expanduser("~/.oci/config"), "DEFAULT")
COMPARTMENT_ID = os.getenv("OCI_COMPARTMENT_ID")
ENDPOINT = os.getenv("OCI_GENAI_ENDPOINT")

# ⚠️ USAR EL MODELO DE TEXTO, NO EL DE VISIÓN
MODEL_ID = os.getenv("OCI_GENAI_MODEL_ID")

if not COMPARTMENT_ID:
    raise RuntimeError("Missing OCI_COMPARTMENT_ID")
if not MODEL_ID:
    raise RuntimeError("Missing OCI_GENAI_MODEL_ID")

client = oci.generative_ai_inference.GenerativeAiInferenceClient(
    config=OCI_CONFIG,
    service_endpoint=ENDPOINT,
    retry_strategy=oci.retry.NoneRetryStrategy(),
    timeout=(10, 120),
)

# ============================================
# VALID VALUES (REAL LISTS)
# ============================================

VALID_PRODUCT_TYPES = [
    "Top","Shirt","T-shirt","Sweater","Hoodie","Jacket","Coat",
    "Dress","Skirt","Trousers","Jeans","Shorts","Leggings/Tights",
    "Socks","Underwear","Bra","Shoes","Bag","Belt",
    "Hat","Scarf","Gloves","Sunglasses","Watch"
]

VALID_PRODUCT_GROUPS = [
    "Garment Upper body","Garment Lower body","Socks & Tights","Underwear",
    "Footwear","Accessories","Nightwear","Bags","Furniture",
    "Cosmetic","Swimwear"
]

VALID_GRAPHICAL = [
    "Solid","Stripe","All over pattern","Melange","Printed text/logo",
    "Colour block","Denim","Argyle","Dot","Mesh","Contrast","Jacquard",
    "Metallic","Neps","Check"
]

VALID_COLOURS = [
    "Black","White","Off White","Light Beige","Beige","Grey","Light Grey",
    "Dark Grey","Light Blue","Blue","Dark Blue","Navy","Green","Light Green",
    "Dark Green","Yellow","Orange","Red","Pink","Purple","Brown","Burgundy"
]

VALID_INDEX_GROUPS = [
    "Ladieswear","Ladies Accessories","Menswear","Baby","Children","Divided",
    "Sport","Lingeries/Tight"
]

# ============================================
# SYSTEM PROMPT — FIXED
# ============================================

SYSTEM_PROMPT = f"""
You are ATELLIER. You classify retail fashion products.

You may receive messages that ask for a type of product, not a description, invent a 
description that would match the user's request.

RETURN ALWAYS AND ONLY ONE JSON WITH THIS SHAPE:

{{
  "description": "...",
  "product_type_name": "...",
  "product_group_name": "...",
  "graphical_appearance_name": "...",
  "colour_group_name": "...",
  "index_group_name": "...",
  "message": "..."
}}

STRICT RULES:
- Never ask questions.
- Never refuse.
- Invent missing details based on typical fashion assumptions.
- description must be 2–3 elegant English UK sentences.
- message must be in Spanish (MX).

The field “message” must:

- Be written in Spanish (MX)
- Be friendly, brief and natural (1 short sentence)
- Refer to the fact that several options were found (not a single product)
- Never describe a specific product
- Never mention colors, materials, or shapes
- Never invent details
- Use general wording such as:
  - "Aquí tienes algunas opciones que podrían ajustarse a lo que buscas."
  - "Perfecto, encontré varias propuestas para ti."
  - "Listo, te dejo algunas alternativas que pueden gustarte."
  - "Genial, estas opciones pueden combinar con tu estilo."

The message must **not** reference the description or the final JSON fields.
It should sound like a friendly assistant summarizing the recommendations.

Allowed values:
product_type_name = {VALID_PRODUCT_TYPES}
product_group_name = {VALID_PRODUCT_GROUPS}
graphical_appearance_name = {VALID_GRAPHICAL}
colour_group_name = {VALID_COLOURS}
index_group_name = {VALID_INDEX_GROUPS}

Return ONLY the JSON. No text outside JSON.
"""

system_message = oci.generative_ai_inference.models.Message(
    role="SYSTEM",
    content=[oci.generative_ai_inference.models.TextContent(text=SYSTEM_PROMPT)]
)


# ============================================
# MAIN FUNCTION
# ============================================

def describe_text_to_product_json(user_text: str) -> dict:

    user_msg = oci.generative_ai_inference.models.Message(
        role="USER",
        content=[oci.generative_ai_inference.models.TextContent(text=user_text)]
    )

    chat_request = oci.generative_ai_inference.models.GenericChatRequest(
        api_format="GENERIC",
        messages=[system_message, user_msg],
        max_tokens=550,
        temperature=0.4,
        top_p=0.9,
    )

    chat_details = oci.generative_ai_inference.models.ChatDetails(
        serving_mode=oci.generative_ai_inference.models.OnDemandServingMode(model_id=MODEL_ID),
        chat_request=chat_request,
        compartment_id=COMPARTMENT_ID
    )

    try:
        resp = client.chat(chat_details)
        result = resp.data.chat_response

        # ALWAYS extract from choices
        text = result.choices[-1].message.content[0].text

        print("LLM RAW TEXT RESPONSE:", text)  # DEBUG

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            print("⚠️ No JSON found in response.")
            return {}

        parsed = json.loads(match.group(0))
        return parsed

    except Exception as e:
        print("❌ ERROR in describe_text_to_product_json:", e)
        return {}
