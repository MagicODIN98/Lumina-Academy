# backend/api.py
# ─────────────────────────────────────────────────────────────────────
# Arrancar desde la RAÍZ del proyecto:
#   uvicorn backend.api:app --reload --port 8000
# ─────────────────────────────────────────────────────────────────────

import os, sys, json, random, copy, math, re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# ── Calcular rutas absolutas desde la posición de este archivo ───────
# backend/api.py  →  dirname = backend/  →  parent = raíz del proyecto
THIS_FILE  = os.path.abspath(__file__)          # .../proyecto/backend/api.py
BACKEND_DIR = os.path.dirname(THIS_FILE)        # .../proyecto/backend/
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)     # .../proyecto/

# Dataset
DATASET_PATH = os.path.join(PROJECT_ROOT, "modeloIA", "dataset", "dataset.json")

# Modelo IA (todos opcionales)
MODEL_DIR     = os.path.join(PROJECT_ROOT, "modeloIA")
MODEL_PATH    = os.path.join(MODEL_DIR, "modelo.pth")
ENC_UNI_PATH  = os.path.join(MODEL_DIR, "label_encoder.pkl")
ENC_AREA_PATH = os.path.join(MODEL_DIR, "label_encoder_area.pkl")

# Añadir la raíz al path para que `from entrenamiento import ...` funcione
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

print(f"📂 Raíz del proyecto : {PROJECT_ROOT}")
print(f"📄 Dataset           : {DATASET_PATH}")
print(f"🤖 Modelo            : {MODEL_PATH}")

# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(title="CRYSTAL API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helper: limpiar NaN / None para JSON ─────────────────────────────
def _safe(val):
    if val is None:
        return ""
    try:
        if isinstance(val, float) and math.isnan(val):
            return ""
    except Exception:
        pass
    return str(val) if not isinstance(val, str) else val

# ── Cargar dataset ────────────────────────────────────────────────────
def _cargar_dataset() -> list:
    if not os.path.exists(DATASET_PATH):
        print(f"⚠️  dataset.json NO encontrado en:\n   {DATASET_PATH}")
        print("   Verifica que la carpeta modeloIA/dataset/ exista y tenga dataset.json")
        return []

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    validas = []
    for p in raw:
        opciones = p.get("opciones", [])
        if not isinstance(opciones, list) or len(opciones) < 2:
            continue
        if not str(p.get("pregunta", "")).strip():
            continue
        validas.append(p)

    print(f"✅ Dataset cargado: {len(validas)} preguntas válidas de {len(raw)} totales")
    return validas

DATASET: list = _cargar_dataset()

# ── Cargar modelo IA (completamente opcional) ─────────────────────────
model     = None
le_uni    = None
le_area   = None
tokenizer = None
device    = None

def _cargar_modelo():
    global model, le_uni, le_area, tokenizer, device

    archivos = [MODEL_PATH, ENC_UNI_PATH, ENC_AREA_PATH]
    if not all(os.path.exists(p) for p in archivos):
        faltantes = [p for p in archivos if not os.path.exists(p)]
        print("ℹ️  Modelo IA incompleto — /predict deshabilitado")
        for f in faltantes:
            print(f"   Falta: {f}")
        return

    print("🔄 Cargando modelo IA (puede tardar unos segundos)...")
    try:
        import torch
        import joblib
        from transformers import AutoTokenizer

        # entrenamiento.py puede estar en la raíz o en modeloIA/red_neuronal/
        # Intentar ambas ubicaciones
        entrenamiento_paths = [
            PROJECT_ROOT,
            os.path.join(PROJECT_ROOT, "modeloIA"),
            os.path.join(PROJECT_ROOT, "modeloIA", "red_neuronal"),
        ]
        for p in entrenamiento_paths:
            if p not in sys.path:
                sys.path.insert(0, p)

        from entrenamiento import MultimodalExamModel

        device    = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        le_uni    = joblib.load(ENC_UNI_PATH)
        le_area   = joblib.load(ENC_AREA_PATH)
        tokenizer = AutoTokenizer.from_pretrained(
            "dccuchile/bert-base-spanish-wwm-uncased"
        )
        model = MultimodalExamModel(
            num_universidades=len(le_uni.classes_),
            num_areas=len(le_area.classes_),
        ).to(device)
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        model.eval()
        print(f"✅ Modelo IA listo ({device})")

    except ImportError as e:
        print(f"⚠️  Falta una dependencia del modelo IA: {e}")
        print("   pip install torch torchvision transformers joblib")
        model = None
    except Exception as e:
        print(f"⚠️  Error al cargar el modelo IA: {e}")
        print("   La API sigue funcionando sin /predict")
        model = None

_cargar_modelo()

# ── Schemas ───────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    pregunta: str

class ExamenRequest(BaseModel):
    universidad: str
    area:        Optional[str] = None
    total:       int = 10
    nivel:       str = "mixto"

# ── Endpoints ─────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "mensaje":              "CRYSTAL API funcionando ✅",
        "docs":                 "/docs",
        "health":               "/health",
        "modelo_ia_activo":     model is not None,
        "preguntas_en_dataset": len(DATASET),
    }

