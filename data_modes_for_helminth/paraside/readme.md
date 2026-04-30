Loyihangiz professional darajada ko'rinishi va keyinchalik Linux serverga o'rnatayotganingizda o'zingizga ham, boshqalarga ham tushunarli bo'lishi uchun quyidagi README.md faylini tayyorladim.

Ushbu matnni loyiha papkangizda README.md nomi bilan saqlang:

Nmed AI Engine (Inference Server)
Ushbu loyiha Roboflow RF-DETR modeli va Workflow texnologiyasi asosida tibbiy tahlillarni (EKG va boshqa patologiyalar) avtomatlashtirilgan holda aniqlash uchun mo'ljallangan. Tizim GPU (videokarta) yordamida Docker konteynerida ishlaydi, bu esa yuqori tezlik va xavfsizlikni ta'minlaydi.

🚀 Texnik xususiyatlari
Model: RF-DETR (Transformer Based)

Platforma: Roboflow Inference Server (GPU)

Til: Python 3.10+

Muhit: Docker (Windows/Linux)

🛠 O'rnatish va Sozlash
1. Docker Serverni ishga tushirish
Dastlab, NVIDIA videokartasidan foydalanadigan inference serverni Docker orqali ishga tushiring:

PowerShell
docker run -d --name nmed-gpu-server `
  --gpus all `
  -p 9001:9001 `
  -v roboflow-models:/cache `
  roboflow/roboflow-inference-server-gpu:latest
2. Kutubxonalarni o'rnatish
Lokal Python muhitida kerakli paketlarni o'rnating:

Bash
pip install -r requirements.txt
3. Konfiguratsiya (.env)
Papkada .env faylini yarating va Roboflow ma'lumotlarini kiriting:

Фрагмент кода
ROBOFLOW_API_KEY=sizning_api_keyingiz
WORKSPACE_ID=sizning_workspace_id
WORKFLOW_ID=sizning_workflow_id
INFERENCE_SERVER_URL=http://localhost:9001
💻 Foydalanish
Tahlilni boshlash uchun app.py faylini ishga tushiring:

Bash
python app.py
Kod qanday ishlaydi?
Rasmni tayyorlash: Rasm OpenCV orqali o'qiladi va Base64 formatiga o'tkaziladi.

So'rov yuborish: Lokal Docker serveriga (9001 port) Workflow ID va API kalit bilan birga rasm yuboriladi.

Inference: Docker konteyneri ichidagi GPU modelni ishga tushiradi va natijani JSON formatida qaytaradi.

Natija: Obyekt koordinatalari, klasslar va aniqlik darajasi (confidence).

📂 Loyiha Strukturasi
app.py — Client qismi, server bilan gaplashadi.

.env — Maxfiy sozlamalar (GIT'ga yuklanmasligi kerak).

requirements.txt — Kerakli kutubxonalar.

test.jpg — Tekshirish uchun namuna rasm.

🛡 Xavfsizlik va Server (Linux)
Ushbu loyiha Linux serverlarga (Ubuntu) ko'chirishga to'liq moslangan. Serverda ishlatishda quyidagilarga e'tibor bering:

nvidia-container-toolkit o'rnatilgan bo'lishi shart.

Port 9001 xavfsizlik devori (UFW) orqali faqat ichki tarmoq uchun ochiq bo'lishi tavsiya etiladi.

📝 Muallif
Rahmonbek — Full-stack Software Developer

Loyiha: nmed.uz (Milliy tibbiy diagnostika platformasi)


Loyihani birinchi marta ishga tushirishda adashib ketmasligingiz uchun barcha qadamlarni "Qadam-baqadam" (Step-by-step) ko'rinishida yozib beraman.Bu qo'llanma sizning Windows kompyuteringizda hozirgi holatdan to yakuniy natijagacha bo'lgan yo'lni qamrab oladi.🛠 Loyihani ishga tushirish qo'llanmasi1-qadam: Docker Serverni tekshirishAvval Docker konteyneri to'g'ri ishga tushganini va videokartani (GPU) ko'rayotganini tekshirib olishimiz kerak.PowerShell-ni oching.Quyidagi buyruqni yozing:PowerShelldocker ps
Agar ro'yxatda nmed-gpu-server ko'rinayotgan bo'lsa — hammasi joyida.Agar ko'rinmasa, boyagi uzun docker run... buyrug'ini qaytadan ishlating.2-qadam: Python muhitini sozlashLoyiha papkangiz ichida (D:\git\ekg_tahlili_app\dataset_models\parasite) terminallni oching:Virtual muhit yaratish (ixtiyoriy, lekin tavsiya etiladi):PowerShellpython -m venv venv
.\venv\Scripts\activate
Kutubxonalarni o'rnatish:PowerShellpip install requests opencv-python python-dotenv
3-qadam: Ma'lumotlarni tayyorlashLoyiha papkangizda quyidagi fayllar borligiga ishonch hosil qiling:.env: Ichida ROBOFLOW_API_KEY, WORKSPACE_ID va WORKFLOW_ID yozilgan bo'lishi shart.test.jpg: Tahlil qilmoqchi bo'lgan rasmingizni shu nom bilan papkaga tashlang.4-qadam: Dasturni yurgizishHamma narsa tayyor bo'lgach, kodni ishga tushiring:PowerShellpython app.py
🧐 Natijani qanday tushunish kerak?Dasturni ishga tushirganingizda, terminalda JSON formatidagi javob chiqadi. U taxminan quyidagicha ko'rinadi:JSON{
    "outputs": [
        {
            "predictions": [
                {
                    "x": 450.5,
                    "y": 320.0,
                    "width": 120,
                    "height": 80,
                    "class": "patologiya_nomi",
                    "confidence": 0.92
                }
            ]
        }
    ]
}
class: Model nima topganini ko'rsatadi (masalan: EKGdagi o'zgarish nomi).confidence: Modelning o'ziga bo'lgan ishonchi (0.92 degani 92% aniqlik).x, y, width, height: Topilgan obyektning rasm ustidagi koordinatalari.⚠️ Mumkin bo'lgan muammolar va yechimlarMuammoYechim"Connection refused"Docker serveringiz yoniq emas yoki 9001-port band. docker ps orqali tekshiring."Invalid API Key".env faylidagi kalitda xatolik bor yoki bo'sh joy qolib ketgan."Model not found"Workflow ID yoki Workspace ID noto'g'ri yozilgan. Roboflow dashboarddan tekshiring.Juda sekin ishlayaptiDocker GPU-ni emas, CPU-ni ishlatmoqda. nvidia-smi buyrug'i orqali videokarta bandligini tekshiring.🚀 Keyingi reja: Linux Serverga ko'chirishHozircha Windows-da hammasi ishlagandan keyin, sizga bitta Deployment Script yozib beraman. Linux serverga o'tganingizda, o'sha skriptni bir marta ishga tushirsangiz, u Docker-ni ham, loyihani ham o'zi avtomat o'rnatib beradi.Tayyor bo'lsangiz, python app.py ni bosing va birinchi natijani ko'ring! Savollar bo'lsa, men shu yerdaman.