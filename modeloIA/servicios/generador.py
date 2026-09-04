import re
import os
import random
import torch
import csv
import json
import base64
import mimetypes
import time
import urllib.request
import urllib.error
from collections import defaultdict
from transformers import AutoTokenizer

JSON_PATH = "modeloIA/configuraciones/reglas_universidades.json"

def cargar_configuracion_universidades():
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

# =========================
# PROVEEDORES
# =========================
PROVEEDORES = {
    "Groq (Llama 3 - GRATIS)": {
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "modelo": "llama-3.3-70b-versatile",
        "modelo_vision": "meta-llama/llama-4-scout-17b-16e-instruct",
        "formato": "openai",
        "key_env": "GROQ_API_KEY",
        "key_url": "https://console.groq.com/keys",
        "gratuito": True,
    },
    "Google Gemini (GRATIS)": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "modelo": "gemini-2.0-flash",
        "modelo_vision": "gemini-2.0-flash",
        "formato": "gemini",
        "key_env": "GEMINI_API_KEY",
        "key_url": "https://aistudio.google.com/app/apikey",
        "gratuito": True,
    },
    "Ollama (Local - GRATIS)": {
        "url": "http://localhost:11434/api/chat",
        "modelo": "llama3",
        "modelo_vision": "llava",
        "formato": "ollama",
        "key_env": "",
        "key_url": "https://ollama.com/download",
        "gratuito": True,
    },
    "Anthropic Claude": {
        "url": "https://api.anthropic.com/v1/messages",
        "modelo": "claude-sonnet-4-6",
        "modelo_vision": "claude-sonnet-4-6",
        "formato": "anthropic",
        "key_env": "ANTHROPIC_API_KEY",
        "key_url": "https://console.anthropic.com/settings/keys",
        "gratuito": False,
    },
}

