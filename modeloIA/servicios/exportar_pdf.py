from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import datetime
import os

# Colores:
CRYSTAL_AZUL     = colors.HexColor("#1565C0")
CRYSTAL_AZUL_OSC = colors.HexColor("#0D47A1")
CRYSTAL_GRIS     = colors.HexColor("#F5F5F5")
CRYSTAL_NEGRO    = colors.HexColor("#212121")
CRYSTAL_ROJO     = colors.HexColor("#C62828")

# Método para exportar a PDF el examen:
def exportar_pdf(examen, institucion, nombre_archivo="examen.pdf",
                 incluir_respuestas=False, nivel_dificultad="Mixto"):
    
    """
    Genera un PDF con formato real de examen de admisión.
    
    examen           : lista de dicts con keys pregunta, opciones, respuesta, tema, dificultad
    institucion      : str  (UNAM, IPN, CENEVAL…)
    nombre_archivo   : ruta de salida
    incluir_respuestas: si True genera hoja de respuestas al final
    nivel_dificultad : etiqueta descriptiva para portada
    """
    doc = SimpleDocTemplate(
        nombre_archivo,
        pagesize=letter,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm
    )

    styles = getSampleStyleSheet()

    question_style = styles['Normal']

    # ── Estilos personalizados ──────────────────────────────────────
    titulo_style = ParagraphStyle(
        "CrystalTitulo",
        parent=styles["Normal"],
        fontSize=22, textColor=colors.white,
        alignment=TA_CENTER, fontName="Helvetica-Bold",
        spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "CrystalSub",
        parent=styles["Normal"],
        fontSize=12, textColor=colors.white,
        alignment=TA_CENTER, fontName="Helvetica",
    )
    marca_style = ParagraphStyle(
        "CrystalMarca",
        parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#90CAF9"),
        alignment=TA_RIGHT, fontName="Helvetica-Oblique",
    )
    instruccion_style = ParagraphStyle(
        "CrystalInstruccion",
        parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#555555"),
        alignment=TA_LEFT, fontName="Helvetica-Oblique",
        leftIndent=6, spaceAfter=2,
    )
    pregunta_style = ParagraphStyle(
        "CrystalPregunta",
        parent=styles["Normal"],
        fontSize=10, textColor=CRYSTAL_NEGRO,
        fontName="Helvetica-Bold",
        spaceAfter=3, spaceBefore=6,
    )
    opcion_style = ParagraphStyle(
        "CrystalOpcion",
        parent=styles["Normal"],
        fontSize=10, textColor=CRYSTAL_NEGRO,
        fontName="Helvetica",
        leftIndent=16, spaceAfter=2,
    )
    tema_style = ParagraphStyle(
        "CrystalTema",
        parent=styles["Normal"],
        fontSize=8, textColor=CRYSTAL_AZUL,
        fontName="Helvetica-Oblique",
        spaceAfter=2,
    )
    respuesta_style = ParagraphStyle(
        "CrystalResp",
        parent=styles["Normal"],
        fontSize=9, textColor=CRYSTAL_NEGRO,
        fontName="Helvetica",
        spaceAfter=2,
    )

    story = []
    fecha = datetime.now().strftime("%d / %m / %Y")
    total = len(examen)

    # ── ENCABEZADO / PORTADA ────────────────────────────────────────
    header_data = [[
        Paragraph(f"EXAMEN DE ADMISIÓN<br/><font size='14'>{institucion.upper()}</font>",
                  titulo_style),
    ]]
    header_table = Table(header_data, colWidths=[17*cm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,-1), CRYSTAL_AZUL_OSC),
        ("ROUNDEDCORNERS", [8]),
        ("TOPPADDING",  (0,0), (-1,-1), 14),
        ("BOTTOMPADDING",(0,0),(-1,-1), 14),
        ("LEFTPADDING",  (0,0), (-1,-1), 12),
        ("RIGHTPADDING", (0,0), (-1,-1), 12),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.3*cm))

    # Sub-info: fecha, total preguntas, dificultad
    info_data = [[
        Paragraph(f"Fecha: {fecha}", sub_style),
        Paragraph(f"Total de preguntas: {total}", sub_style),
        Paragraph(f"Nivel: {nivel_dificultad}", sub_style),
    ]]
    info_table = Table(info_data, colWidths=[5.6*cm, 5.8*cm, 5.6*cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), CRYSTAL_AZUL),
        ("TOPPADDING",   (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0), (-1,-1), 6),
        ("ALIGN",        (0,0), (-1,-1), "CENTER"),
    ]))
    story.append(info_table)

    # Marca CRYSTAL
    story.append(Spacer(1, 0.15*cm))
    story.append(Paragraph("Generado por CRYSTAL © — Sistema Inteligente de Exámenes", marca_style))
    story.append(HRFlowable(width="100%", thickness=1, color=CRYSTAL_AZUL, spaceAfter=8))

    # Datos del alumno
    datos_data = [[
        Paragraph("Nombre: ___________________________________", styles["Normal"]),
        Paragraph("Folio: ____________", styles["Normal"]),
    ],[
        Paragraph("Turno: ___________   Grupo: __________", styles["Normal"]),
        Paragraph("Calificación: _______", styles["Normal"]),
    ]]
    datos_table = Table(datos_data, colWidths=[11*cm, 6*cm])
    datos_table.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("TOPPADDING",  (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0),(-1,-1), 5),
        ("BOX",     (0,0), (-1,-1), 0.5, colors.HexColor("#BDBDBD")),
        ("INNERGRID",(0,0),(-1,-1), 0.3, colors.HexColor("#E0E0E0")),
        ("BACKGROUND",(0,0),(-1,-1), CRYSTAL_GRIS),
    ]))
    story.append(datos_table)
    story.append(Spacer(1, 0.4*cm))

    # Instrucciones
    instrucciones = [
        "• Lee cuidadosamente cada pregunta antes de contestar.",
        "• Selecciona únicamente UNA respuesta por pregunta.",
        "• No se permite el uso de calculadora salvo indicación del examinador.",
        "• Entrega esta hoja al terminar el examen.",
    ]
    story.append(Paragraph("INSTRUCCIONES GENERALES:", ParagraphStyle(
        "inst_titulo", parent=styles["Normal"],
        fontSize=9, fontName="Helvetica-Bold", textColor=CRYSTAL_AZUL, spaceAfter=2
    )))

    for inst in instrucciones:
        story.append(Paragraph(inst, instruccion_style))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#BDBDBD"), spaceAfter=10))

    # ── PREGUNTAS ───────────────────────────────────────────────────
    for i, p in enumerate(examen, 1):
        # 1. Texto de la pregunta
        texto_pregunta = f"<b>{i}.</b> {p.get('pregunta', 'Pregunta sin texto')}"
        story.append(Paragraph(texto_pregunta, question_style))
        
        # 2. INTEGRACIÓN DE IMAGEN (Punto 1)
        img_path = p.get("imagen_path")
        if img_path and os.path.exists(img_path):
            try:
                # Cargamos la imagen
                img = Image(img_path)
                
                # Definimos límites máximos (el alto máximo suele ser ~18-20cm en hoja carta)
                ancho_max = 16 * cm
                alto_max = 12 * cm  # <--- Agregamos un límite de altura
                
                # Obtener tamaño real
                iw, ih = img.wrap(0, 0)
                
                # Calcular factor de escala para que quepa en AMBOS límites
                # Buscamos el ratio más pequeño para no deformar
                ratio = min(ancho_max / float(iw), alto_max / float(ih))
                
                # Si la imagen es más grande que cualquiera de los límites, la redimensionamos
                if iw > ancho_max or ih > alto_max:
                    img.drawWidth = iw * ratio
                    img.drawHeight = ih * ratio
                
                img.hAlign = 'CENTER'
                story.append(Spacer(1, 0.2 * cm))
                story.append(img)
                story.append(Spacer(1, 0.5 * cm))

            except Exception as e:
                print(f"⚠️ Error al insertar imagen {img_path}: {e}")

        # 3. Opciones
        opciones = p.get("opciones", [])
        for j, opt in enumerate(opciones):
            letra = chr(65 + j)
            story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;{letra}) {opt}", styles['Normal']))
        
        story.append(Spacer(1, 0.4 * cm))

    # ── HOJA DE RESPUESTAS (opcional) ──────────────────────────────
    if incluir_respuestas:
        story.append(HRFlowable(width="100%", thickness=1.5,
                                 color=CRYSTAL_ROJO, spaceBefore=16, spaceAfter=8))
        story.append(Paragraph("CLAVE DE RESPUESTAS — USO EXCLUSIVO DEL EXAMINADOR",
                                ParagraphStyle("clave_titulo", parent=styles["Normal"],
                                    fontSize=11, fontName="Helvetica-Bold",
                                    textColor=CRYSTAL_ROJO, alignment=TA_CENTER, spaceAfter=8)))
        
        respuesta_style = ParagraphStyle('RespStyle', parent=styles['Normal'], fontSize=10)

        # Tabla de respuestas en 4 columnas
        filas_resp = []
        fila_actual = []
        for i, p in enumerate(examen, 1):
            resp = str(p.get("respuesta", "?")).upper()
            fila_actual.append(Paragraph(f"<b>{i}.</b> {resp}", respuesta_style))
            if len(fila_actual) == 4:
                filas_resp.append(fila_actual)
                fila_actual = []
        if fila_actual:
            while len(fila_actual) < 4:
                fila_actual.append(Paragraph("", respuesta_style))
            filas_resp.append(fila_actual)

        resp_table = Table(filas_resp, colWidths=[4.2*cm]*4)
        resp_table.setStyle(TableStyle([
            ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#E0E0E0")),
            ("BOX",       (0,0), (-1,-1), 0.5, CRYSTAL_ROJO),
            ("BACKGROUND",(0,0), (-1,-1), colors.HexColor("#FFF8F8")),
            ("TOPPADDING",(0,0), (-1,-1), 4),
            ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ]))
        story.append(resp_table)

    # Pie de página final
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=0.5,
                             color=colors.HexColor("#BDBDBD"), spaceAfter=4))
    story.append(Paragraph(
        f"CRYSTAL © — Sistema Inteligente de Exámenes  |  {institucion.upper()}  |  {fecha}",
        ParagraphStyle("pie", parent=styles["Normal"], fontSize=7,
                       textColor=colors.HexColor("#9E9E9E"), alignment=TA_CENTER)
    ))

    doc.build(story)
    print(f"✅ PDF generado: {nombre_archivo}")
    return nombre_archivo