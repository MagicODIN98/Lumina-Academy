# CRYSTAL — Sistema Inteligente de Exámenes

Plataforma web para preparación de exámenes de admisión universitaria con IA multimodal.

---

## 📁 Estructura del proyecto

```
proyecto/
├── api.py                  ← API FastAPI (backend)
├── requirements.txt        ← Dependencias Python
├── start_server.sh         ← Script de arranque del servidor
├── dataset.json            ← Base de preguntas
│
├── ── Frontend (HTML) ──
├── index.html              ← Landing page
├── login.html              ← Inicio de sesión
├── new_user.html           ← Registro
├── recover.html            ← Recuperar contraseña
├── dashboard.html          ← Panel principal ← PÁGINA CENTRAL
├── test.html               ← Examen interactivo
├── profile.html            ← Perfil de usuario
│
├── ── JavaScript ──
├── app.js                  ← Lógica del dashboard
├── test.js                 ← Lógica del examen (ES module)
├── api_service.js          ← Cliente de la API (ES module)
├── auth-functions.js       ← Autenticación Firebase + modo demo
├── firebase-config.js      ← Configuración Firebase (EDITAR)
├── universities-areas.js   ← Datos de universidades y áreas
├── login.js / new_user.js / profile.js / recover.js
│
├── ── CSS ──
├── colors.css              ← Variables de color globales
├── styles.css              ← Dashboard
├── test.css                ← Examen
├── login.css / new_user.css / profile.css / recover.css / index.css
│
├── ── IA / Modelo ──
├── entrenamiento.py        ← Entrena el modelo BERT+ResNet
├── modeloIA/
│   ├── modelo.pth          ← Modelo entrenado (generado)
│   ├── label_encoder.pkl   ← Encoder universidades (generado)
│   └── label_encoder_area.pkl ← Encoder áreas (generado)
│
└── ── Herramientas ──
    ├── creador_dataset.py  ← GUI para añadir preguntas
    ├── generador.py        ← Generador de exámenes PDF
    ├── exportar_pdf.py     ← Exportación a PDF
    └── main.py             ← CLI principal
```

---

## 🚀 Puesta en marcha

### 1. Instalar dependencias Python

```bash
pip install -r requirements.txt
```

### 2. Iniciar el servidor API

```bash
# Opción A: script automático
bash start_server.sh

# Opción B: manual
python -m uvicorn api:app --reload --port 8000
```

El servidor queda en `http://localhost:8000`  
Documentación interactiva: `http://localhost:8000/docs`

### 3. Abrir la aplicación web

Abre `index.html` en tu navegador (o usa Live Server en VS Code).

> **Importante**: para que el test funcione necesitas el servidor API corriendo.

---

## 🔑 Configurar Firebase (opcional)

La app funciona en **modo demo** sin Firebase (datos en `localStorage`).  
Para persistencia en la nube con cuentas reales:

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un proyecto → Agrega una app Web
3. Activa **Authentication > Email/Password**
4. Activa **Realtime Database** (modo test para empezar)
5. Copia las credenciales en `firebase-config.js`:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "mi-proyecto.firebaseapp.com",
  databaseURL:       "https://mi-proyecto-default-rtdb.firebaseio.com",
  projectId:         "mi-proyecto",
  storageBucket:     "mi-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc123",
};
```

---

## 🤖 Entrenar el modelo IA

```bash
# Primero asegúrate de tener preguntas en dataset.json
python entrenamiento.py
```

Genera `modeloIA/modelo.pth`, `label_encoder.pkl` y `label_encoder_area.pkl`.  
Una vez entrenado, el endpoint `/predict` queda activo.

---

## 📡 Endpoints de la API

| Método | Ruta                    | Descripción                              |
|--------|-------------------------|------------------------------------------|
| GET    | `/`                     | Info general                             |
| GET    | `/health`               | Estado del servidor y modelo             |
| GET    | `/universidades`        | Lista universidades disponibles          |
| GET    | `/areas?universidad=X`  | Áreas de una universidad                 |
| POST   | `/generar-examen`       | Genera un examen con preguntas           |
| POST   | `/verificar-respuestas` | Corrige las respuestas del usuario       |
| POST   | `/predict`              | Predice dificultad/uni/área (requiere IA)|

### Ejemplo `/generar-examen`

```json
POST http://localhost:8000/generar-examen
{
  "universidad": "UNAM",
  "area": null,
  "total": 10,
  "nivel": "mixto"
}
```

### Ejemplo `/verificar-respuestas`

```json
POST http://localhost:8000/verificar-respuestas
{
  "respuestas": {
    "44f583fb2d7812e0b4a6e64181c15ef5": "A",
    "d53a55ff9f9f37870d7a01ec5bd0adf7": "B"
  }
}
```

---

## 🧪 Flujo de uso del test

```
dashboard.html
    ↓ clic "Practicar" → test.html?universidad=UNAM&total=10&nivel=mixto
test.html
    ↓ test.js llama GET /health
    ↓ test.js llama POST /generar-examen → recibe preguntas SIN respuesta
    ↓ usuario responde
    ↓ test.js llama POST /verificar-respuestas → recibe corrección
    ↓ muestra modal de resultados con puntaje
```

---

## ⚠️ Problemas comunes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Test carga con error | API no está corriendo | `bash start_server.sh` |
| "No hay preguntas para UNAM" | dataset.json vacío o mal ruta | Verifica que `dataset.json` esté en la raíz |
| Firebase no conecta | Credenciales en blanco | Edita `firebase-config.js` o usa modo demo |
| Imágenes de avatares rotas | Carpeta `assets/` ausente | Crea `assets/user_icons/` y `assets/images/` |
| `/predict` devuelve 503 | Modelo no entrenado | Ejecuta `python entrenamiento.py` |

