import torch
import joblib
from transformers import AutoTokenizer
from entrenamiento import MultimodalExamModel

MODEL_PATH = "modeloIA/modelo.pth"
ENCODER_UNI_PATH = "modeloIA/label_encoder.pkl"
ENCODER_AREA_PATH = "modeloIA/label_encoder_area.pkl"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("Cargando modelo...")
le_uni = joblib.load(ENCODER_UNI_PATH)
le_area = joblib.load(ENCODER_AREA_PATH)

tokenizer = AutoTokenizer.from_pretrained("dccuchile/bert-base-spanish-wwm-uncased")

model = MultimodalExamModel(num_universidades=len(le_uni.classes_), num_areas=len(le_area.classes_)).to(device)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.eval()
print("Modelo listo 🚀")

def predecir(texto):

    encoding = tokenizer(
        texto, return_tensors="pt", truncation=True,
        padding=True, max_length=128
    )
    input_ids = encoding["input_ids"].to(device)
    attention_mask = encoding["attention_mask"].to(device)
    
    pixel_values = torch.zeros(1, 3, 224, 224).to(device)

    with torch.no_grad():
        dificultad, universidad_logits, area_logits = model(input_ids, attention_mask, pixel_values)

    dificultad = dificultad.item()

    probs_uni = torch.softmax(universidad_logits, dim=1)
    uni_idx = torch.argmax(probs_uni).item()
    confianza_uni = probs_uni[0][uni_idx].item()
    nombre_uni = le_uni.inverse_transform([uni_idx])[0]

    probs_area = torch.softmax(area_logits, dim=1)
    area_idx = torch.argmax(probs_area).item()
    confianza_area = probs_area[0][area_idx].item()
    nombre_area = le_area.inverse_transform([area_idx])[0]

    print("\n=== RESULTADO ===")
    print("Texto:", texto)
    print(f"Dificultad predicha: {dificultad:.3f}")
    print(f"Universidad predicha: {nombre_uni} (Confianza: {confianza_uni:.2%})")
    print(f"Área predicha: {nombre_area} (Confianza: {confianza_area:.2%})")

if __name__ == "__main__":
    while True:
        texto = input("\nEscribe una pregunta (o 'salir'): ")
        if texto.lower() == "salir": break
        predecir(texto)