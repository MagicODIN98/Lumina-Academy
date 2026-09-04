import os
import json
import torch
import joblib
import datetime
from servicios.generador import GeneradorExamen, PROVEEDORES
from servicios.exportar_pdf import exportar_pdf
from red_neuronal.entrenamiento import MultimodalExamModel

DATASET_PATH = "modeloIA/dataset/dataset.json"
HISTORIAL_PATH = "modeloIA/configuraciones/historial.json"
JSON_PATH = "modeloIA/configuraciones/reglas_universidades.json"
EXAMENES_PATH = "modeloIA/examenes_generados"

def pedir_opcion(pregunta, opciones):
    print(f"\n{pregunta}")
    for i, op in enumerate(opciones, 1):
        print(f"  {i}. {op}")
    while True:
        try:
            sel = int(input("  → Elige un número: "))
            if 1 <= sel <= len(opciones):
                return opciones[sel - 1]
        except ValueError:
            pass
        print("  ⚠️  Opción inválida, intenta de nuevo.")


def pedir_numero(mensaje, minimo=1, maximo=None):
    while True:
        try:
            val = int(input(f"\n{mensaje}"))
            if val >= minimo and (maximo is None or val <= maximo):
                return val
        except ValueError:
            pass
        rango = f"(mínimo {minimo})" if maximo is None else f"({minimo}–{maximo})"
        print(f"  ⚠️  Ingresa un número válido {rango}.")


def cargar_instituciones():
    """Lee las instituciones únicas directamente del dataset JSON."""
    if not os.path.exists(DATASET_PATH):
        return ["UNAM", "IPN", "CENEVAL"]
    try:
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        unis = sorted({
            str(p.get("universidad", "")).strip()
            for p in data
            if str(p.get("universidad", "")).strip()
            and str(p.get("universidad", "")).strip().upper() not in ("DESCONOCIDA", "VARIAS")
        })
        return unis if unis else ["UNAM", "IPN", "CENEVAL"]
    except Exception:
        return ["UNAM", "IPN", "CENEVAL"]


def cargar_areas_de_institucion(institucion):
    """Lee las áreas disponibles para la institución desde el dataset."""
    if not os.path.exists(DATASET_PATH):
        return []
    try:
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            areas = sorted({
                str(p.get("area", "")).strip() 
                for p in data 
                if str(p.get("universidad", "")).strip().lower() == institucion.strip().lower()
                and str(p.get("area", "")).strip().lower() not in ["", "nan", "none"]
                })

        return areas
    except Exception:
        return []


def mostrar_resumen_dataset():
    """Muestra un resumen rápido del dataset al arrancar."""
    if not os.path.exists(DATASET_PATH):
        print("  ⚠️  No se encontró dataset. Ejecuta primero el Creador de Dataset.")
        return
    try:
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        total = len(data)
        unis = {}
        for p in data:
            u = str(p.get("universidad", "?")).strip()
            unis[u] = unis.get(u, 0) + 1
        print(f"\n  📦 Dataset: {total} preguntas")
        for u, cnt in sorted(unis.items(), key=lambda x: -x[1])[:5]:
            print(f"     • {u}: {cnt}")
        if len(unis) > 5:
            print(f"     ... y {len(unis)-5} instituciones más")
    except Exception:
        pass

