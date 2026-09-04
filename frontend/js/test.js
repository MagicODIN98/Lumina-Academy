/* ═══════════════════════════════════════════════════════════════════════════
   test.js — Lógica del Test tipo Cisco
   Cronómetro | Navegación | Respuestas | Resultados
═══════════════════════════════════════════════════════════════════════════ */

// NOTA: test.html carga este archivo con type="module".
// La ruta de importación apunta a js/api_service.js desde pages/test.html
import {
  generarExamen,
  verificarRespuestas,
  checkHealth,
} from "../js/api_service.js";

// ── Estado global ────────────────────────────────────────────────────────
let preguntas = [];

const estado = {
  preguntaActual:  0,
  respuestas:      [],   // null | índice 0-3 por cada pregunta
  respondidas:     0,
  correctas:       0,
  incorrectas:     0,
  tiempoInicio:    null,
  tiempoTranscurrido: 0,
  cronometroId:    null,
  testCompletado:  false,
  resultadosIA:    [],   // respuesta del backend tras verificar
};

// ── Utilidades DOM ───────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function mostrarToast(msg, duracion = 3000) {
  let toast = $("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    Object.assign(toast.style, {
      position: "fixed", bottom: "2rem", left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(21, 83, 168, 0.95)", color: "white",
      padding: "1rem 1.5rem", borderRadius: "6px",
      border: "1px solid #6B9DE8", zIndex: "999",
      display: "none", fontFamily: "Epilogue, sans-serif",
      fontSize: "0.9rem", maxWidth: "90vw", textAlign: "center",
    });
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = "block";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = "none"; }, duracion);
}

function abrirModal(id)  { const m = $(id); if (m) m.classList.add("active"); }
function cerrarModal(id) { const m = $(id); if (m) m.classList.remove("active"); }

function pad(n) { return String(n).padStart(2, "0"); }

// ── Cronómetro ────────────────────────────────────────────────────────────
function iniciarCronometro() {
  estado.tiempoInicio = Date.now();
  estado.cronometroId = setInterval(() => {
    estado.tiempoTranscurrido = Math.floor((Date.now() - estado.tiempoInicio) / 1000);
    actualizarCronometro();
  }, 500);
}

function actualizarCronometro() {
  const mins = Math.floor(estado.tiempoTranscurrido / 60);
  const segs = estado.tiempoTranscurrido % 60;
  const el   = $("timerDisplay");
  if (el) el.textContent = `${pad(mins)}:${pad(segs)}`;
}

function detenerCronometro() {
  clearInterval(estado.cronometroId);
}

// ── Carga de pregunta ─────────────────────────────────────────────────────
function cargarPregunta() {
  if (!preguntas.length) return;
  const pregunta  = preguntas[estado.preguntaActual];
  const container = $("optionsContainer");

  // Texto de la pregunta
  const qText = $("questionText");
  if (qText) qText.textContent = pregunta.pregunta || "(sin texto)";

  // Número y dificultad
  const qNum = $("questionNum");
  if (qNum) qNum.textContent = `Pregunta ${estado.preguntaActual + 1} de ${preguntas.length}`;

  const difVal   = parseFloat(pregunta.dificultad ?? 0.5);
  const difLabel = difVal < 0.4 ? "Fácil" : difVal < 0.7 ? "Media" : "Difícil";
  const badge    = $("difficultyBadge");
  if (badge) badge.textContent = difLabel;

  // Opciones
  if (container) {
    container.innerHTML = "";
    const letras = ["A", "B", "C", "D"];
    (pregunta.opciones || []).forEach((opcion, idx) => {
      const div = document.createElement("div");
      div.className = "option";
      div.dataset.idx = idx;

      // Clases de estado
      if (estado.testCompletado) {
        div.classList.add("answered");
        const resIA = estado.resultadosIA.find(r => r.id === pregunta.id);
        if (resIA) {
          const letraCorrecta = resIA.respuesta_correcta;
          const idxCorrecto   = letras.indexOf(letraCorrecta);
          if (idx === idxCorrecto)           div.classList.add("correct");
          else if (idx === estado.respuestas[estado.preguntaActual])
                                              div.classList.add("incorrect");
        }
      } else {
        if (estado.respuestas[estado.preguntaActual] === idx) div.classList.add("selected");
      }

      div.innerHTML = `
        <div class="option-letter">${letras[idx]}</div>
        <div class="option-text">${opcion}</div>
      `;

      if (!estado.testCompletado) {
        div.addEventListener("click", () => seleccionarRespuesta(idx));
      }
      container.appendChild(div);
    });
  }

  // Barra de progreso
  const pct = ((estado.preguntaActual + 1) / preguntas.length) * 100;
  const fill = $("progressFill");
  if (fill) fill.style.width = `${pct}%`;
  const small = $("progressSmall");
  if (small) small.textContent = `${estado.preguntaActual + 1} / ${preguntas.length}`;

  // Botones nav
  const btnPrev = $("btnPrev");
  const btnNext = $("btnNext");
  if (btnPrev) btnPrev.disabled = estado.preguntaActual === 0;
  if (btnNext) btnNext.disabled = estado.preguntaActual === preguntas.length - 1;

  actualizarIndicadores();
}

