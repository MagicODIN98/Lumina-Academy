// firebase-config.js
// ============================================================
// INSTRUCCIONES:
//   1. Ve a https://console.firebase.google.com
//   2. Crea un proyecto (o usa uno existente)
//   3. Proyecto > Configuración > Tus apps > Web > Agregar app
//   4. Copia los valores en firebaseConfig abajo
//   5. Activa Authentication (Email/Password) y Realtime Database
// ============================================================

const firebaseConfig = {
  // ── REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO FIREBASE ──
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROJECT.firebaseapp.com",
  databaseURL:       "https://TU_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "TU_PROJECT",
  storageBucket:     "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID",
};

// ── Inicializar Firebase de forma segura ──────────────────────
let _firebaseReady = false;

try {
  // Verificar que los valores no sean placeholders
  const isConfigured = firebaseConfig.apiKey &&
                       firebaseConfig.apiKey !== "TU_API_KEY" &&
                       firebaseConfig.databaseURL &&
                       firebaseConfig.databaseURL !== "https://TU_PROJECT-default-rtdb.firebaseio.com";

  if (isConfigured) {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    _firebaseReady = true;
    console.log("✅ Firebase inicializado correctamente");
  } else {
    console.warn(
      "⚠️  Firebase no configurado — la app funciona en MODO DEMO (sin persistencia en la nube).\n" +
      "   Para habilitarlo, edita firebase-config.js con tus credenciales reales."
    );
  }
} catch (error) {
  console.error("Error al inicializar Firebase:", error);
}

// Exponer estado para que otros módulos sepan si Firebase está listo
window._firebaseReady = _firebaseReady;
