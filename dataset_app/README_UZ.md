# 🧪 NMED Parasite Detection (YOLO AI)

## 📌 Project haqida

Bu loyiha mikroskop orqali olingan najas (kal) rasmlarida **gijja tuxumlarini avtomatik aniqlash** uchun yaratilgan AI tizimdir.

Tizim YOLOv8 modeli yordamida:

* rasmda tuxum bor yoki yo‘qligini aniqlaydi
* tuxumlarni joylashuvini (bbox) topadi
* qaysi turga tegishli ekanini aniqlaydi
* nechta tuxum borligini hisoblaydi

---

## 🎯 Model nimalarni aniqlaydi?

Quyidagi gijja tuxumlari aniqlanadi:

```txt
0  ascaris
1  trichuris
2  hookworm
3  schistosoma
4  taenia
5  enterobius
6  fasciolopsis
7  hymenolepis_nana
8  hymenolepis_diminuta
9  capillaria
10 opisthorchis
11 paragonimus
```

---

## 🧠 Qanday ishlaydi?

Jarayon quyidagicha:

```txt
Rasm → YOLO model → tuxumlarni topadi → class beradi → natija qaytaradi
```

Misol:

```txt
1 rasm ichida:
- 3 ta Ascaris
- 2 ta Hymenolepis
```

Model natijasi:

```txt
bbox + class + confidence
```

---

## 📁 Dataset struktura

```txt
dataset/
  train/
    images/
    labels/
  valid/
    images/
    labels/
  test/
    images/
    labels/
```

Har bir rasmga mos `.txt` fayl bo‘lishi kerak:

```txt
img001.jpg
img001.txt
```

---

## 📄 Label formati (YOLO)

```txt
<class_id> <x_center> <y_center> <width> <height>
```

Misol:

```txt
0 0.52 0.41 0.12 0.18
```

---

## ⚙️ O‘rnatish (INSTALL)

### 1. Python versiya

```txt
Python 3.11 tavsiya etiladi
```

---

### 2. Virtual environment yaratish

```bash
py -3.11 -m venv venv
venv\Scripts\activate
```

---

### 3. Kutubxonalarni o‘rnatish

```bash
pip install -r requirements.txt
```

---

### 4. GPU (ixtiyoriy lekin tavsiya etiladi)

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

Tekshirish:

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

👉 `True` chiqsa — GPU ishlayapti

---

## 🚀 Modelni o‘qitish (TRAIN)

### 🔹 Test (tez tekshiruv)

```bash
python train.py --epochs 3
```

---

### 🔹 Asosiy training

```bash
python train.py --epochs 50
```

---

### 🔹 GPU bilan (tezroq)

```bash
python train.py --epochs 50 --device 0
```

---

## 📊 Training natijasi

Model shu joyda saqlanadi:

```txt
runs/detect/nmed_parasite/weights/best.pt
```

👉 bu sizning tayyor AI modelingiz

---

## 🔍 Prediction (rasmni tekshirish)

```bash
python predict.py --image test.jpg
```

Natija:

```txt
runs/detect/predict/
```

---

## 📦 JSON natija olish

```bash
python predict_json.py test.jpg
```

Misol:

```json
{
  "gijja_topildimi": true,
  "aniqlangan_turlar": [
    {
      "lotin_nomi": "Ascaris lumbricoides",
      "tuxum_soni": 3,
      "ishonch_darajasi": 0.91
    }
  ]
}
```

---

## ⚠️ Muhim eslatmalar

* Model faqat **gijja tuxumlarini aniqlaydi**
* Voyaga yetgan gijja uchun alohida model kerak
* Natija **yakuniy tibbiy tashxis emas**
* Shifokor tasdig‘i talab qilinadi

---

## 🧠 Tavsiyalar

* Dataset balansini saqlang
* Artefakt rasmlar qo‘shing
* Noto‘g‘ri label bermang
* Har 10–20 epochdan keyin modelni tekshirib boring

---

## 🚀 Keyingi bosqichlar

* Voyaga yetgan gijja uchun dataset yaratish
* 2-model (larva/gijja tanasi) train qilish
* API (FastAPI / Django) yaratish
* Frontend (React / Flutter) bilan ulash

---

## 👨‍💻 Muallif

NMED AI Platformasi uchun ishlab chiqilgan
