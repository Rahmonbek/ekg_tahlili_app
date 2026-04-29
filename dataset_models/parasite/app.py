import cv2
import requests
import os
import base64
import json
from dotenv import load_dotenv

# Sozlamalarni yuklash
load_dotenv()

class NmedInferenceClient:
    def __init__(self):
        self.api_key = os.getenv("ROBOFLOW_API_KEY")
        self.workspace_id = os.getenv("WORKSPACE_ID")
        self.workflow_id = os.getenv("WORKFLOW_ID")
        self.server_url = os.getenv("INFERENCE_SERVER_URL")

    def predict(self, image_path):
        # 1. Rasmni o'qish
        image = cv2.imread(image_path)
        if image is None:
            return {"error": "Rasm topilmadi yoki yo'l noto'g'ri!"}

        # 2. Rasmni Base64 formatiga o'tkazish
        _, buffer = cv2.imencode('.jpg', image)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        # 3. So'rov yuborish
        # Roboflow Workflow API formati
        endpoint = f"{self.server_url}/workflows/{self.workspace_id}/{self.workflow_id}"
        
        payload = {
            "api_key": self.api_key,
            "input_data": {
                "image": {
                    "type": "base64",
                    "value": img_base64
                }
            }
        }

        try:
            print(f"Inference yuborilmoqda: {self.workflow_id}...")
            response = requests.post(endpoint, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}

if __name__ == "__main__":
    client = NmedInferenceClient()
    
    # DIQQAT: Papkangizda 'test.jpg' rasmi bo'lishi kerak
    result = client.predict("askarida.jpg")
    
    # Natijani chiroyli ko'rsatish
    print(json.dumps(result, indent=4))