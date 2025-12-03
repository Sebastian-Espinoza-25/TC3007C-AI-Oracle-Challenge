"""
RAG de promociones para e-commerce (MX) con OCI Generative AI + Oracle AI Vector Search.
"""

import os
import re
import json
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from dotenv import load_dotenv, find_dotenv

# Intenta auto-descubrir .env subiendo directorios
loaded = load_dotenv(find_dotenv())

if not os.getenv("OCI_COMPARTMENT_ID"):
    raise RuntimeError("Falta OCI_COMPARTMENT_ID (asegúrate de cargar .env antes).")

# Imports LangChain / Oracle
import oracledb

from langchain.docstore.document import Document
from langchain_oci.embeddings import OCIGenAIEmbeddings
from langchain_oci.chat_models import ChatOCIGenAI
from langchain_community.vectorstores.oraclevs import OracleVS
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.chains import RetrievalQA

# Pool y conexión exclusivos para OracleVS

_VS_POOL: oracledb.ConnectionPool | None = None
_VS_CONN: oracledb.Connection | None = None


def _create_vs_pool() -> oracledb.ConnectionPool:
    """
    Crea un pool de conexiones exclusivo para OracleVS.
    Usa las mismas variables que tu app:
      DB_USER, DB_PASSWORD, DB_ALIAS,
      TNS_ADMIN, WALLET_LOCATION, WALLET_PASSWORD
    """
    db_user = os.getenv("DB_USER")
    db_password = os.getenv("DB_PASSWORD")
    db_alias = os.getenv("DB_ALIAS")
    tns_admin = os.getenv("TNS_ADMIN")
    wallet_location = os.getenv("WALLET_LOCATION")
    wallet_password = os.getenv("WALLET_PASSWORD")

    if not (db_user and db_password and db_alias):
        raise RuntimeError(
            "Faltan DB_USER/DB_PASSWORD/DB_ALIAS en variables de entorno para OracleVS."
        )

    connect_kwargs = {
        "user": db_user,
        "password": db_password,
        "dsn": db_alias,
        "min": 1,
        "max": 4,
        "increment": 1,
    }

    if tns_admin:
        connect_kwargs["config_dir"] = tns_admin
    if wallet_location:
        connect_kwargs["wallet_location"] = wallet_location
    if wallet_password:
        connect_kwargs["wallet_password"] = wallet_password

    pool = oracledb.create_pool(**connect_kwargs)
    print("[oraclevs] Pool de conexiones creado para OracleVS.")
    return pool


def get_oracle_vs_pool() -> oracledb.ConnectionPool:
    """Devuelve el pool global para OracleVS."""
    global _VS_POOL
    if _VS_POOL is None:
        _VS_POOL = _create_vs_pool()
    return _VS_POOL


def get_oracle_vs_conn() -> oracledb.Connection:
    """
    Devuelve una conexión viva para OracleVS.
    Reusa _VS_CONN mientras sirva; si no, la reacquiere del pool.
    """
    global _VS_CONN

    if _VS_CONN is not None:
        try:
            _VS_CONN.ping()
            return _VS_CONN
        except oracledb.Error:
            try:
                _VS_CONN.close()
            except Exception:
                pass
            _VS_CONN = None

    pool = get_oracle_vs_pool()
    _VS_CONN = pool.acquire()
    print("[oraclevs] Nueva conexión adquirida del pool para OracleVS.")
    return _VS_CONN


# Config RAG / Vector Store

PROMO_VECTOR_TABLE = os.getenv("PROMO_VECTOR_TABLE", "PROMO_PROMOS_COSINE")
PROMO_VECTOR_INDEX = os.getenv("PROMO_VECTOR_INDEX", "PROMO_PROMOS_IDX")

# Utilidades generales

def now_iso_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _norm_bank(s: str) -> str:
    """Normaliza nombre de banco: mayúsculas, sin acentos; aplica alias comunes en MX."""
    if not s:
        return ""
    s_norm = "".join(
        c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)
    )
    s_norm = s_norm.strip().upper()
    aliases = {
        "BANCOMER": "BBVA",
        "BBVA BANCOMER": "BBVA",
        "CITIBANAMEX": "BANAMEX",
    }
    return aliases.get(s_norm, s_norm)


def parse_promo_doc(content: str) -> Optional[Dict[str, Any]]:
    """Devuelve dict de promo o None."""
    if not isinstance(content, str) or not content.strip():
        return None

    txt = content.strip()

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

    m = re.search(r"\{.*\}", txt, flags=re.DOTALL)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return None


