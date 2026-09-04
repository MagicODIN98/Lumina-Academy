// api_service.js — Cliente del backend CRYSTAL
// Detecta automáticamente si la API corre en local o en producción

const API_BASE = (() => {
  // Si hay una variable de entorno configurada (p. ej. en un bundler) úsala
  if (typeof window !== "undefined" && window.__CRYSTAL_API_URL__) {
    return window.__CRYSTAL_API_URL__;
  }
  // En local siempre apuntamos a FastAPI en el puerto 8000
  // En producción cambia esto a tu URL de Railway / Render / etc.
  return "http://localhost:8000";
})();

/**
 * Helper genérico para llamadas a la API.
 * Lanza un Error con el mensaje del servidor si la respuesta no es OK.
 */
async function _fetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let mensaje = `Error ${response.status}`;
    try {
      const body = await response.json();
      mensaje = body.detail || body.message || JSON.stringify(body);
    } catch (_) {
      // No se pudo parsear el cuerpo — usar mensaje genérico
    }
    throw new Error(mensaje);
  }

  return response.json();
}

/**
 * Verifica que la API esté activa.
 * @returns {Promise<{status: string, modelo_activo: boolean, total_preguntas: number}>}
 */
export async function checkHealth() {
  return _fetch("/health");
}

/**
 * Genera un examen con preguntas del dataset.
 * @param {object} params
 * @param {string} params.universidad  - Código de la universidad (ej. "UNAM")
 * @param {string} [params.area]       - Área académica (opcional)
 * @param {number} [params.total=10]   - Número de preguntas
 * @param {string} [params.nivel="mixto"] - "facil" | "medio" | "dificil" | "mixto"
 * @returns {Promise<{preguntas: Array, total: number}>}
 */
export async function generarExamen({ universidad, area = null, total = 10, nivel = "mixto" }) {
  return _fetch("/generar-examen", {
    method: "POST",
    body: JSON.stringify({ universidad, area, total, nivel }),
  });
}

/**
 * Envía las respuestas del usuario y obtiene la corrección.
 * @param {Object.<string, string>} respuestas - Mapa { id_pregunta: "A" }
 * @returns {Promise<{resultados: Array, total: number, correctas: number, incorrectas: number}>}
 */
export async function verificarRespuestas(respuestas) {
  return _fetch("/verificar-respuestas", {
    method: "POST",
    body: JSON.stringify({ respuestas }),
  });
}

/**
 * Predice dificultad, universidad y área de una pregunta usando el modelo IA.
 * Requiere que el modelo esté entrenado (modelo.pth).
 * @param {string} texto - Texto de la pregunta
 * @returns {Promise<{dificultad: number, universidad: string, area: string}>}
 */
export async function predecirPregunta(texto) {
  return _fetch("/predict", {
    method: "POST",
    body: JSON.stringify({ pregunta: texto }),
  });
}

/**
 * Lista las universidades disponibles en el dataset.
 * @returns {Promise<{universidades: string[]}>}
 */
export async function listarUniversidades() {
  return _fetch("/universidades");
}

/**
 * Lista las áreas disponibles (opcionalmente filtradas por universidad).
 * @param {string} [universidad]
 * @returns {Promise<{areas: string[]}>}
 */
export async function listarAreas(universidad = "") {
  const qs = universidad ? `?universidad=${encodeURIComponent(universidad)}` : "";
  return _fetch(`/areas${qs}`);
}