# Clase generadora de examenes:
class GeneradorExamen:
    def __init__(self, ruta_dataset, modelo=None, label_encoder=None,
                 proveedor_ia="Ollama (Local - GRATIS)", api_key="",
                 modelo_ollama="llama3"):
        self.ruta_dataset  = ruta_dataset
        self.modelo        = modelo
        self.label_encoder = label_encoder
        self.proveedor_ia  = proveedor_ia
        self.api_key       = api_key
        self.modelo_ollama = modelo_ollama

        self.tokenizer = AutoTokenizer.from_pretrained(
            "dccuchile/bert-base-spanish-wwm-uncased"
        )

        self.data = self.cargar_dataset()

        # Cargar configuración estricta:
        try:
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                self.config_examen = json.load(f)            
        except Exception:
            self.config_examen = {}
            print("⚠️ Advertencia: No se encontró reglas_universidades.json.")

    # Método para crear examen usando las reglas del JSON:
    def generar_examen_estricto(self, institucion, area):
        reglas_area = self.config_examen.get(institucion, {}).get(area)
        
        if not reglas_area:
            raise ValueError(f"No hay configuración en el JSON para {institucion} - {area}")

        examen_final = []
        print(f"\n--- Generando Examen Estricto: {institucion} - {area} ---")
        
        # Usamos .get('materias', {}) por si la estructura del JSON varía un poco
        materias = reglas_area.get('materias', reglas_area) 

        for materia, info in materias.items():
            # info puede ser un int (cantidad) o un dict con {"cantidad": X, "temas": {...}}
            cantidad_necesaria = info if isinstance(info, int) else info.get('cantidad', 0)
            
            # Buscar preguntas en el dataset que coincidan (insensible a mayúsculas)
            pool_materia = [
                p for p in self.data 
                if str(p.get('materia', p.get('tema', ''))).strip().lower() == materia.lower()
                and str(p.get('universidad', '')).strip().lower() == institucion.lower()
            ]
            
            if len(pool_materia) < cantidad_necesaria:
                print(f"⚠️ ADVERTENCIA: Faltan preguntas de {materia}. Tienes {len(pool_materia)}, necesitas {cantidad_necesaria}")
                examen_final.extend(pool_materia) # Tomamos todas las que haya
            else:
                seleccionadas = random.sample(pool_materia, cantidad_necesaria)
                examen_final.extend(seleccionadas)
                
            print(f"✔ {materia}: {min(len(pool_materia), cantidad_necesaria)}/{cantidad_necesaria} añadidas.")

        random.shuffle(examen_final)
        return examen_final

    # ─────────────────────────────────────────
    # Cargar dataset (JSON o CSV)
    # ─────────────────────────────────────────
    def cargar_dataset(self):
        ext = os.path.splitext(self.ruta_dataset)[1].lower()

        def parsear_opciones(texto):
            if isinstance(texto, list):
                return texto
            partes = texto.split(";")
            opciones = []
            for p in partes:
                p = p.strip()
                if ")" in p:
                    p = p.split(")", 1)[1].strip()
                opciones.append(p)
            return opciones

        if ext == ".json":
            with open(self.ruta_dataset, "r", encoding="utf-8") as f:
                raw = json.load(f)
            data = []
            for row in raw:
                row = dict(row)
                row["opciones"] = parsear_opciones(row.get("opciones", []))
                try:
                    row["dificultad"] = float(row.get("dificultad", 0.5))
                except (ValueError, TypeError):
                    row["dificultad"] = 0.5
                data.append(row)
            return data
        else:
            # Fallback CSV
            data = []
            with open(self.ruta_dataset, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    row["opciones"] = parsear_opciones(row.get("opciones",""))
                    try:
                        row["dificultad"] = float(row.get("dificultad", 0.5))
                    except (ValueError, KeyError):
                        row["dificultad"] = 0.5
                    data.append(row)
            return data

    # ─────────────────────────────────────────
    # Llamada genérica a cualquier proveedor
    # ─────────────────────────────────────────
    def _llamar_ia(self, prompt):
        cfg     = PROVEEDORES[self.proveedor_ia]
        fmt     = cfg["formato"]
        api_key = self.api_key

        if fmt != "ollama" and not api_key:
            raise Exception(
                f"Falta la API Key para {self.proveedor_ia}.\n"
                f"Obtén una en: {cfg['key_url']}"
            )

        # ── OpenAI-compatible (Groq) ──────────────
        if fmt == "openai":
            payload = json.dumps({
                "model": cfg["modelo"],
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 8000,
            }).encode("utf-8")
            req = urllib.request.Request(
                cfg["url"], data=payload,
                headers={
                    "Content-Type":  "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "User-Agent":    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept":        "application/json",
                    "Origin":        "https://console.groq.com",
                    "Referer":       "https://console.groq.com/",
                },
                method="POST"
            )
            data = self._hacer_peticion(req)
            return data["choices"][0]["message"]["content"]

        # ── Anthropic Claude ──────────────────────
        elif fmt == "anthropic":
            payload = json.dumps({
                "model": cfg["modelo"],
                "max_tokens": 8000,
                "messages": [{"role": "user", "content": prompt}],
            }).encode("utf-8")
            req = urllib.request.Request(
                cfg["url"], data=payload,
                headers={
                    "Content-Type":      "application/json",
                    "anthropic-version": "2023-06-01",
                    "x-api-key":         api_key,
                },
                method="POST"
            )
            data = self._hacer_peticion(req)
            return "".join(
                b.get("text", "") for b in data.get("content", [])
                if b.get("type") == "text"
            )

        # ── Google Gemini ─────────────────────────
        elif fmt == "gemini":
            url = f"{cfg['url']}?key={api_key}"
            payload = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": 8000, "temperature": 0.2},
            }).encode("utf-8")
            req = urllib.request.Request(
                url, data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            data = self._hacer_peticion(req)
            return data["candidates"][0]["content"]["parts"][0]["text"]

        # ── Ollama local ──────────────────────────
        elif fmt == "ollama":
            modelo = self.modelo_ollama or cfg["modelo"]
            payload = json.dumps({
                "model":    modelo,
                "messages": [{"role": "user", "content": prompt}],
                "stream":   False,
            }).encode("utf-8")
            req = urllib.request.Request(
                cfg["url"], data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            data = self._hacer_peticion(req)
            return data["message"]["content"]

        else:
            raise Exception(f"Formato desconocido: {fmt}")

    def _hacer_peticion(self, req):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                msg = json.loads(body).get("error", {})
                msg = msg.get("message", body) if isinstance(msg, dict) else str(msg)
            except Exception:
                msg = body
            raise Exception(f"Error HTTP {e.code}: {msg}")
        except urllib.error.URLError as e:
            raise Exception(
                f"No se pudo conectar con {self.proveedor_ia}: {e.reason}\n"
                "Verifica tu conexión o que el servicio esté disponible."
            )

    # ─────────────────────────────────────────
    # Utilidades de imagen
    # ─────────────────────────────────────────
    def _imagen_a_base64(self, ruta):
        """Convierte una imagen local a base64. Retorna (b64_str, mime_type)."""
        if not ruta or not os.path.exists(ruta):
            return None, None
        mime, _ = mimetypes.guess_type(ruta)
        mime = mime or "image/png"
        with open(ruta, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8"), mime

    def _llamar_ia_vision(self, imagenes_b64, prompt, mimes=None):
        """
        Llama a la IA con una lista de imágenes en base64 + un prompt de texto.
        imagenes_b64 : lista de strings base64
        mimes        : lista de mime types (ej: ["image/png", "image/jpeg"])
        """
        cfg    = PROVEEDORES[self.proveedor_ia]
        fmt    = cfg["formato"]
        api_key = self.api_key
        modelo = cfg.get("modelo_vision", cfg["modelo"])
        mimes  = mimes or ["image/png"] * len(imagenes_b64)

        if fmt != "ollama" and not api_key:
            raise Exception(
                f"Falta la API Key para {self.proveedor_ia}.\n"
                f"Obtén una en: {cfg['key_url']}"
            )

        # ── OpenAI-compatible (Groq / Llama-4-Scout) ──
        if fmt == "openai":
            parts = [{"type": "text", "text": prompt}]
            for b64, mime in zip(imagenes_b64, mimes):
                parts.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{b64}"}
                })
            payload = json.dumps({
                "model": modelo,
                "messages": [{"role": "user", "content": parts}],
                "temperature": 0.2, "max_tokens": 8000,
            }).encode("utf-8")
            req = urllib.request.Request(
                cfg["url"], data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json",
                },
                method="POST"
            )
            data = self._hacer_peticion(req)
            return data["choices"][0]["message"]["content"]

        # ── Anthropic Claude ──
        elif fmt == "anthropic":
            parts = []
            for b64, mime in zip(imagenes_b64, mimes):
                parts.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": mime, "data": b64}
                })
            parts.append({"type": "text", "text": prompt})
            payload = json.dumps({
                "model": modelo, "max_tokens": 8000,
                "messages": [{"role": "user", "content": parts}],
            }).encode("utf-8")
            req = urllib.request.Request(
                cfg["url"], data=payload,
                headers={
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01",
                    "x-api-key": api_key,
                },
                method="POST"
            )
            data = self._hacer_peticion(req)
            return "".join(
                b.get("text", "") for b in data.get("content", [])
                if b.get("type") == "text"
            )

        # ── Google Gemini ──
        elif fmt == "gemini":
            parts_gemini = [{"text": prompt}]
            for b64, mime in zip(imagenes_b64, mimes):
                parts_gemini.append({"inline_data": {"mime_type": mime, "data": b64}})
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={api_key}"
            payload = json.dumps({
                "contents": [{"parts": parts_gemini}],
                "generationConfig": {"maxOutputTokens": 8000, "temperature": 0.2},
            }).encode("utf-8")
            req = urllib.request.Request(
                url, data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            data = self._hacer_peticion(req)
            return data["candidates"][0]["content"]["parts"][0]["text"]

        # ── Ollama local (LLaVA) ──
        elif fmt == "ollama":
            modelo_local = self.modelo_ollama or modelo
            payload = json.dumps({
                "model": modelo_local,
                "messages": [{
                    "role": "user",
                    "content": prompt,
                    "images": imagenes_b64  # Ollama acepta lista de b64 directo
                }],
                "stream": False,
            }).encode("utf-8")
            req = urllib.request.Request(
                cfg["url"], data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            data = self._hacer_peticion(req)
            return data["message"]["content"]

        else:
            raise Exception(f"Formato de visión desconocido: {fmt}")

    def _parsear_preguntas_json(self, texto):
        texto = texto.strip()
        if texto.startswith("```"):
            partes = texto.split("```")
            texto  = partes[1] if len(partes) > 1 else texto
            if texto.startswith("json"):
                texto = texto[4:]
        inicio = texto.find("{")
        fin    = texto.rfind("}") + 1
        if inicio != -1 and fin > inicio:
            texto = texto[inicio:fin]
        return json.loads(texto.strip())

    # ─────────────────────────────────────────
    # Analizador de Imagenes
    # ─────────────────────────────────────────

    def analizar_imagen_con_ia(ruta_imagen, proveedor):
        """Usa un modelo de visión para etiquetar y agrupar la imagen."""
        # Convertir imagen a Base64
        with open(ruta_imagen, "rb") as img_file:
            b64_data = base64.b64encode(img_file.read()).decode('utf-8')

        prompt = "Describe esta imagen de examen y asígnale una categoría técnica para agruparla (ej: geometria_plana, mapa_politico)."
        
        # Aquí llamarías a Gemini-2.0-Flash o Llama-3-Vision pasándole el Base64
        respuesta = call_vision_api(prompt, b64_data) 
        return respuesta # Devuelve {descripcion, etiqueta}

    # ─────────────────────────────────────────
    # MODO MAESTRO / INSTRUCTOR
    # ─────────────────────────────────────────
    
    def tutor_explicar_concepto(self, pregunta_o_concepto, ruta_imagen=None):
        """
        La IA actúa como maestro. Si se pasa ruta_imagen (o la pregunta tiene
        imagen_path en el dataset), la incluye como contexto visual.
        """
        
        prompt = (
            f"Eres un maestro experto, paciente y claro. Un alumno te hace la siguiente "
            f"pregunta o duda: '{pregunta_o_concepto}'.\n\n"
            f"Explícale el concepto paso a paso, usando analogías simples si es necesario, "
            f"y dale ejemplos prácticos. Si es un problema matemático o de física, explícale "
            f"el desarrollo. Termina siempre con un pequeño 'Tip de estudio'."
        )

        # Intentar obtener imagen del dataset si no se pasó una ruta directa
        if not ruta_imagen:
            texto_busqueda = pregunta_o_concepto.strip().lower()
            for p in self.data:
                if texto_busqueda in str(p.get("pregunta", "")).lower():
                    candidato = p.get("imagen_path") or p.get("imagen")
                    if candidato and os.path.exists(str(candidato)):
                        ruta_imagen = candidato
                        print(f"🖼️  Imagen encontrada en dataset: {ruta_imagen}")
                        break

        # Si hay imagen, usar visión
        if ruta_imagen and os.path.exists(str(ruta_imagen)):
            b64, mime = self._imagen_a_base64(ruta_imagen)
            if b64:
                print(f"👨‍🏫 Analizando imagen + duda con {self.proveedor_ia}...")
                
                try:
                    return self._llamar_ia_vision([b64], prompt, [mime])

                except Exception as e:
                    print(f"⚠️  Visión falló ({e}), usando solo texto...")

        print(f"👨‍🏫 Analizando tu duda con {self.proveedor_ia}...")
        return self._llamar_ia(prompt)

    def tutor_explicar_materia(self, materia):
        """La IA genera una guía de estudio estructurada para una materia entera."""
        prompt = (
            f"Eres un maestro experto preparando a un alumno para su examen de admisión. "
            f"El alumno necesita un repaso general y estructurado de la materia: '{materia}'.\n\n"
            f"Crea una guía de estudio detallada. Enumera los temas principales y subtemas "
            f"(ej. si es Física: Cinemática, Dinámica, Termodinámica). Para cada tema, "
            f"da una breve descripción y resalta las fórmulas, fechas o conceptos clave "
            f"que SIEMPRE vienen en los exámenes de admisión."
        )
        print(f"👨‍🏫 Preparando temario de {materia} con {self.proveedor_ia}...")
        return self._llamar_ia(prompt)

    # ─────────────────────────────────────────
    # Filtros
    # ─────────────────────────────────────────
    def filtrar_preguntas(self, institucion, rango_dificultad=None, area=None):
        # Convertimos a string y limpiamos para evitar el error de float
        resultado = [
            p for p in self.data 
            if str(p.get("universidad", "")).strip().lower() == str(institucion).strip().lower()
        ]

        if area:
            area_buscada = str(area).strip().lower()
            resultado = [
                p for p in resultado 
                if str(p.get("area", "")).strip().lower() == area_buscada
            ]

        if rango_dificultad:
            min_d, max_d = rango_dificultad
            resultado = [
                p for p in resultado 
                if min_d <= float(p.get("dificultad", 0.5)) <= max_d
            ]

        return resultado

    def clasificar_por_tema(self, preguntas):
        temas = defaultdict(list)
        for p in preguntas:
            # Aseguramos que el tema sea string, si es nulo usamos "General"
            tema_raw = p.get("tema")
            nombre_tema = str(tema_raw).strip().lower() if tema_raw and str(tema_raw).lower() != "nan" else "general"
            temas[nombre_tema].append(p)
        return temas

    def construir_config(self, temas_disponibles, total_preguntas, temas_dict=None):
        num_temas = len(temas_disponibles)
        if num_temas == 0:
            return {}

        base     = total_preguntas // num_temas
        sobrante = total_preguntas % num_temas
        config   = {}

        for i, tema in enumerate(temas_disponibles):
            cantidad = base + (1 if i < sobrante else 0)
            if temas_dict and tema in temas_dict:
                cantidad = min(cantidad, len(temas_dict[tema]))
            config[tema] = cantidad

        return config

    # ─────────────────────────────────────────
    # NLP (BETO)
    # ─────────────────────────────────────────
    def vectorizar(self, texto):
        return self.tokenizer(
            texto,
            truncation=True,
            padding='max_length',
            max_length=128,
            return_tensors="pt"
        )

    def predecir_dificultad(self, pregunta):
        if not self.modelo:
            return pregunta.get("dificultad", 0.5)

        texto = pregunta["pregunta"] + " " + str(pregunta["opciones"])
        encoding = self.vectorizar(texto)

        with torch.no_grad():
            # Desempaquetar los 3 valores: dificultad, universidad, area
            dificultad, _, _ = self.modelo(
                encoding["input_ids"],
                encoding["attention_mask"]
            )
        return dificultad.item()

    # ─────────────────────────────────────────
    # Selección desde dataset
    # ─────────────────────────────────────────
    def seleccionar_preguntas(self, temas, config):
        examen = []

        for tema, cantidad in config.items():
            if tema not in temas:
                print(f"⚠️  Tema '{tema}' no encontrado, se omite.")
                continue

            disponibles = sorted(
                temas[tema],
                key=lambda x: self.predecir_dificultad(x),
                reverse=True
            )

            seleccion = random.sample(
                disponibles,
                min(cantidad, len(disponibles))
            )
            examen.extend(seleccion)

        random.shuffle(examen)
        return examen

    # ─────────────────────────────────────────
    # Generación 100% IA (por chunks + retry)
    # ─────────────────────────────────────────
    def generar_con_ia(self, institucion, total_preguntas, nivel_dificultad):
        preguntas_base = [
            p for p in self.data
            if p["universidad"].strip().lower() == institucion.strip().lower()
        ]

        if not preguntas_base:
            raise ValueError(
                f"No hay preguntas de '{institucion}' en el dataset "
                "para usar como referencia de estilo."
            )

        temas = list({p["tema"].strip().lower() for p in preguntas_base})
        areas = list({p.get("area","").strip() for p in preguntas_base if p.get("area","").strip()})

        # Ejemplos reales como referencia de estilo
        # Ejemplos reales como referencia de estilo (con imágenes si las tienen)
        ejemplos       = []
        ejemplos_b64   = []
        ejemplos_mimes = []

        for tema in temas[:4]:
            muestra = [
                p for p in preguntas_base
                if p["tema"].strip().lower() == tema
            ][:2]
            for p in muestra:
                opciones_str = " ; ".join(
                    p["opciones"] if isinstance(p["opciones"], list)
                    else p["opciones"].split(";")
                )
                ejemplos.append(
                    f'Area: {p.get("area","No especificada")}\n'
                    f'Tema: {tema}\n'
                    f'Pregunta: {p["pregunta"]}\n'
                    f'Opciones: {opciones_str}\n'
                    f'Respuesta: {p.get("respuesta", "A")}'
                )
                # Adjuntar imagen del ejemplo si existe
                ruta_img = p.get("imagen_path") or p.get("imagen")
                if ruta_img and os.path.exists(str(ruta_img)):
                    b64, mime = self._imagen_a_base64(ruta_img)
                    if b64:
                        ejemplos_b64.append(b64)
                        ejemplos_mimes.append(mime)

        nivel_desc = {
            "facil":   "fáciles (conceptos básicos, definiciones directas)",
            "medio":   "de dificultad media (aplicación de fórmulas y conceptos)",
            "dificil": "difíciles (análisis, cálculo avanzado, razonamiento complejo)",
            "mixto":   "variadas (mezcla de fácil, media y difícil)",
        }.get(nivel_dificultad.lower(), "variadas")

        temas_str    = ", ".join(temas)
        areas_str    = ", ".join(areas) if areas else "No especificadas"
        ejemplos_str = "\n\n".join(ejemplos[:8])

        # ── Dividir en chunks de 30 preguntas ─────
        CHUNK     = 30
        chunks    = []
        restantes = total_preguntas
        while restantes > 0:
            chunks.append(min(CHUNK, restantes))
            restantes -= CHUNK

        cfg = PROVEEDORES[self.proveedor_ia]
        print(f"🤖 Generando con {self.proveedor_ia} ({cfg['modelo']})...")
        print(f"   ({len(chunks)} llamadas de ~{CHUNK} preguntas c/u)")

        todas_preguntas = []

        for i, cantidad_chunk in enumerate(chunks, 1):
            print(f"   Parte {i}/{len(chunks)} — {cantidad_chunk} preguntas...")

            prompt = f"""Eres un experto creador de exámenes de admisión para {institucion}.

Genera exactamente {cantidad_chunk} preguntas de opción múltiple {nivel_desc}.
Areas del examen: {areas_str}
Temas disponibles: {temas_str}

Ejemplos del estilo real del examen (con su area y tema):
{ejemplos_str}

Devuelve ÚNICAMENTE un JSON válido (sin texto extra, sin backticks, sin comentarios):
{{
  "preguntas": [
    {{
      "pregunta": "Texto completo de la pregunta",
      "opciones": ["opcion A", "opcion B", "opcion C", "opcion D"],
      "respuesta": "A",
      "dificultad": 0.5,
      "universidad": "{institucion}",
      "area": "area del examen (ej: Area 1, Area Medico Biologica)",
      "tema": "nombre del tema especifico"
    }}
  ]
}}

Reglas:
- Exactamente {cantidad_chunk} preguntas ORIGINALES
- NO repitas preguntas anteriores
- Dificultad: 0.0 (fácil) a 1.0 (difícil)
- Respuesta: solo la letra A, B, C o D
- Distribuye entre las areas: {areas_str}
- Distribuye entre los temas: {temas_str}
- Asigna el area correcta segun el contenido de cada pregunta
- El JSON debe estar completo y bien cerrado
"""
            MAX_REINTENTOS = 3
            for intento in range(1, MAX_REINTENTOS + 1):
                try:
                    # Usar visión si hay imágenes de ejemplo disponibles para este chunk
                    if ejemplos_b64:
                        try:
                            respuesta = self._llamar_ia_vision(
                                ejemplos_b64[:3],  # Máximo 3 imágenes por llamada
                                prompt,
                                ejemplos_mimes[:3]
                            )
                        except Exception as e_vision:
                            print(f"   ⚠️  Visión no disponible ({e_vision}), usando solo texto...")
                            respuesta = self._llamar_ia(prompt)
                    else:
                        respuesta = self._llamar_ia(prompt)
                    
                    resultado       = self._parsear_preguntas_json(respuesta)
                    chunk_preguntas = resultado.get("preguntas", [])

                    # Normalizar opciones a lista
                    for p in chunk_preguntas:
                        if isinstance(p["opciones"], str):
                            p["opciones"] = [o.strip() for o in p["opciones"].split(";")]

                    todas_preguntas.extend(chunk_preguntas)
                    print(f"   ✅ Parte {i}: {len(chunk_preguntas)} preguntas obtenidas")
                    break  # éxito — salir del loop de reintentos

                except Exception as e:
                    mensaje = str(e)

                    # ── Rate limit 429: esperar y reintentar ──
                    if "429" in mensaje or "Rate limit" in mensaje:
                        espera = 65  # default seguro
                        try:
                            match = re.search(r"try again in (\d+\.?\d*)s", mensaje)
                            if match:
                                espera = int(float(match.group(1))) + 5  # +5s de margen
                        except Exception:
                            pass

                        print(f"   ⏳ Rate limit. Esperando {espera}s... "
                              f"(intento {intento}/{MAX_REINTENTOS})")
                        time.sleep(espera)

                    else:
                        # Error distinto — no reintentar
                        print(f"   ⚠️  Parte {i} falló: {e}")
                        break

            # Pausa base entre llamadas para no saturar la API
            if i < len(chunks):
                time.sleep(2)

        if not todas_preguntas:
            raise Exception(
                "No se pudo generar ninguna pregunta.\n"
                "Verifica tu API Key y conexión."
            )

        print(f"✅ {len(todas_preguntas)} preguntas generadas por {self.proveedor_ia}")
        return todas_preguntas

    # ─────────────────────────────────────────
    # Generador principal
    # ─────────────────────────────────────────
    def generar_examen(self, institucion, total_preguntas=120, nivel_dificultad="mixto", modo="dataset", area=None):
        RANGOS = {
            "facil":   (0.0,  0.4),
            "medio":   (0.35, 0.65),
            "dificil": (0.6,  1.0),
            "mixto":   None,
        }

        if modo == "ia":
            return self.generar_con_ia(institucion, total_preguntas, nivel_dificultad)

        rango = RANGOS.get(nivel_dificultad.lower())

        # Si el área es una configuración de porcentajes (dict)
        if isinstance(area, dict):
            examen_compuesto = []
            for nombre_area, pct in area.items():
                cant_area = int(total_preguntas * pct)
                if cant_area == 0: continue
                preguntas_area = self.filtrar_preguntas(institucion, rango_dificultad=rango, area=nombre_area)

                if not preguntas_area:
                    print(f"⚠️ Sin preguntas para el área {nombre_area}, se saltará.")
                    continue
                temas_area = self.clasificar_por_tema(preguntas_area)
                config_area = self.construir_config(list(temas_area.keys()), cant_area, temas_dict=temas_area)
                examen_compuesto.extend(self.seleccionar_preguntas(temas_area, config_area))
            
            random.shuffle(examen_compuesto)
            return examen_compuesto

        # Flujo estándar para área única o todas
        preguntas = self.filtrar_preguntas(institucion, rango_dificultad=rango, area=area)

        if not preguntas:
            raise ValueError(f"No hay preguntas para '{institucion}' con esas características.")

        temas = self.clasificar_por_tema(preguntas)
        config = self.construir_config(list(temas.keys()), total_preguntas, temas_dict=temas)
        return self.seleccionar_preguntas(temas, config)

        print(f"\n📚 Temas para {institucion} ({nivel_dificultad}):")
        for tema, lista in temas.items():
            print(f"   - {tema}: {len(lista)} preguntas disponibles")

        print(f"\n📝 Distribución ({total_preguntas} preguntas solicitadas):")
        for tema, cantidad in config.items():
            print(f"   - {tema}: {cantidad}")

        examen     = self.seleccionar_preguntas(temas, config)
        total_real = len(examen)

        if total_real < total_preguntas:
            faltantes = total_preguntas - total_real
            print(f"\n⚠️  Se generaron {total_real} preguntas (faltan {faltantes}).")
            print("   Agrega más preguntas al dataset o usa modo 'ia' para completar.")

        return examen

    # ─────────────────────────────────────────
    # Output
    # ─────────────────────────────────────────
    def imprimir_examen(self, examen):
        print(f"\n{'='*50}\nEXAMEN — {len(examen)} preguntas\n{'='*50}")
        for i, p in enumerate(examen, 1):
            print(f"\n{i}. {p['pregunta']}")
            for j, opcion in enumerate(p["opciones"]):
                print(f"   {chr(65+j)}) {opcion}")
            if p.get("imagen") and str(p.get("imagen", "")).strip():
                print(f"   🖼️  Imagen: {p['imagen']}")

    def guardar_examen(self, examen, nombre_archivo="examen.txt"):
        with open(nombre_archivo, "w", encoding="utf-8") as f:
            f.write(f"EXAMEN — {len(examen)} preguntas\n{'='*50}\n")
            for i, p in enumerate(examen, 1):
                f.write(f"\n{i}. {p['pregunta']}\n")
                for j, opcion in enumerate(p["opciones"]):
                    f.write(f"   {chr(65+j)}) {opcion}\n")
        print(f"✅ Guardado en '{nombre_archivo}'")