def is_valid_now(promo: Dict[str, Any], ref_iso: Optional[str] = None) -> bool:
    """Chequea vigencia_inicio <= now <= vigencia_fin (o fin = None)."""
    ref = (
        datetime.fromisoformat(ref_iso.replace("Z", "+00:00"))
        if ref_iso
        else datetime.now(timezone.utc)
    )
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
        return False


def faltante_para(minimo_carrito_mxn: float, monto: float) -> float:
    try:
        return max(0.0, float(minimo_carrito_mxn) - float(monto))
    except Exception:
        return 0.0


def _bank_label_for_message(banco: Optional[str]) -> str:
    """Devuelve etiqueta para mostrar en mensajes."""
    if not banco:
        return ""
    b = str(banco).strip().upper()
    if b in ("EMPTY", "GENERIC", "SIN_BANCO"):
        return ""
    return banco


# Carga de promociones

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

                bancos_list = promo.get("condiciones", {}).get("bancos", [])
                bancos_meta = (
                    ", ".join(map(str, bancos_list))
                    if isinstance(bancos_list, list)
                    else str(bancos_list)
                )

                meta = {
                    "source": str(p),
                    "id": promo.get("id"),
                    "titulo": promo.get("titulo"),
                    "minimo": promo.get("condiciones", {}).get("minimo_carrito_mxn"),
                    "bancos": bancos_meta,
                    "inicio": promo.get("vigencia_inicio"),
                    "fin": promo.get("vigencia_fin"),
                    "prioridad": promo.get("prioridad", 0),
                }
                docs.append(Document(page_content=content, metadata=meta))
            except Exception:
                continue

    print(f"[load] Promos cargadas: {len(docs)} documentos")
    return docs


# Embeddings + VectorStore

def get_embeddings() -> OCIGenAIEmbeddings:
    embed_model = os.getenv("OCI_EMBED_MODEL", "cohere.embed-multilingual-light-v3.0")
    endpoint = os.getenv(
        "OCI_GENAI_ENDPOINT",
        "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com",
    )
    compartment = os.getenv("OCI_COMPARTMENT_ID", "")
    if not compartment:
        raise RuntimeError("Falta OCI_COMPARTMENT_ID en variables de entorno.")
    return OCIGenAIEmbeddings(
        model_id=embed_model,
        service_endpoint=endpoint,
        compartment_id=compartment,
    )


def build_oracle_vs(
    docs: List[Document],
    rebuild_index: bool = False,
    conn: Optional[oracledb.Connection] = None,
) -> OracleVS:
    """
    Crea o reutiliza el vector store en Oracle 26ai.
    """
    if conn is None:
        conn = get_oracle_vs_conn()

    table_name = PROMO_VECTOR_TABLE

    if rebuild_index:
        try:
            with conn.cursor() as cur:
                cur.execute(f'DROP TABLE "{table_name}" PURGE')
            print(f"[oraclevs] Tabla {table_name} eliminada.")
        except oracledb.DatabaseError:
            print(f"[oraclevs] DROP TABLE {table_name} falló (posible que no exista).")

        vs = OracleVS.from_documents(
            documents=docs,
            embedding=get_embeddings(),
            client=conn,
            table_name=table_name,
            distance_strategy=DistanceStrategy.COSINE,
        )
        print(f"[oraclevs] Tabla {table_name} creada.")
        return vs

    vs = OracleVS(
        client=conn,
        table_name=table_name,
        embedding_function=get_embeddings(),
        distance_strategy=DistanceStrategy.COSINE,
    )
    print(f"[oraclevs] Usando tabla existente {table_name}.")
    return vs


# LLM + QA Chain

def get_llm() -> ChatOCIGenAI:
    model_id = os.getenv("OCI_GENAI_MODEL_ID", "")
    compartment = os.getenv("OCI_COMPARTMENT_ID", "")
    endpoint = os.getenv(
        "OCI_GENAI_ENDPOINT",
        "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com",
    )
    if not (model_id and compartment):
        raise RuntimeError(
            "Faltan OCI_GENAI_MODEL_ID u OCI_COMPARTMENT_ID en variables de entorno."
        )

    return ChatOCIGenAI(
        model_id=model_id,
        compartment_id=compartment,
        service_endpoint=endpoint,
    )


