
"""
promos_rag.py
--------------
RAG de promociones para e-commerce (MX) con OCI Generative AI + Chroma.

Requisitos (versiones alineadas sugeridas):
    langchain==0.3.27
    langchain-core==0.3.76
    langchain-community==0.3.27
    langchain-openai==0.2.8           # (no se usa por defecto)
    langchain-oci==0.1.6
    chromadb==1.3.4
    oci==2.162.0

Variables de entorno recomendadas:
    OCI_CONFIG_FILE=~/.oci/config
    OCI_PROFILE=DEFAULT
    OCI_COMPARTMENT_ID=ocid1.tenancy.oc1.....
    OCI_GENAI_ENDPOINT=https://inference.generativeai.us-chicago-1.oci.oraclecloud.com
    OCI_GENAI_MODEL_ID=ocid1.generativeaimodel.oc1.us-chicago-1.... (o un alias admitido por tu SDK)
    OCI_EMBED_MODEL=cohere.embed-multilingual-light-v3.0
    CHROMA_DIR=./chroma_db
    DATA_DIR=./data
"""
# Cargar .env desde backend/.env aunque se ejecute este script directo
import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Intenta auto-descubrir .env subiendo directorios
loaded = load_dotenv(find_dotenv())

# (Opcional) Ruta explícita si prefieres:  backend/.env
# env_path = Path(__file__).resolve().parents[3] / ".env"   # promotor_agent -> services -> app -> backend
# loaded = load_dotenv(env_path)

if not os.getenv("OCI_COMPARTMENT_ID"):
    raise RuntimeError("Falta OCI_COMPARTMENT_ID (asegúrate de cargar .env antes).")

import os
import re
import json
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# LangChain / OCI
from langchain.docstore.document import Document
from langchain_oci.embeddings import OCIGenAIEmbeddings
from langchain_oci.chat_models import ChatOCIGenAI
from langchain_community.vectorstores import Chroma
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain.chains import RetrievalQA


# ==============================
# Utilidades generales
# ==============================

def now_iso_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _norm_bank(s: str) -> str:
    """Normaliza nombre de banco: mayúsculas, sin acentos; aplica alias comunes en MX."""
    if not s:
        return ""
    s_norm = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    s_norm = s_norm.strip().upper()
    aliases = {
        "BANCOMER": "BBVA",
        "BBVA BANCOMER": "BBVA",
        "CITIBANAMEX": "BANAMEX",  # opcional, si así guardas tus promos
    }
    return aliases.get(s_norm, s_norm)