// ── Selección de respuesta ────────────────────────────────────────────────
function seleccionarRespuesta(idx) {
  if (estado.testCompletado) return;
  if (estado.respuestas[estado.preguntaActual] === null) estado.respondidas++;
  estado.respuestas[estado.preguntaActual] = idx;
  actualizarEstadisticas();
  cargarPregunta();
  generarIndicadores();
}

// ── Indicadores de pregunta ───────────────────────────────────────────────
function generarIndicadores() {
  const container = $("questionIndicator");
  if (!container) return;
  container.innerHTML = "";
  preguntas.forEach((_, idx) => {
    const btn = document.createElement("button");
    btn.className      = "q-indicator-btn";
    btn.textContent    = idx + 1;
    btn.dataset.idx    = idx;
    if (idx === estado.preguntaActual)        btn.classList.add("current");
    if (estado.respuestas[idx] !== null)      btn.classList.add("answered");
    btn.addEventListener("click", () => {
      estado.preguntaActual = idx;
      cargarPregunta();
    });
    container.appendChild(btn);
  });
}

function actualizarIndicadores() {
  document.querySelectorAll(".q-indicator-btn").forEach((btn, idx) => {
    btn.classList.toggle("current",  idx === estado.preguntaActual);
    btn.classList.toggle("answered", estado.respuestas[idx] !== null);
  });
}

// ── Estadísticas sidebar ──────────────────────────────────────────────────
function actualizarEstadisticas() {
  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set("answered",  estado.respondidas);
  set("remaining", preguntas.length - estado.respondidas);
  set("correct",   estado.correctas);
  set("incorrect", estado.incorrectas);
}

// ── Completar test ────────────────────────────────────────────────────────
async function completarTest() {
  if (estado.testCompletado) return;

  // Construir mapa id → letra
  const respuestasMap = {};
  const letras = ["A", "B", "C", "D"];
  preguntas.forEach((pregunta, idx) => {
    const selIdx = estado.respuestas[idx];
    if (selIdx !== null && pregunta.id) {
      respuestasMap[pregunta.id] = letras[selIdx];
    }
  });

  if (Object.keys(respuestasMap).length === 0) {
    mostrarToast("No respondiste ninguna pregunta");
    return;
  }

  const btnSubmit = $("btnSubmit");
  if (btnSubmit) {
    btnSubmit.textContent = "Verificando...";
    btnSubmit.disabled    = true;
  }

  try {
    const resultado = await verificarRespuestas(respuestasMap);

    estado.resultadosIA  = resultado.resultados ?? [];
    estado.correctas     = resultado.correctas   ?? estado.resultadosIA.filter(r => r.correcto).length;
    estado.incorrectas   = resultado.incorrectas ?? estado.resultadosIA.filter(r => !r.correcto).length;
    estado.testCompletado = true;

    detenerCronometro();

    // Actualizar UI de resultados
    const mins = Math.floor(estado.tiempoTranscurrido / 60);
    const segs = estado.tiempoTranscurrido % 60;
    const porcentaje = preguntas.length > 0
      ? Math.round((estado.correctas / preguntas.length) * 100)
      : 0;

    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set("resultTime",       `${pad(mins)}:${pad(segs)}`);
    set("resultScore",      `${estado.correctas}/${preguntas.length}`);
    set("resultCorrect",    estado.correctas);
    set("resultIncorrect",  estado.incorrectas);
    set("resultPercentage", `${porcentaje}%`);

    actualizarEstadisticas();

    // Ocultar controles de navegación
    ["btnPrev", "btnNext", "btnSubmit"].forEach(id => {
      const el = $(id);
      if (el) el.style.display = "none";
    });

    // Recargar pregunta actual para mostrar respuestas coloreadas
    cargarPregunta();
    generarIndicadores();

    // Abrir modal de resultados
    abrirModal("modalResult");

  } catch (err) {
    console.error("Error verificando respuestas:", err);
    mostrarToast(`Error: ${err.message}`);
    if (btnSubmit) {
      btnSubmit.textContent = "Enviar y Terminar";
      btnSubmit.disabled    = false;
    }
  }
}

