from collections import defaultdict

def analizar(resultados):
    estadisticas = defaultdict(lambda: {"correctas": 0, "incorrectas": 0})
    
    for r in resultados:
        if r["correcto"]:
            estadisticas[r["tema"]]["correctas"] += 1
        else:
            estadisticas[r["tema"]]["incorrectas"] += 1
    
    return estadisticas