# Método para guardar el historial de examenes:
def guardar_en_historial(datos):
    historial = []

    if os.path.exists(HISTORIAL_PATH):
        try:
            with open(HISTORIAL_PATH, "r", encoding="utf-8") as f:
                historial = json.load(f)
        except Exception:
            pass
    datos["fecha"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    historial.append(datos)

    with open(HISTORIAL_PATH, "w", encoding="utf-8") as f:
        json.dump(historial, f, indent=4, ensure_ascii=False)

# Método para moestrar el historial de examenes generados:
def mostrar_historial():
    if not os.path.exists(HISTORIAL_PATH):
        print("\n  ⚠️  Aún no hay historial de exámenes.")
        return
    with open(HISTORIAL_PATH, "r", encoding="utf-8") as f:
        historial = json.load(f)
    print("\n" + "="*52)
    print("   ÚLTIMOS EXÁMENES GENERADOS")
    print("="*52)
    for entry in historial[-5:]:
        area_str = str(entry.get("area", "Todas"))
        if isinstance(entry.get("area"), dict):
            area_str = "Mezcla personalizada"
        print(f"  📅 {entry['fecha']} | {entry['institucion']} | {entry['total']} preg. | Dificultad: {entry['nivel']}")
        print(f"     Área: {area_str} | Modo: {entry['modo']} | PDF: {entry.get('archivo', 'N/A')}\n")

#Para el modo maestro

def iniciar_modo_maestro(generador):
    print("\n" + "="*52)
    print("   👨‍🏫 MODO MAESTRO — Tu Tutor de Inteligencia Artificial")
    print("="*52)
    
    opcion = pedir_opcion("¿En qué te puedo ayudar hoy?", [
        "Tengo una duda específica o pregunta de examen",
        "Necesito que me expliques todos los temas de una materia",
        "Volver al menú principal"
    ])
    
    if opcion == "Volver al menú principal":
        return

    if "específica" in opcion:
        duda = input("\nEscribe tu duda o pega la pregunta: ").strip()
        if duda:
            ruta_img = input(
                "¿La pregunta tiene una imagen? "
                "Escribe la ruta del archivo (Enter para omitir): "
            ).strip()
            ruta_img = ruta_img if ruta_img and os.path.exists(ruta_img) else None
            if ruta_img:
                print(f"  🖼️  Usando imagen: {ruta_img}")
            respuesta = generador.tutor_explicar_concepto(duda, ruta_imagen=ruta_img)
            print("\n" + "-"*50)
            print(respuesta)
            print("-"*50 + "\n")

    elif "materia" in opcion:
        materia = input("\n¿Qué materia necesitas repasar? (ej. Física, Historia de México): ").strip()
        if materia:
            respuesta = generador.tutor_explicar_materia(materia)
            print("\n" + "-"*50)
            print(respuesta)
            print("-"*50 + "\n")

def main():
    while True:
        print("\n" + "="*52)
        print("   CRYSTAL — Sistema Inteligente de Exámenes")
        print("="*52)

        #Añadimos el Modo Maestro al menú
        opcion_inicio = pedir_opcion("¿Qué deseas hacer?", [
            "Generar nuevo examen", 
            "Modo Maestro (Tutor IA)", 
            "Ver historial", 
            "Salir"
        ])
        
        if opcion_inicio == "Salir":
            return
        elif opcion_inicio == "Ver historial":
            mostrar_historial()
            continue

        # Instanciar el generador temprano para usarlo en el tutor
        # Si vas a usar el Tutor IA, configuramos la API primero
        if opcion_inicio == "Modo Maestro (Tutor IA)":
            proveedor = pedir_opcion("¿Qué IA será tu maestro?", list(PROVEEDORES.keys()))
            cfg = PROVEEDORES[proveedor]
            api_key = ""
            modelo_ollama = "llama3"
            if cfg["formato"] == "ollama":
                modelo_ollama = input("\nModelo Ollama (Enter para 'llama3'): ").strip() or "llama3"
            else:
                api_key = os.environ.get(cfg.get("key_env", ""), "") or input(f"\nAPI Key para {proveedor}: ").strip()
            
            generador = GeneradorExamen(
                ruta_dataset=DATASET_PATH, proveedor_ia=proveedor, 
                api_key=api_key, modelo_ollama=modelo_ollama
            )
            iniciar_modo_maestro(generador)
            continue
            
        mostrar_resumen_dataset()

        # ── Institución y Área (Desde el JSON directamente) ──
        try:
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                config_json = json.load(f)
        except:
            print("❌ Error: No se encontró reglas_universidades.json")
            return

        instituciones = list(config_json.keys())
        institucion = pedir_opcion("¿Para qué institución?", instituciones)

        areas = list(config_json[institucion].keys())
        area = pedir_opcion(f"¿Qué área de la {institucion} deseas?", areas)

        niveles = ["mixto", "facil", "medio", "dificil"]
        nivel = pedir_opcion("¿Nivel de dificultad?", niveles)

        inc_resp = input("\n¿Incluir hoja de respuestas en el PDF? (s/n): ").strip().lower() == "s"

        # ── Cargar modelo entrenado (se mantiene igual) ──
        modelo_bert, le_uni, le_area = None, None, None
        try:
            le_uni = joblib.load("modeloIA/label_encoder.pkl")
            le_area = joblib.load("modeloIA/label_encoder_area.pkl")
            # modelo_bert = MultimodalExamModel(...) # (Tu código de carga existente)
        except Exception as e:
            pass # Continuar sin modelo si no existe

        generador = GeneradorExamen(
            ruta_dataset=DATASET_PATH, modelo=modelo_bert, label_encoder=le_uni
        )

        try:
            # ✨ AQUÍ LLAMAMOS AL NUEVO GENERADOR ESTRICTO
            examen = generador.generar_examen_estricto(institucion, area)
        except Exception as e:
            print(f"\n  ❌ Error al generar: {e}")
            return

        if not examen: return
        print(f"\n  ✅ Examen oficial generado: {len(examen)} preguntas")

        nombre_base = f"examen_{institucion.lower()}_{area.replace(' ', '_')}"
        
        # Unimos la carpeta con el nombre del archivo
        ruta_txt = os.path.join(EXAMENES_PATH, f"{nombre_base}.txt")
        ruta_pdf = os.path.join(EXAMENES_PATH, f"{nombre_base}.pdf")
        
        pdf_path_final = None

        # Guardar TXT:
        generador.guardar_examen(examen, ruta_txt)        

        # Generar PDF:
        try:
            pdf_path = exportar_pdf(examen, institucion, ruta_pdf, inc_resp, nivel.capitalize())
            print(f"  ✅ Archivos guardados en la carpeta '{EXAMENES_PATH}'")
        except Exception as e:
            print(f"  ⚠️  No se pudo generar PDF: {e}")

        # Guardar en el historial:
        guardar_en_historial({
            "institucion": institucion, 
            "area": area, 
            "total": len(examen),
            "preguntas": len(examen),
            "fecha": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            "nivel": nivel, 
            "modo": "estricto", 
            "archivo": pdf_path_final if pdf_path_final else ruta_txt
        })

if __name__ == "__main__":
    main()