def build_qa_chain(vectorstore: OracleVS) -> RetrievalQA:
    SYSTEM_PROMPT = """
    Eres un asistente de promociones en la fase de pago de un e-commerce de ropa en México.
    Tienes una lista de promociones estructuradas (JSON).
    Con base en:
    - banco de la tarjeta
    - monto de la compra
    - vigencia de la promoción
    elige la mejor promoción aplicable.
    """

    prompt = ChatPromptTemplate.from_messages(
        [
            SystemMessagePromptTemplate.from_template(SYSTEM_PROMPT),
            HumanMessagePromptTemplate.from_template(
                "Contexto:\n{context}\n\nPregunta:\n{question}"
            ),
        ]
    )

    llm = get_llm()
    retriever = vectorstore.as_retriever(
        search_type="similarity", search_kwargs={"k": 50}
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        return_source_documents=True,
        chain_type_kwargs={"prompt": prompt},
    )
    return qa_chain

# Selección determinista (a partir de source docs)

def pick_best_and_next_promos(
    promos: List[Dict[str, Any]],
    monto: float,
    banco: str,
    now_iso: Optional[str] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Elige la 'mejor' promo que cumple monto y vigencia para el banco.
    Ahora soporta:
      - descuento_porcentaje
      - descuento_fijo
      - cashback_fijo
      - msi
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

    # --- NUEVO: soporte para score ampliado ---
    def score(p: Dict[str, Any]) -> Tuple[int, float, float, int]:
        """
        Score ordena:
          1) prioridad DESC
          2) valor_porcentaje DESC (si aplica)
          3) valor_fijo DESC (descuento_fijo / cashback_fijo)
          4) meses_msi DESC
        """
        prio = int(p.get("prioridad", 0) or 0)
        ben = p.get("beneficio", {}) or {}
        tipo = ben.get("tipo")

        pct = 0.0
        fijo = 0.0
        meses = 0

        if tipo == "descuento_porcentaje":
            pct = float(ben.get("valor", 0) or 0)
        elif tipo == "descuento_fijo":
            fijo = float(ben.get("valor", 0) or 0)
        elif tipo == "cashback_fijo":
            fijo = float(ben.get("valor", 0) or 0)
        elif tipo == "msi":
            meses = int(ben.get("meses", 0) or 0)

        return (prio, pct, fijo, meses)
    # ----------------------------------------------------

    best = None
    if eligibles:
        eligibles.sort(key=score, reverse=True)
        best = eligibles[0]

    next_up = None
    if candidatas_mas_arriba:
        candidatas_mas_arriba.sort(
            key=lambda p: (
                faltante_para(
                    p.get("condiciones", {}).get("minimo_carrito_mxn", 0), monto
                ),
                -int(p.get("prioridad", 0) or 0),
            )
        )
        next_up = candidatas_mas_arriba[0]

    return best, next_up

def build_messages(
    best: Optional[Dict[str, Any]],
    next_up: Optional[Dict[str, Any]],
    monto: float,
    banco: str,
) -> Dict[str, Any]:
    """
    Construye los mensajes para current_promo y next_promo.
    Ahora soporta:
      - descuento_fijo
      - cashback_fijo
      además de:
      - descuento_porcentaje
      - msi
    """
    if not best and not next_up:
        return {
            "current_promo": {
                "promo_title": "Sin promoción",
                "message": "No hay promociones vigentes para tu tarjeta en este momento.",
                "meets_minimum": False,
                "benefit": None,
            },
            "next_promo": {
                "promo_title": "",
                "required_amount": 0,
                "message": "",
                "benefit": None,
            },
            "mix_message": {
                "message": "Por ahora no contamos con promociones activas para tu tarjeta."
            },
        }

    bank_label = _bank_label_for_message(banco)

    # =========================================================
    # BENEFICIO ACTUAL (best)
    # =========================================================
    benefit_current: Optional[Dict[str, Any]] = None
    if best:
        ben = best.get("beneficio", {}) or {}
        tipo = ben.get("tipo")
        benefit_current = {"type": tipo}

        # Soporte de beneficios nuevos
        if tipo == "descuento_porcentaje":
            benefit_current["percentage"] = float(ben.get("valor", 0) or 0)

        elif tipo == "msi":
            benefit_current["months"] = int(ben.get("meses", 0) or 0)

        elif tipo == "descuento_fijo":
            benefit_current["amount"] = float(ben.get("valor", 0) or 0)

        elif tipo == "cashback_fijo":
            benefit_current["cashback"] = float(ben.get("valor", 0) or 0)

    # current message
    if best:
        ben = best.get("beneficio", {}) or {}
        min_req = float(best.get("condiciones", {}).get("minimo_carrito_mxn", 0) or 0)
        meets = monto >= min_req

        tipo = ben.get("tipo")

        # ----- mensajes actualizados para nuevos tipos -----
        if tipo == "descuento_porcentaje":
            benefit_str = f"{int(ben.get('valor', 0))}% de descuento"

        elif tipo == "msi":
            benefit_str = f"{int(ben.get('meses', 0))} MSI"

        elif tipo == "descuento_fijo":
            benefit_str = f"${int(ben.get('valor', 0))} de descuento"

        elif tipo == "cashback_fijo":
            benefit_str = f"${int(ben.get('valor', 0))} de cashback"

        else:
            benefit_str = "Beneficio activo"
        # ----------------------------------------------------

        if bank_label:
            msg_current = (
                f"Aprovecha {benefit_str} pagando con tu tarjeta {bank_label}. "
                f"Aplica en compras desde ${int(min_req)}."
            )
        else:
            msg_current = (
                f"Aprovecha {benefit_str} pagando con tu método de pago. "
                f"Aplica en compras desde ${int(min_req)}."
            )

        current = {
            "promo_title": best.get("titulo", "Promoción"),
            "message": msg_current,
            "meets_minimum": bool(meets),
            "benefit": benefit_current,
        }
    else:
        current = {
            "promo_title": "Sin promoción",
            "message": "No hay promociones vigentes para tu tarjeta.",
            "meets_minimum": False,
            "benefit": None,
        }

    # =========================================================
    # BENEFICIO SIGUIENTE (next_up)
    # =========================================================
    benefit_next: Optional[Dict[str, Any]] = None
    if next_up:
        ben_next = next_up.get("beneficio", {}) or {}
        tipo_next = ben_next.get("tipo")
        benefit_next = {"type": tipo_next}

        if tipo_next == "descuento_porcentaje":
            benefit_next["percentage"] = float(ben_next.get("valor", 0) or 0)

        elif tipo_next == "msi":
            benefit_next["months"] = int(ben_next.get("meses", 0) or 0)

        elif tipo_next == "descuento_fijo":
            benefit_next["amount"] = float(ben_next.get("valor", 0) or 0)

        elif tipo_next == "cashback_fijo":
            benefit_next["cashback"] = float(ben_next.get("valor", 0) or 0)

    if next_up:
        min_up = float(next_up.get("condiciones", {}).get("minimo_carrito_mxn", 0) or 0)
        falt = faltante_para(min_up, monto)
        ben = next_up.get("beneficio", {}) or {}
        tipo = ben.get("tipo")

        # ----- mensajes actualizados para nuevos tipos -----
        if tipo == "descuento_porcentaje":
            benefit_str = f"{int(ben.get('valor', 0))}%"

        elif tipo == "msi":
            benefit_str = f"{int(ben.get('meses', 0))} MSI"

        elif tipo == "descuento_fijo":
            benefit_str = f"${int(ben.get('valor', 0))}"

        elif tipo == "cashback_fijo":
            benefit_str = f"${int(ben.get('valor', 0))}"
        # ---------------------------------------------------

        next_block = {
            "promo_title": next_up.get("titulo", ""),
            "required_amount": round(float(falt), 2),
            "message": (
                f"Te faltan ${int(falt)} para alcanzar {benefit_str}. "
                f"Agrega algo más para aplicar."
            ),
            "benefit": benefit_next,
        }
    else:
        next_block = {
            "promo_title": "",
            "required_amount": 0,
            "message": "",
            "benefit": None,
        }

    # mensaje combinado (sin cambios)
    mix = {
        "message": (
            f"{current['message']} "
            f"{next_block['message'] if next_block['promo_title'] else ''}".strip()
        )
    }

    return {
        "current_promo": current,
        "next_promo": next_block,
        "mix_message": mix,
    }


# =========================================================
# API principal
# =========================================================

class PromoRAG:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or os.getenv("DATA_DIR", "./data")
        self.vectorstore: Optional[OracleVS] = None
        self.qa_chain: Optional[RetrievalQA] = None

    def _ensure_initialized(self) -> None:
        if self.qa_chain is None or self.vectorstore is None:
            self.initialize(rebuild_index=False)
            return

        try:
            conn = get_oracle_vs_conn()
            if hasattr(self.vectorstore, "client"):
                self.vectorstore.client = conn
        except Exception:
            self.initialize(rebuild_index=False)

    def initialize(
        self,
        rebuild_index: bool = False,
        conn: Optional[oracledb.Connection] = None,
    ) -> None:
        docs = load_promos_as_documents(self.data_dir)
        self.vectorstore = build_oracle_vs(
            docs, rebuild_index=rebuild_index, conn=conn
        )
        self.qa_chain = build_qa_chain(self.vectorstore)
        print("[init] RAG listo con Oracle AI Vector Search.")

    def promotor(self, monto: float, banco: str) -> str:
        """
        Consulta el RAG y arma la respuesta de promociones.
        Ahora soporta nuevos tipos de beneficios mediante pick_best_and_next_promos
        y build_messages.
        """
        self._ensure_initialized()

        raw_bank = banco or ""
        if raw_bank.strip() == "":
            banco_norm = "EMPTY"
        else:
            banco_norm = _norm_bank(raw_bank)

        hoy = now_iso_utc()

        query = f"""
        Fecha actual (UTC): {hoy}
        Cliente pagando {monto} MXN con tarjeta {banco_norm}.
        Selecciona promoción actual y su posible siguiente.
        """

        try:
            if self.vectorstore is not None:
                self.vectorstore.client = get_oracle_vs_conn()
        except Exception:
            self.initialize(rebuild_index=False)

        try:
            result = self.qa_chain.invoke({"query": query})
        except RuntimeError as e:
            msg = str(e)
            if "DPY-1001" in msg or "not connected to database" in msg:
                global _VS_CONN
                try:
                    if _VS_CONN is not None:
                        _VS_CONN.close()
                except Exception:
                    pass
                _VS_CONN = None

                self.initialize(rebuild_index=False)
                result = self.qa_chain.invoke({"query": query})
            else:
                raise

        source_docs = result.get("source_documents") or []

        promos_del_banco: List[Dict[str, Any]] = []
        for d in source_docs:
            promo = parse_promo_doc(getattr(d, "page_content", ""))
            if not promo:
                continue

            bancos = promo.get("condiciones", {}).get("bancos", [])
            bancos_norm = {_norm_bank(x) for x in bancos if isinstance(x, str)}

            if banco_norm in bancos_norm:
                promos_del_banco.append(promo)

        if not promos_del_banco:
            return json.dumps(
                {
                    "current_promo": {
                        "promo_title": "Sin promoción",
                        "message": "No hay promociones vigentes para tu tarjeta.",
                        "meets_minimum": False,
                    },
                    "next_promo": {"promo_title": "", "required_amount": 0, "message": ""},
                    "mix_message": {"message": "Por ahora no contamos con promociones activas."},
                },
                ensure_ascii=False,
            )

        best, next_up = pick_best_and_next_promos(
            promos_del_banco, monto, banco_norm, hoy
        )
        payload = build_messages(best, next_up, monto, banco_norm)

        return json.dumps(payload, ensure_ascii=False)


# Runner local opcional

def main():
    """
    Runner local para probar el RAG con una variedad de promociones
    y diferentes bancos. Cubre:
      - descuento_porcentaje
      - msi
      - descuento_fijo
      - cashback_fijo
      - casos sin banco
      - montos bajo, medio y alto
    """

    print("\n===============================")
    print("  INICIALIZANDO RAG DE PROMOS  ")
    print("===============================\n")

    rag = PromoRAG()
    rag.initialize(rebuild_index=True)   # Usa el índice actual

    # --- BANCOS DEFINIDOS EN LAS PROMOS ---
    bancos = [
        "BBVA",
        "HSBC",
        "SCOTIABANK",
        "BANAMEX",
        "AMERICAN EXPRESS",
        "",  # Caso sin banco
    ]

    # --- MONTOS ESTRATÉGICOS PARA PROBAR MÍNIMOS ---
    montos = [
        100,     # Muy bajo (ninguna promo aplica)
        480,     # Cerca de mínimos bajos
        790,     # Cerca de umbrales medios
        900,     # Justo en rango de porcentaje
        1200,    # Aplica muchas promos
        1500,    # Umbral para varias
        2000,    # Alta probabilidad de MSI
        2500,    # Cashback y descuentos altos
        3000,    # Máximos
    ]

    print("\n=== INICIANDO TESTS AUTOMÁTICOS ===\n")

    for banco in bancos:
        for monto in montos:
            print("--------------------------------------------------------------")
            print(f"BANCO: {banco or 'SIN BANCO'} | MONTO: {monto}")
            try:
                respuesta = rag.promotor(monto, banco)
                print("Respuesta:")
                print(respuesta)
            except Exception as e:
                print(f"ERROR procesando {banco} / {monto}: {e}")

    print("\n========================================")
    print("  TESTING FINALIZADO - REVISA RESULTADOS")
    print("========================================\n")


if __name__ == "__main__":
    main()
