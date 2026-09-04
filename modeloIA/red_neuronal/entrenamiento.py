import os
import json
import torch
import torch.nn as nn
from torchvision import models
import pandas as pd
import joblib
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModel, get_linear_schedule_with_warmup
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from torchvision import transforms
from PIL import Image

# Configuración de preprocesamiento de imagen para ResNet/ViT
transformaciones_imagen = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

class MultimodalExamDataset(Dataset):
    def __init__(self, data_list, tokenizer, transform=None):
        self.data = data_list
        self.tokenizer = tokenizer
        self.transform = transform

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        
        # 1. Procesar Texto
        encoding = self.tokenizer(
            item["pregunta"],
            truncation=True,
            padding='max_length',
            max_length=128,
            return_tensors="pt"
        )

        # 2. Procesar Imagen
        pixel_values = torch.zeros(3, 224, 224) # Imagen negra por defecto
        tiene_imagen = 0
        
        ruta_img = item.get("imagen")
        if ruta_img and os.path.exists(ruta_img):
            try:
                img = Image.open(ruta_img).convert("RGB")
                if self.transform:
                    pixel_values = self.transform(img)
                tiene_imagen = 1
            except Exception as e:
                print(f"Error cargando imagen {ruta_img}: {e}")

        return {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "pixel_values": pixel_values,
            "tiene_imagen": torch.tensor(tiene_imagen, dtype=torch.float),
            "dificultad": torch.tensor(float(item.get("dificultad", 0.5)), dtype=torch.float),
            "universidad": torch.tensor(item.get("uni_idx", 0), dtype=torch.long),
            "area": torch.tensor(item.get("area_label", 0), dtype=torch.long)
        }

class MultimodalExamModel(nn.Module):
    def __init__(self, num_universidades, num_areas, model_name="dccuchile/bert-base-spanish-wwm-uncased"):
        super().__init__()
        # Texto
        self.bert = AutoModel.from_pretrained(model_name)
        
        # Imagen
        resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        self.visual_encoder = nn.Sequential(*list(resnet.children())[:-1])
        
        # Fusión y Salidas (BERT 768 + ResNet 512 = 1280)
        self.fusion = nn.Sequential(
            nn.Linear(768 + 512, 512),
            nn.ReLU(),
            nn.Dropout(0.3)
        )
        
        self.dificultad = nn.Linear(512, 1)
        self.universidad = nn.Linear(512, num_universidades)
        self.area = nn.Linear(512, num_areas)

    def forward(self, input_ids, attention_mask, pixel_values):
        # Texto
        text_outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        text_features = text_outputs.last_hidden_state[:, 0]
        
        # Imagen
        image_features = self.visual_encoder(pixel_values)
        image_features = image_features.view(image_features.size(0), -1)
            
        # Fusionar
        combined = torch.cat((text_features, image_features), dim=1)
        x = torch.relu(self.fusion(combined))
        
        dificultad = self.dificultad(x).view(-1)
        universidad = self.universidad(x)
        area = self.area(x)
        return dificultad, universidad, area

def entrenar():
    # Leer JSON
    with open("modeloIA/dataset/dataset.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    df = pd.DataFrame(data)

    df["opciones_str"] = df["opciones"].apply(lambda x: " ".join(x) if isinstance(x, list) else str(x))
    df["texto"] = df["pregunta"] + " " + df["opciones_str"]
    df["dificultad"] = df["dificultad"].astype(float).clip(0, 1)
    df["universidad"] = df["universidad"].fillna("DESCONOCIDA").astype(str)
    df["area"] = df["area"].fillna("DESCONOCIDA").astype(str)

    le_uni = LabelEncoder()
    df["universidad_label"] = le_uni.fit_transform(df["universidad"])
    
    le_area = LabelEncoder()
    df["area_label"] = le_area.fit_transform(df["area"])
    
    print("Universidades detectadas:", le_uni.classes_)
    print("Áreas detectadas:", le_area.classes_)

    train_df, val_df = train_test_split(df, test_size=0.2, random_state=42)
    tokenizer = AutoTokenizer.from_pretrained("dccuchile/bert-base-spanish-wwm-uncased")

    train_dataset = MultimodalExamDataset(train_df.to_dict(orient="records"), tokenizer, transform=transformaciones_imagen)
    val_dataset = MultimodalExamDataset(val_df.to_dict(orient="records"), tokenizer, transform=transformaciones_imagen)
    
    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=8)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Llamar a clase Multimodal
    model = MultimodalExamModel(num_universidades=len(le_uni.classes_), num_areas=len(le_area.classes_)).to(device)

    for param in model.bert.parameters():
        param.requires_grad = False

    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
    EPOCHS = 5
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=0, num_training_steps=len(train_loader)*EPOCHS)

    loss_mse = nn.MSELoss()
    loss_ce = nn.CrossEntropyLoss()

    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0

        # Extraemos todos los datos del batch, incluyendo las imágenes (pixel_values)
        for batch in train_loader:
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            pixel_values = batch["pixel_values"].to(device)
            dificultad_real = batch["dificultad"].to(device)
            universidad_real = batch["universidad"].to(device)
            area_real = batch["area"].to(device)

            optimizer.zero_grad()
            
            # Pasar los 3 argumentos al modelo en entrenamiento
            dificultad_pred, universidad_pred, area_pred = model(input_ids, attention_mask, pixel_values)

            loss = (
                0.2 * loss_mse(dificultad_pred, dificultad_real) +
                0.4 * loss_ce(universidad_pred, universidad_real) +
                0.4 * loss_ce(area_pred, area_real)
            )

            loss.backward()
            optimizer.step()
            scheduler.step()
            total_loss += loss.item()

        print(f"\nEpoch {epoch+1} Train Loss: {total_loss/len(train_loader):.4f}")

        # Validación
        model.eval()
        val_loss, correct_uni, correct_area, total = 0, 0, 0, 0

        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch["input_ids"].to(device)
                attention_mask = batch["attention_mask"].to(device)
                pixel_values = batch['pixel_values'].to(device)
                dificultad_real = batch["dificultad"].to(device)
                universidad_real = batch["universidad"].to(device)
                area_real = batch["area"].to(device)

                # Pasamos los 3 argumentos al modelo en validación
                dificultad_pred, universidad_pred, area_pred = model(input_ids, attention_mask, pixel_values)

                loss = (
                    0.2 * loss_mse(dificultad_pred, dificultad_real) +
                    0.4 * loss_ce(universidad_pred, universidad_real) +
                    0.4 * loss_ce(area_pred, area_real)
                )
                val_loss += loss.item()

                preds_uni = torch.argmax(universidad_pred, dim=1)
                preds_area = torch.argmax(area_pred, dim=1)
                
                correct_uni += (preds_uni == universidad_real).sum().item()
                correct_area += (preds_area == area_real).sum().item()
                total += universidad_real.size(0)

        print(f"Epoch {epoch+1} Val Loss: {val_loss/len(val_loader):.4f}")
        print(f"Accuracy Universidad: {correct_uni/total:.2%} | Accuracy Área: {correct_area/total:.2%}")

        if epoch == 2:
            print("🔓 Descongelando BERT...")
            for param in model.bert.parameters():
                param.requires_grad = True
            optimizer = torch.optim.AdamW(model.parameters(), lr=1e-5)

    torch.save(model.state_dict(), "modeloIA/modelo.pth")
    joblib.dump(le_uni, "modeloIA/label_encoder.pkl")
    joblib.dump(le_area, "modeloIA/label_encoder_area.pkl")
    print("\nModelo entrenado y guardado 🚀")

if __name__ == "__main__":
    entrenar()