def parse_promo_doc(content: str) -> Optional[Dict[str, Any]]:
    """Devuelve dict de promo o None. Tolera doble stringificación y bloques parciales."""
    if not isinstance(content, str) or not content.strip():
        return None

    txt = content.strip()

    # Intenta parse directo
    for _ in range(2):
        try:
            obj = json.loads(txt)
            if isinstance(obj, dict):
                return obj
            if isinstance(obj, str):
                txt = obj
                continue
        except Exception:
            break

    # Último intento: extraer el primer bloque {...} balanceado (heurístico)
    m = re.search(r"\{.*\}", txt, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return None


def is_valid_now(promo: Dict[str, Any], ref_iso: Optional[str] = None) -> bool:
    """Chequea vigencia_inicio <= now <= vigencia_fin (o fin = None)."""
    ref = datetime.fromisoformat(ref_iso.replace("Z", "+00:00")) if ref_iso else datetime.now(timezone.utc)
    try:
        ini_s = promo.get("vigencia_inicio")
        fin_s = promo.get("vigencia_fin")
        if ini_s:
            ini = datetime.fromisoformat(ini_s.replace("Z", "+00:00"))
            if ref < ini:
                return False
        if fin_s:
            fin = datetime.fromisoformat(fin_s.replace("Z", "+00:00"))
            if ref > fin:
                return False
        return True
    except Exception:
        # Si hay error en parseo, asumimos no válida
        return False


def faltante_para(minimo_carrito_mxn: float, monto: float) -> float:
    try:
        return max(0.0, float(minimo_carrito_mxn) - float(monto))
    except Exception:
        return 0.0


# ==============================
# Carga de promociones (sin JSONLoader para evitar splits)
# ==============================
def load_promos_as_documents(data_dir: str) -> List[Document]:
    base = Path(data_dir)
    if not base.exists():
        raise FileNotFoundError(f"No existe la carpeta de datos: {base.resolve()}")

    docs: List[Document] = []
    for p in base.glob("*.json"):
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print(f"[WARN] No pude leer {p.name}: {e}")
            continue

        promos = data.get("promociones", [])
        for promo in promos:
            try:
                content = json.dumps(promo, ensure_ascii=False)

                # --- CORRECCIÓN: bancos como string (no lista) ---
                bancos_list = promo.get("condiciones", {}).get("bancos", [])
                bancos_meta = ", ".join(map(str, bancos_list)) if isinstance(bancos_list, list) else str(bancos_list)

                meta = {
                    "source": str(p),
                    "id": promo.get("id"),
                    "titulo": promo.get("titulo"),
                    "minimo": promo.get("condiciones", {}).get("minimo_carrito_mxn"),
                    "bancos": bancos_meta,   # <-- aquí ya es string
                    "inicio": promo.get("vigencia_inicio"),
                    "fin": promo.get("vigencia_fin"),
                    "prioridad": promo.get("prioridad", 0),
                }
                docs.append(Document(page_content=content, metadata=meta))
            except Exception:
                continue

    print(f"[load] Promos cargadas: {len(docs)} documentos")
    return docs


# ==============================
# Embeddings + VectorStore
# ==============================

def get_embeddings() -> OCIGenAIEmbeddings:
    embed_model = os.getenv("OCI_EMBED_MODEL", "cohere.embed-multilingual-light-v3.0")
    endpoint = os.getenv("OCI_GENAI_ENDPOINT", "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com")
    compartment = os.getenv("OCI_COMPARTMENT_ID", "")
    if not compartment:
        raise RuntimeError("Falta OCI_COMPARTMENT_ID en variables de entorno.")
    return OCIGenAIEmbeddings(
        model_id=embed_model,
        service_endpoint=endpoint,
        compartment_id=compartment,
    )


def build_or_load_chroma(docs: List[Document], persist_dir: str) -> Chroma:
    Path(persist_dir).mkdir(parents=True, exist_ok=True)
    # Si ya existe DB, recárgala; si no, créala
    if any(Path(persist_dir).glob("*.sqlite")) or any(Path(persist_dir).glob("**/*.sqlite")):
        print("[chroma] Cargando índice existente...")
        return Chroma(persist_directory=persist_dir, embedding_function=get_embeddings())
    else:
        print("[chroma] Creando índice nuevo...")
        db = Chroma.from_documents(documents=docs, embedding=get_embeddings(), persist_directory=persist_dir)
        db.persist()
        return db


# ==============================
# LLM (OCI) + RetrievalQA
# ==============================

def get_llm() -> ChatOCIGenAI:
    model_id = os.getenv("OCI_GENAI_MODEL_ID", "")
    compartment = os.getenv("OCI_COMPARTMENT_ID", "")
    endpoint = os.getenv("OCI_GENAI_ENDPOINT", "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com")
    if not (model_id and compartment):
        raise RuntimeError("Faltan OCI_GENAI_MODEL_ID u OCI_COMPARTMENT_ID en variables de entorno.")

    # Quitar temperature y max_output_tokens (no son aceptados por esta clase)
    return ChatOCIGenAI(
        model_id=model_id,
        compartment_id=compartment,
        service_endpoint=endpoint,
    )



def build_qa_chain(vectorstore: Chroma) -> RetrievalQA:
    SYSTEM_PROMPT = """
    Eres un asistente de promociones en la fase de pago de un e-commerce de ropa en México.
    Tienes una lista de promociones estructuradas (JSON).
    Con base en:
    - banco de la tarjeta (BBVA, Santander, etc.)
    - monto de la compra en MXN
    - vigencia de la promoción
    elige la promoción más adecuada. NO inventes condiciones que no estén en el contexto.
    Responde en tono persuasivo, corto y claro, mencionando el beneficio y las condiciones principales.
    Si no hay promoción aplicable, di que no hay, pero sugiere subir un poco el monto si aplica.
    """
    prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
        HumanMessagePromptTemplate.from_template("Contexto:\n{context}\n\nPregunta:\n{question}")
    ])

    llm = get_llm()
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 5})
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        return_source_documents=True,
        chain_type_kwargs={"prompt": prompt}
    )
    return qa_chain


