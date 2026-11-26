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
  apiKey: "AIzaSyALA_NSteGjkE8WAp2_apHgn6fKvo4TjDI",
  authDomain: "lumina-academy-867ed.firebaseapp.com",
  databaseURL: "https://lumina-academy-867ed-default-rtdb.firebaseio.com",
  projectId: "lumina-academy-867ed",
  storageBucket: "lumina-academy-867ed.firebasestorage.app",
  messagingSenderId: "1016158506564",
  appId: "1:1016158506564:web:152038f103b5fd2d55f611",
  measurementId: "G-X07820ZCQ5"
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