@app.get("/health")
def health():
    return {
        "status":          "ok",
        "device":          str(device) if device else "cpu",
        "modelo_activo":   model is not None,
        "total_preguntas": len(DATASET),
    }

@app.get("/universidades")
def listar_universidades():
    unis = sorted({
        str(p.get("universidad", "")).strip()
        for p in DATASET
        if str(p.get("universidad", "")).strip()
    })
    return {"universidades": unis}

@app.get("/areas")
def listar_areas(universidad: str = ""):
    areas = sorted({
        str(p.get("area", "")).strip()
        for p in DATASET
        if (
            not universidad
            or str(p.get("universidad","")).strip().upper() == universidad.strip().upper()
        )
        and str(p.get("area","")).strip()
        and str(p.get("area","")).strip().lower() not in ("nan", "none", "")
    })
    return {"areas": areas}

@app.post("/predict")
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Modelo IA no disponible. Entrena primero con: python entrenamiento.py",
        )
    import torch
    enc = tokenizer(
        req.pregunta, return_tensors="pt",
        truncation=True, padding=True, max_length=128,
    )
    input_ids      = enc["input_ids"].to(device)
    attention_mask = enc["attention_mask"].to(device)
    pixel_values   = torch.zeros(1, 3, 224, 224).to(device)

    with torch.no_grad():
        dif, uni_logits, area_logits = model(input_ids, attention_mask, pixel_values)

    uni_idx  = torch.argmax(uni_logits,  dim=1).item()
    area_idx = torch.argmax(area_logits, dim=1).item()

    return {
        "dificultad":  round(float(dif.item()), 3),
        "universidad": le_uni.inverse_transform([uni_idx])[0],
        "area":        le_area.inverse_transform([area_idx])[0],
    }

@app.post("/generar-examen")
def generar_examen(req: ExamenRequest):
    RANGOS = {
        "facil":   (0.00, 0.40),
        "medio":   (0.35, 0.65),
        "dificil": (0.60, 1.00),
        "mixto":   None,
    }
    rango = RANGOS.get(req.nivel.lower())

    pool = []
    for p in DATASET:
        uni_ok = (
            str(p.get("universidad","")).strip().upper()
            == req.universidad.strip().upper()
        )
        area_ok = (
            not req.area
            or str(p.get("area","")).strip().upper() == req.area.strip().upper()
        )
        if not (uni_ok and area_ok):
            continue
        if rango:
            try:
                dif = float(p.get("dificultad", 0.5))
                if not (rango[0] <= dif <= rango[1]):
                    continue
            except (TypeError, ValueError):
                pass
        pool.append(p)

    # Fallback: si quedó vacío, usar toda la universidad sin filtro de área/nivel
    if not pool:
        pool = [
            p for p in DATASET
            if str(p.get("universidad","")).strip().upper()
            == req.universidad.strip().upper()
        ]
        if not pool:
            unis = sorted({str(p.get("universidad","")).strip() for p in DATASET})
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No hay preguntas para '{req.universidad}'. "
                    f"Universidades disponibles: {unis}"
                ),
            )

    muestra = random.sample(pool, min(req.total, len(pool)))

    resultado = []
    for p in muestra:
        item = copy.deepcopy(p)
        item.pop("respuesta",    None)   # ← nunca enviar la respuesta al frontend
        item.pop("imagen_path",  None)
        item.pop("grupo_visual", None)

        # Limpiar NaN en strings
        for key in ("area", "tema", "universidad"):
            item[key] = _safe(item.get(key, ""))

        # Limpiar prefijos "A) " "a." etc. de las opciones
        opciones = item.get("opciones", [])
        if isinstance(opciones, list):
            limpias = []
            for opt in opciones:
                txt = re.sub(r'^[A-Da-d][)\.\-]?\s*', '', str(opt).strip())
                if txt:
                    limpias.append(txt)
            item["opciones"] = limpias

        resultado.append(item)

    return {"preguntas": resultado, "total": len(resultado)}

@app.post("/verificar-respuestas")
def verificar(payload: dict):
    ids_respuestas: dict = payload.get("respuestas", {})
    if not ids_respuestas:
        raise HTTPException(status_code=400, detail="No se enviaron respuestas")

    # Índice id→pregunta para búsqueda O(1)
    idx = {str(p.get("id", "")): p for p in DATASET}

    resultados = []
    for pid, resp_usuario in ids_respuestas.items():
        pregunta = idx.get(str(pid))
        if not pregunta:
            continue
        resp_correcta = str(pregunta.get("respuesta", "")).strip().upper()
        correcto      = resp_usuario.strip().upper() == resp_correcta
        resultados.append({
            "id":                 str(pid),
            "correcto":           correcto,
            "respuesta_usuario":  resp_usuario.strip().upper(),
            "respuesta_correcta": resp_correcta,
            "tema":               _safe(pregunta.get("tema",        "")),
            "area":               _safe(pregunta.get("area",        "")),
            "universidad":        _safe(pregunta.get("universidad", "")),
        })

    return {
        "resultados":  resultados,
        "total":       len(resultados),
        "correctas":   sum(1 for r in resultados if r["correcto"]),
        "incorrectas": sum(1 for r in resultados if not r["correcto"]),
    }