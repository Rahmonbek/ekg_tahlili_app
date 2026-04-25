# 🧪 NMED Parasite Detection Dataset (YOLO)

## 📌 Overview

Ushbu dataset mikroskop orqali olingan najas (kal) preparatlaridagi **gijja tuxumlarini aniqlash** uchun mo‘ljallangan.

Dataset quyidagi manbalar asosida shakllantirilgan:

* AI4NTD Dataset
* Chula-ParasiteEgg-11 Dataset

Dataset **YOLOv8 object detection** modeli uchun tayyorlangan.

---

## 🎯 Maqsad

Model quyidagilarni aniqlaydi:

* Gijja tuxumi mavjud yoki yo‘qligini
* Gijja turini (class)
* Rasm ichidagi joylashuvini (bounding box)
* Taxminiy tuxum sonini

---

## 🧬 Classlar

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

### 📌 Muhim

Har bir rasmga mos `.txt` label fayl mavjud bo‘lishi kerak:

```txt
img1.jpg
img1.txt
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

## ⚙️ O‘rnatish

### 1. Virtual environment yaratish

```bash
python -m venv venv
```

### 2. Aktivatsiya

**Windows:**

```bash
venv\Scripts\activate
```

---

### 3. Kutubxonalarni o‘rnatish

```bash
pip install ultralytics
```

---

## 🚀 Modelni o‘qitish

### Test (tez):

```bash
python train.py --epochs 3
```

### To‘liq training:

```bash
python train.py --epochs 50
```

---

## 📊 Natija

Training tugagach:

```txt
runs/detect/nmed_parasite/weights/best.pt
```

👉 bu **eng yaxshi model**

---

## 🔍 Prediction (test)

```bash
python predict.py --image test.jpg
```

Natija:

```txt
runs/detect/predict/
```

---

## 📦 JSON natija (AI integratsiya)

```bash
python predict_json.py test.jpg
```

Natija:

```json
{
  "gijja_topildimi": true,
  "aniqlangan_turlar": [...]
}
```

---

## ⚠️ Muhim eslatmalar

* Model faqat **tuxumlarni aniqlaydi**
* Voyaga yetgan gijja tanasi uchun alohida dataset kerak
* Natijalar **tibbiy tashxis emas**
* Shifokor tasdig‘i talab qilinadi

---

## 🧠 Tavsiyalar

* Dataset balansini saqlang
* Artefakt (noto‘g‘ri obyekt) rasmlar qo‘shing
* Modelni muntazam qayta o‘qiting

---

## 🚀 Keyingi bosqichlar

* Gijja tanasi uchun alohida model yaratish
* API (FastAPI / Django) qilish
* Frontend (React / Flutter) bilan integratsiya

---

## 👨‍💻 Muallif

NMED AI Platformasi uchun ishlab chiqilgan

---