// ── Inicialización ────────────────────────────────────────────────────────
async function inicializarTest() {
  // Leer parámetros desde la URL (?universidad=UNAM&area=FM&total=10&nivel=mixto)
  const params      = new URLSearchParams(window.location.search);
  const universidad = params.get("universidad") || "UNAM";
  const area        = params.get("area")        || null;
  const total       = parseInt(params.get("total") ?? "10", 10);
  const nivel       = params.get("nivel")       || "mixto";

  // Actualizar título si se pasan parámetros
  const titleEl = document.querySelector(".test-title");
  if (titleEl && params.get("universidad")) {
    titleEl.textContent = `Test — ${universidad}`;
  }

  try {
    // Verificar que la API esté viva primero
    await checkHealth().catch(() => {
      throw new Error(
        "No se pudo conectar con la API. Asegúrate de que el servidor FastAPI esté corriendo:\n" +
        "  cd tu-proyecto && uvicorn api:app --reload"
      );
    });

    const examen = await generarExamen({ universidad, area, total, nivel });
    preguntas    = examen.preguntas;

    if (!preguntas || preguntas.length === 0) {
      throw new Error(`No hay preguntas disponibles para ${universidad}${area ? " – " + area : ""}`);
    }

    // Inicializar estado
    estado.respuestas      = new Array(preguntas.length).fill(null);
    estado.preguntaActual  = 0;
    estado.respondidas     = 0;
    estado.correctas       = 0;
    estado.incorrectas     = 0;
    estado.testCompletado  = false;
    estado.tiempoTranscurrido = 0;

    // Actualizar sidebar "Restantes"
    actualizarEstadisticas();
    const remEl = $("remaining");
    if (remEl) remEl.textContent = preguntas.length;

    cargarPregunta();
    generarIndicadores();
    iniciarCronometro();

  } catch (err) {
    console.error("Error inicializando test:", err);
    // Mostrar error en pantalla de forma visible
    const main = document.querySelector(".test-main");
    if (main) {
      main.innerHTML = `
        <div style="
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; height:100%; gap:1.5rem; padding:2rem;
          color:#F5C400; text-align:center;
        ">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2 style="font-family:Unbounded,sans-serif;font-size:1.4rem;">Error al cargar el examen</h2>
          <p style="color:rgba(255,255,255,0.7);max-width:500px;line-height:1.6;">${err.message}</p>
          <button onclick="window.location.href='dashboard.html'"
            style="background:#1553A8;border:none;color:white;padding:0.8rem 2rem;
                   border-radius:6px;cursor:pointer;font-size:1rem;font-weight:600;">
            Volver al Dashboard
          </button>
        </div>`;
    }
  }
}

// ── Eventos ───────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  inicializarTest();

  // Navegación
  $("btnPrev")?.addEventListener("click", () => {
    if (estado.preguntaActual > 0) {
      estado.preguntaActual--;
      cargarPregunta();
    }
  });

  $("btnNext")?.addEventListener("click", () => {
    if (estado.preguntaActual < preguntas.length - 1) {
      estado.preguntaActual++;
      cargarPregunta();
    }
  });

  // Enviar test
  $("btnSubmit")?.addEventListener("click", async () => {
    const pendientes = preguntas.length - estado.respondidas;
    if (pendientes > 0) {
      if (!confirm(`Aún tienes ${pendientes} pregunta(s) sin responder. ¿Deseas enviar de todas formas?`)) return;
    }
    await completarTest();
  });

  // Salir del test
  $("btnExit")?.addEventListener("click", () => abrirModal("modalExitConfirm"));

  $("btnConfirmCancel")?.addEventListener("click", () => cerrarModal("modalExitConfirm"));

  $("btnConfirmExit")?.addEventListener("click", () => {
    detenerCronometro();
    window.location.href = "dashboard.html";
  });

  // Resultados
  $("btnRetry")?.addEventListener("click", () => location.reload());

  $("btnBackDashboard")?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });

  // Cerrar modal de salida al hacer clic fuera
  $("modalExitConfirm")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) cerrarModal("modalExitConfirm");
  });

  // Teclas de acceso rápido
  document.addEventListener("keydown", e => {
    if (estado.testCompletado) return;
    if (e.key === "ArrowLeft"  && estado.preguntaActual > 0) {
      estado.preguntaActual--; cargarPregunta();
    } else if (e.key === "ArrowRight" && estado.preguntaActual < preguntas.length - 1) {
      estado.preguntaActual++; cargarPregunta();
    } else if (e.key >= "1" && e.key <= "4") {
      seleccionarRespuesta(parseInt(e.key, 10) - 1);
    }
  });
});