# ==============================
# Selección determinista (a partir de source docs)
# ==============================

def pick_best_and_next_promos(
    promos: List[Dict[str, Any]], monto: float, banco: str, now_iso: Optional[str] = None
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Elige la 'mejor' promo que cumple monto y vigencia para el banco.
    - Criterio: mayor 'prioridad'; en empate, preferir mayor beneficio (porcentaje) o más MSI.
    Calcula también la 'próxima' (con mínimo > monto) más cercana hacia arriba.
    """
    banco_norm = _norm_bank(banco)
    now_iso = now_iso or now_iso_utc()

    eligibles: List[Dict[str, Any]] = []
    candidatas_mas_arriba: List[Dict[str, Any]] = []

    for p in promos:
        if not is_valid_now(p, now_iso):
            continue
        bancos = p.get("condiciones", {}).get("bancos", [])
        bancos_norm = {_norm_bank(x) for x in bancos if isinstance(x, str)}
        if banco_norm not in bancos_norm:
            continue
        min_req = p.get("condiciones", {}).get("minimo_carrito_mxn", 0) or 0
        if monto >= float(min_req):
            eligibles.append(p)
        else:
            candidatas_mas_arriba.append(p)

    def score(p: Dict[str, Any]) -> Tuple[int, float, int]:
        prio = int(p.get("prioridad", 0) or 0)
        ben = p.get("beneficio", {}) or {}
        pct = float(ben.get("valor", 0) or 0) if (ben.get("tipo") == "descuento_porcentaje") else 0.0
        msi = int(ben.get("meses", 0) or 0) if (ben.get("tipo") == "msi") else 0
        # Orden: prioridad DESC, porcentaje DESC, msi DESC
        return (prio, pct, msi)

    best = None
    if eligibles:
        eligibles.sort(key=score, reverse=True)
        best = eligibles[0]

    next_up = None
    if candidatas_mas_arriba:
        # Orden por "cuánto falta" asc, luego prioridad DESC
        candidatas_mas_arriba.sort(
            key=lambda p: (faltante_para(p.get("condiciones", {}).get("minimo_carrito_mxn", 0), monto), -int(p.get("prioridad", 0) or 0))
        )
        next_up = candidatas_mas_arriba[0]

    return best, next_up


def build_messages(best: Optional[Dict[str, Any]], next_up: Optional[Dict[str, Any]], monto: float, banco: str) -> Dict[str, Any]:
    if not best and not next_up:
        return {
            "current_promo": {
                "promo_title": "Sin promoción",
                "message": "No hay promociones vigentes para tu tarjeta en este momento.",
                "meets_minimum": False
            },
            "next_promo": {"promo_title": "", "required_amount": 0, "message": ""},
            "mix_message": {"message": "Por ahora no contamos con promociones activas para tu tarjeta."}
        }

    # current
    if best:
        ben = best.get("beneficio", {}) or {}
        min_req = float(best.get("condiciones", {}).get("minimo_carrito_mxn", 0) or 0)
        meets = monto >= min_req
        if ben.get("tipo") == "descuento_porcentaje":
            benefit_str = f"{int(ben.get('valor', 0))}% de descuento"
        elif ben.get("tipo") == "msi":
            benefit_str = f"{int(ben.get('meses', 0))} MSI"
        else:
            benefit_str = "Beneficio activo"

        current = {
            "promo_title": best.get("titulo", "Promoción"),
            "message": f"Aprovecha {benefit_str} pagando con tu tarjeta {banco}. Aplica en compras desde ${int(min_req)}.",
            "meets_minimum": bool(meets)
        }
    else:
        current = {
            "promo_title": "Sin promoción",
            "message": "No hay promociones vigentes para tu tarjeta en este momento.",
            "meets_minimum": False
        }

    # next
    if next_up:
        min_up = float(next_up.get("condiciones", {}).get("minimo_carrito_mxn", 0) or 0)
        falt = faltante_para(min_up, monto)
        ben = next_up.get("beneficio", {}) or {}
        if ben.get("tipo") == "descuento_porcentaje":
            benefit_str = f"{int(ben.get('valor', 0))}%"
        elif ben.get("tipo") == "msi":
            benefit_str = f"{int(ben.get('meses', 0))} MSI"
        else:
            benefit_str = "mejor beneficio"
        next_block = {
            "promo_title": next_up.get("titulo", ""),
            "required_amount": round(float(falt), 2),
            "message": f"Te faltan ${int(falt)} para alcanzar {benefit_str}. Agrega algo más para aplicar."
        }
    else:
        next_block = {"promo_title": "", "required_amount": 0, "message": ""}

    mix = {
        "message": (
            f"{current['message']} "
            f"{next_block['message'] if next_block['promo_title'] else ''}".strip()
        )
    }

    return {
        "current_promo": current,
        "next_promo": next_block,
        "mix_message": mix
    }


# ==============================
# API principal
# ==============================

class PromoRAG:
    def __init__(self, data_dir: Optional[str] = None, chroma_dir: Optional[str] = None):
        self.data_dir = data_dir or os.getenv("DATA_DIR", "./data")
        self.chroma_dir = chroma_dir or os.getenv("CHROMA_DIR", "./chroma_db")
        self.vectorstore: Optional[Chroma] = None
        self.qa_chain: Optional[RetrievalQA] = None

    def initialize(self, rebuild_index: bool = False) -> None:
        docs = load_promos_as_documents(self.data_dir)

        if rebuild_index:
            # limpiar índice previo
            base = Path(self.chroma_dir)
            if base.exists():
                for p in base.glob("**/*"):
                    try:
                        p.unlink()
                    except Exception:
                        pass

        self.vectorstore = build_or_load_chroma(docs, self.chroma_dir)
        self.qa_chain = build_qa_chain(self.vectorstore)
        print("[init] RAG listo.")

    def promotor(self, monto: float, banco: str) -> str:
        if not self.qa_chain:
            raise RuntimeError("RAG no inicializado. Llama initialize().")

        banco_norm = _norm_bank(banco)
        hoy = now_iso_utc()

        # Pregunta al chain (para tener respaldo generativo + context)
        query = f"""
        Fecha actual (UTC): {hoy}
        Cliente pagando {monto} MXN con tarjeta {banco_norm}.
        Selecciona promoción actual y su posible siguiente (si no alcanza):
        """
        result = self.qa_chain.invoke({"query": query})
        source_docs = result.get("source_documents") or []

        # Parse determinista a partir de las fuentes
        promos_del_banco: List[Dict[str, Any]] = []
        for d in source_docs:
            promo = parse_promo_doc(getattr(d, "page_content", ""))
            if not promo:
                continue
            bancos = promo.get("condiciones", {}).get("bancos", [])
            bancos_norm = {_norm_bank(x) for x in bancos if isinstance(x, str)}
            if banco_norm in bancos_norm:
                promos_del_banco.append(promo)

        # Si por alguna razón el retriever no trajo promos del banco, devolvemos fallback
        if not promos_del_banco:
            return json.dumps({
                "current_promo": {
                    "promo_title": "Sin promoción",
                    "message": "No hay promociones vigentes para tu tarjeta en este momento.",
                    "meets_minimum": False
                },
                "next_promo": {"promo_title": "", "required_amount": 0, "message": ""},
                "mix_message": {"message": "Por ahora no contamos con promociones activas para tu tarjeta."}
            }, ensure_ascii=False)

        best, next_up = pick_best_and_next_promos(promos_del_banco, monto, banco_norm, hoy)
        payload = build_messages(best, next_up, monto, banco_norm)
        return json.dumps(payload, ensure_ascii=False)


# ==============================
# Runner local
# ==============================

def main():
    rag = PromoRAG()
    rag.initialize(rebuild_index=False)  # pon True si cambiaste data y quieres reindexar
    # Pruebas rápidas
    tests = [
        (500, "BBVA"),
        (880, "BBVA"),
        (910, "BBVA"),
        (1250, "BBVA"),
        (1790, "BBVA"),
        (2600, "HSBC"),
        (2400, "Scotiabank"),
        (2300, "CITIBANAMEX"),
        (3000, "AMERICAN EXPRESS"),
    ]
    for monto, banco in tests:
        print("\n=== Test:", banco, monto, "===")
        print(rag.promotor(monto, banco))

if __name__ == "__main__":
    main()
