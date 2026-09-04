def evaluar(respuestas_usuario, preguntas):
    resultado = []
    
    def buscar_pregunta(q_id):
        for p in preguntas:
            if p.get("id") == q_id:
                return p
        return None
    
    for r in respuestas_usuario:
        pregunta = buscar_pregunta(r["id"])
        
        if not pregunta:
            continue
            
        correcto = str(r["respuesta"]).strip().upper() == str(pregunta.get("respuesta_correcta", "")).strip().upper()
        
        resultado.append({
            "id": r["id"],
            "correcto": correcto,
            "tema": pregunta.get("tema", "Desconocido"),
            "subtema": pregunta.get("subtema", "Desconocido")
        })
        
    return resultado
        
def detectar_fallas(estadisticas):
    debiles = []
    
    for tema, data in estadisticas.items():
        if data["incorrectas"] > data["correctas"]:
            debiles.append(tema)
            
    return debiles