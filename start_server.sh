#!/usr/bin/env bash
# start_server.sh — Arranca la API CRYSTAL
# Coloca este script en la RAÍZ del proyecto y ejecútalo desde ahí:
#   cd /ruta/a/tu/proyecto
#   bash start_server.sh

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   CRYSTAL API — Servidor FastAPI     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Verificar Python ──────────────────────────────────────────────────
PYTHON=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        PYTHON="$cmd"; break
    fi
done
if [ -z "$PYTHON" ]; then
    echo -e "${RED}✗ Python no encontrado${NC}"; exit 1
fi
echo -e "${GREEN}✓ $($PYTHON --version)${NC}"

# ── Verificar que estamos en la raíz del proyecto ─────────────────────
if [ ! -f "backend/api.py" ]; then
    echo -e "${RED}✗ No encuentro backend/api.py${NC}"
    echo -e "${YELLOW}  Ejecuta este script desde la RAÍZ del proyecto:${NC}"
    echo -e "${CYAN}    cd /ruta/completa/a/tu/proyecto${NC}"
    echo -e "${CYAN}    bash start_server.sh${NC}"
    exit 1
fi
echo -e "${GREEN}✓ backend/api.py encontrado${NC}"

# ── Verificar dataset ─────────────────────────────────────────────────
DATASET="modeloIA/dataset/dataset.json"
if [ ! -f "$DATASET" ]; then
    echo -e "${RED}✗ $DATASET no encontrado${NC}"
    echo -e "${YELLOW}  Verifica que exista: modeloIA/dataset/dataset.json${NC}"
    exit 1
fi
echo -e "${GREEN}✓ dataset.json encontrado${NC}"

# ── Instalar fastapi + uvicorn si faltan ──────────────────────────────
echo -e "${YELLOW}▶ Verificando fastapi y uvicorn...${NC}"
$PYTHON -m pip install --quiet fastapi "uvicorn[standard]" 2>/dev/null
echo -e "${GREEN}✓ Dependencias OK${NC}"

# ── Info del modelo ───────────────────────────────────────────────────
if [ -f "modeloIA/modelo.pth" ]; then
    echo -e "${GREEN}✓ Modelo IA encontrado → /predict disponible${NC}"
else
    echo -e "${YELLOW}⚠  Modelo IA no encontrado → /predict deshabilitado${NC}"
    echo -e "${YELLOW}   Para entrenarlo: $PYTHON entrenamiento.py${NC}"
fi

# ── Arrancar servidor ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}▶ Iniciando en http://localhost:8000${NC}"
echo -e "${CYAN}  → Docs interactivas : http://localhost:8000/docs${NC}"
echo -e "${CYAN}  → Health check      : http://localhost:8000/health${NC}"
echo -e "${YELLOW}  Ctrl+C para detener${NC}"
echo ""

# IMPORTANTE: se ejecuta como "backend.api" porque api.py está en backend/
$PYTHON -m uvicorn backend.api:app \
    --reload \
    --host 0.0.0.0 \
    --port 8000