from roboflow import Roboflow
import cv2
import os
from dotenv import load_dotenv

# .env fayldan ma'lumotlarni yuklash
load_dotenv()

# 1. Roboflow obyektini yaratish
rf = Roboflow(api_key=os.getenv("ROBOFLOW_API_KEY"))

# 2. Loyiha va Modelni aniqlash
# Workspace va Project ID-ni Roboflow dashboard-dan oling
project = rf.workspace(os.getenv("WORKSPACE_ID")).project("parasites-trgfz-ssa5v")
model = project.version(1).model # 1 - model versiyasi raqami

# 3. Rasmni tahlil qilish (Cloud orqali)
# Bu yerda rasm Roboflow serveriga yuboriladi
prediction = model.predict("askarida.jpg", confidence=40).json()

# 4. Natijani ko'rish
print("Bulutli tahlil natijasi:")
import json
print(json.dumps(prediction, indent=4))

# Agar natijani rasmda ko'rmoqchi bo'lsangiz
model.predict("test.jpg", confidence=40).save("result_cloud.jpg")