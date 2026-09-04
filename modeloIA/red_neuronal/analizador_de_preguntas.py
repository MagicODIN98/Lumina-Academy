import torch
import torch.nn as nn
from transformers import AutoModel
from torchvision import models

class MultimodalExamModel(nn.Module):
    def __init__(self, num_universidades):
        super().__init__()
        # 1. Encoder de Texto (BERT)
        self.bert = AutoModel.from_pretrained("dccuchile/bert-base-spanish-wwm-uncased")
        
        # 2. Encoder de Imagen (ResNet-18 para ligereza)
        resnet = models.resnet18(pretrained=True)
        self.visual_encoder = nn.Sequential(*list(resnet.children())[:-1]) # Quitamos la última capa
        
        # 3. Capas de Fusión
        # BERT (768) + ResNet (512) = 1280
        self.fusion = nn.Linear(768 + 512, 512)
        
        # Cabezas de salida
        self.dificultad = nn.Linear(512, 1)
        self.universidad = nn.Linear(512, num_universidades)

    def forward(self, input_ids, attention_mask, pixel_values=None):
        # Procesar texto
        text_outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        text_features = text_outputs.last_hidden_state[:, 0] # CLS Token
        
        # Procesar imagen (si existe)
        if pixel_values is not None:
            image_features = self.visual_encoder(pixel_values)
            image_features = image_features.view(image_features.size(0), -1)
        else:
            # Si no hay imagen, enviamos ceros
            image_features = torch.zeros(text_features.size(0), 512).to(text_features.device)
            
        # Fusionar ambos mundos
        combined = torch.cat((text_features, image_features), dim=1)
        x = torch.relu(self.fusion(combined))
        
        return self.dificultad(x), self.universidad(x)