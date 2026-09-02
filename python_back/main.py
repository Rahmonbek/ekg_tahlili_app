# ============================ ecg_api_full.py (1-qism) ============================
import io
import os
import re
import math
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import Depends
from openai import OpenAI
import base64
import requests
from matplotlib.ticker import MultipleLocator
from typing import Dict, Optional, Tuple
import xml.etree.ElementTree as ET
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from scipy.signal import find_peaks
from PIL import Image, ImageDraw, ImageFont, UnidentifiedImageError
from scipy.signal import butter, filtfilt, find_peaks, medfilt
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from typing import Dict
import math
from database import get_db
from config import OPENAI_API_KEY, ALLOWED_ORIGINS, OPENAI_MODEL
from ecg_analyse import create_ecg_analyse
from medical_diagnoses import create_medical_diagnose
from ecg_analyse import get_ecg_analyse_by_id
from ecg_analyse import update_ecg_analyse
from auth_middleware import verify_token
from file_validator import ALLOWED_BY_ANALYSIS_TYPE, prepare_upload_filename, validate_file_type, validate_upload, FileValidationError
import ai_errors
import ai_result_guard
import reference_validator
from document_classifier import (
    classify_document,
    STATUS_DONE,
    STATUS_ERROR,
    STATUS_FILE_MISMATCH,
)
from fastapi.staticfiles import StaticFiles
from ecg_analyse_doctors import create_ecg_analyse_doctor
from ecg_analyse_complaints import create_ecg_analyse_complaint
import neurokit2 as nk
import openai
import warnings
import json
from pathlib import Path
from lab_analyses_api import router as lab_router
from holter_analyses_api import router as holter_router
from smad_analyses_api import router as smad_router
from parasitology_api import router as parasitology_router
Image.MAX_IMAGE_PIXELS = 50_000_000  # ZIP bomb himoyasi (50 megapiksel limit)
# Optional for PDF -> image
try:
    from pdf2image import convert_from_bytes
except Exception:
    convert_from_bytes = None

# For fuzzy lead mapping
from fuzzywuzzy import process


import storage
BASE_DIR = Path(__file__).parent  # Loyihangiz papkasi
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR_DIAGNOSE = BASE_DIR / "uploads" / "medical_diagnoses"

UPLOAD_DIR_DIAGNOSE.mkdir(parents=True, exist_ok=True)

UPLOAD_DIR1 = BASE_DIR / "uploads" / "ecg_analyse_files"

UPLOAD_DIR1.mkdir(parents=True, exist_ok=True)

UPLOAD_DIR2 = BASE_DIR / "uploads" / "ecg_generated_files"

UPLOAD_DIR2.mkdir(parents=True, exist_ok=True)


UPLOAD_DIR3 = BASE_DIR / "uploads" / "ecg_generated_short_files"

UPLOAD_DIR3.mkdir(parents=True, exist_ok=True)

def get_unique_filename(directory: Path, filename: str) -> str:
    safe_name = filename.replace(" ", "_")
    filepath = directory / safe_name
    if not filepath.exists():
        return safe_name
    
    # Fayl mavjud bo'lsa, index qo'shib unik nom yaratish
    name, ext = os.path.splitext(safe_name)
    counter = 1
    while True:
        new_name = f"{name}_{counter}{ext}"
        new_filepath = directory / new_name
        if not new_filepath.exists():
            return new_name
        counter += 1
        
def save_diagnose_file(file_bytes: bytes, filename: str) -> str:
    """Shifokor xulosasi faylini saqlaydi."""
    return storage.save("diagnose", filename, file_bytes)

def save_analyse_file(file_bytes: bytes, filename: str) -> str:
    """EKG asl faylini saqlaydi.

    Ilgari fayl loyiha papkasi ichiga (`python_back/uploads/`) va ASL NOMI
    bilan yozilardi. Asl nom bemor ismini o'z ichiga olishi va taxmin
    qilinishi mumkin edi (T-038, T-101). Endi `STORAGE_ROOT` ostiga, sana
    bo'yicha papkalarga va UUID nomi bilan saqlanadi (T-099).
    """
    return storage.save("ecg", filename, file_bytes)

def save_generated_file(file_bytes: bytes, filename: str) -> str:
    """AI uchun generatsiya qilingan EKG grafigini saqlaydi."""
    return storage.save("ecg_generated", filename, file_bytes)

def save_generated_short_file(file_bytes: bytes, filename: str) -> str:
    """Ro'yxatda ko'rsatiladigan kichraytirilgan EKG grafigini saqlaydi."""
    return storage.save("ecg_generated_short", filename, file_bytes)

import asyncio as _asyncio
import logging as _logging
_logger = _logging.getLogger(__name__)
_bg_tasks: set = set()

# ---------------- FastAPI app init ----------------
app = FastAPI(title="AI EKG Analyzer")
app.include_router(lab_router)
app.include_router(holter_router)
app.include_router(smad_router)
app.include_router(parasitology_router)
# Tibbiy fayllar ATAYLAB ochiq berilmaydi.
#
# Ilgari bu yerda `app.mount("/uploads", StaticFiles(...))` bor edi va bemorning
# EKG rasmlari, Holter/SMAD/Laboratoriya PDF fayllari autentifikatsiyasiz,
# URL ni bilgan har kimga ochiq edi (ishlab chiqarishda esa butun internetga).
#
# Endi fayllar faqat .NET API orqali beriladi: `GET /api/files/uploads/...`,
# u yerda token tekshiriladi va fayl foydalanuvchi klinikasiga tegishliligi
# aniqlanadi. Bu C1 (proxy arxitekturasi) talabiga ham mos keladi.
#
# Development uchun statik papkani vaqtincha ochish kerak bo'lsa:
#   SERVE_UPLOADS_INSECURE=true
if os.getenv("SERVE_UPLOADS_INSECURE", "false").lower() == "true":
    _logger.warning(
        "DIQQAT: /uploads papkasi himoyasiz ochildi (SERVE_UPLOADS_INSECURE=true). "
        "Bu faqat lokal ishlab chiqish uchun — ishlab chiqarishda ishlatilmasin."
    )
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- OpenAI API key (config.py dan) ----------------
# OPENAI_API_KEY va ALLOWED_ORIGINS config.py dan import qilingan

# ---------------- Canonical leads ----------------
CANONICAL_LEADS = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']

# ---------------- Lead fuzzy mapping ----------------
def map_leads(candidate_names):
    mapping = {}
    for c in candidate_names:
        clean = str(c).strip()
        # exact or partial match
        for lead in CANONICAL_LEADS:
            if re.search(r'\b' + re.escape(lead) + r'\b', clean, re.IGNORECASE):
                mapping[c] = lead
                break
        else:
            # fuzzy match
            choice, score = process.extractOne(clean, CANONICAL_LEADS)
            mapping[c] = choice if score >= 75 else None
    return mapping

# EKG endi faqat pdf yoki rasm qabul qiladi (file_validator bilan majburlangan).
# Signal fayl (csv/xml/tsv) parserlari olib tashlandi.


def extract_image_bytes_as_signal(b: bytes, paper_speed: float = 25.0) -> Tuple[Dict[str, np.ndarray], float]:
    """
    b: rasm bytes
    paper_speed: mm/s, odatiy 25 mm/s
    """
    img = Image.open(io.BytesIO(b)).convert('L')
    arr = np.array(img)
    arr_inv = 255 - arr

    # Centerline extraction
    ys = np.argmax(arr_inv, axis=0)
    ys_s = nk.signal_smooth(ys.astype(float), method='moving_average', window=5)
    # Convert to mV assuming 10 mm/mV
    mV_per_px = 0.1  # masalan, 1 px = 0.1 mV
    signal_mV = (np.median(ys_s) - ys_s) * mV_per_px

    # Compute sampling rate: pixels / (mm per s)
    # Agar rasm kengligi 25 mm/s bo'lsa va signal length = arr.shape[1] pixels
    fs = (arr.shape[1] / img.width) * paper_speed  # soddalashtirilgan, moslashtirish mumkin
    return {'ImageTrace': signal_mV}, fs



# ---------------- OpenAI upload helper ----------------
def openai_upload_file(api_key: str, file_bytes: bytes, filename: str = "ecg.png") -> str:
    client = OpenAI(api_key=api_key)
    try:
        fobj = io.BytesIO(file_bytes)
        fobj.name = filename
        resp = client.files.create(file=fobj, purpose="vision")  # purpose="answers" PNG uchun to'g'ri
        return resp.id
    except Exception as e:
        raise RuntimeError(f"OpenAI file upload failed: {e}")

# ---------------- Compose prompt ----------------
def compose_prompt_for_openai(digitals, age, gender, complaint, lang) -> str:
    prompt_header = ""
    language = (
    "O'ZBEK" if lang == 'uz'
    else "RUS" if lang == 'ru'
    else "INGLIZ" if lang == 'en'
    else "O'ZBEK"
    )
    # Bemor ma'lumotlari
    if age is not None or gender is not None:
        prompt_header += "Bemor ma'lumotlari:"
        if age is not None:
            prompt_header += f"\n - Yoshi {age}"
        if gender is not None:
            prompt_header += f"\n - Jinsi {gender}"

    # Shikoyatlar
    if complaint and len(complaint) > 0:
        complaint_str = "\n".join([f"- {c}" for c in complaint])
        prompt_header += f"\n\nBemorning shikoyatlari:\n{complaint_str}"
    
    if digitals is not None:
        # EKG parametrlar
        if isinstance(digitals, dict):
            digitals_str = json.dumps(digitals, ensure_ascii=False, indent=2)
        else:
            digitals_str = str(digitals)

        prompt_header += f"\n\nEKG aparatdan olingan ekg parametrlari qiymatlari:\n{digitals_str}"

    
        
    
    
    
    prompt_header += f"""
    
    Siz tajribali kardiolog shifokorsiz.

Sizga:
1) EKG grafik rasmi
2) Bemor ma'lumotlari
3) Bemor shikoyatlari
4) EKG grafikdan aniqlangan raqamli parametrlar

yuboriladi.

Vazifa:
EKG grafiklarini, bemor shikoyatlarini, bemor ma'lumotlarini va berilgan raqamli EKG parametrlarini birgalikda tahlil qiling.
Grafikdagi vizual (paralogik) o'zgarishlarni ham inobatga oling. 
Tahlilda bemorning ma'lumotlari va shikoyatlarini ham inobatga oling.

Vazifa:
- Kardiolog va aritmolog shifokorlar ishlatadigan PROFESSIONAL tibbiy terminlar bilan yozing
- Tashxisni aniq, qisqa va klinik asoslangan qilib yozing
- Agar xavfli holat aniqlansa, alohida qayd eting
- Tashxisdan so'ng qisqa "Xulosa" bo'limini yozing

❗️JAVOB QOIDALARI:
- Javob FAQAT quyida berilgan JSON formatida bo'lsin
- JSON dan tashqarida hech qanday izoh, sharh yoki qo'shimcha matn YOZILMASIN
- Javobni {language} tilida taqdim et
- Agar EKG rasmi sifati yetarli bo'lmasa yoki aniq o'lchash imkoni bo'lmasa, mos maydonda:
  "o'lchab bo'lmaydi"
  deb yozilsin

---

### JSON SHABLONI (QAT'IY SAQLANSIN):

{"""{
  "digital_measurements": {
    "HR": "Yurak urish tezligi (bpm), raqamli qiymat + tibbiy baho (normal/patologik)",
    "PR_interval": "PR interval (ms), raqamli qiymat + izoh",
    "QRS_duration": "QRS davomiyligi (ms), raqamli qiymat + izoh",
    "QT_interval": "QT interval (ms), raqamli qiymat + izoh",
    "QTc_Bazett": "QTc (Bazett) (ms), raqamli qiymat + izoh",
    "QRS_axis": "QRS o'qi (gradus), raqamli qiymat + izoh",
    "P_wave_duration": "P to'lqin davomiyligi (ms), raqamli qiymat + izoh",
    "P_wave_amplitude": "P to'lqin amplitudasi (mV), raqamli qiymat + izoh",
    "R_wave_amplitude": "R to'lqin amplitudasi (mV), raqamli qiymat + izoh",
    "S_wave_amplitude": "S to'lqin amplitudasi (mV), raqamli qiymat + izoh",
    "T_wave_amplitude": "T to'lqin amplitudasi (mV), raqamli qiymat + izoh",
    "PR_segment": "PR segment (ms), raqamli qiymat + izoh",
    "ST_segment_elevation": "ST segment ko'tarilishi/tushishi (mV), raqamli qiymat + izoh",
    "RR_interval": "RR interval (ms), raqamli qiymat + izoh",
    "heart_rate_variability": "HRV (ms), raqamli qiymat + izoh",
    "P_QRS_T_morphology": "P, QRS va T to'lqin shakllari haqida qisqa tavsif"
  },

  "automatic_analysis": "EKG, bemor ma'lumotlari, bemor shikoyatlari va raqamli parametrlar asosida ANIQLANGAN kasalliklarni yoki patologik holatlarni yoz.",

  "analiz_mumkinmi": "true yoki false. Rasmda EKG yozuvi ko'rinmasa, sifati past bo'lsa yoki tahlil qilishning imkoni bo'lmasa — false",

  "analiz_mumkin_emas_sababi": "analiz_mumkinmi false bo'lsa, nima uchun tahlil qilib bo'lmaganini qisqacha yoz. Aks holda null",

  "automatic_analysis_bool": "Holat jiddiyligi darajasi: 1 = normal (patologiya aniqlanmadi yoki topilgani klinik ahamiyatga ega emas), 2 = e'tibor talab qiladi (patologiya bor, shoshilinch emas — rejali ko'rik kerak), 3 = shoshilinch (hayot uchun xavfli yoki tezkor aralashuv talab qiladigan holat). MUHIM: patologiya topilgan bo'lsa — u qanchalik yengil bo'lmasin — 1 QO'YMA, kamida 2 qo'y. 1 faqat toza normal EKG uchun. MUHIM: analiz_mumkinmi false bo'lsa BU MAYDON null bo'lishi SHART",

  "AI_recommendations": "Oddiy tilda bemor uchun tavsiya:
— qo'shimcha tekshiruv zarurati
— jismoniy faollik bo'yicha tavsiya
— shifokorga murojaat qilish zarurati
Agar kasallik aniqlansa, umumiy davolash yo'nalishini qisqacha yoz.",

  "final_summary": "Tibbiy asoslangan yakuniy xulosa:
asosiy EKG topilmalar va umumiy klinik baho."
}"""}

---

### QO'SHIMCHA TALABLAR:
- bemorga tashxis qo'yishda bemor ma'lumotlarini, EKG parametrlarini va EKG rasmdagi grafikni birinchi o'ringa qo'y, undan kn bemor shikoyatlarini ham inobatga ol
- "automatic_analysis" bo'limida faqat BOR patologiyalar yozilsin va yo'qlari haqida ma'lumot shart emas
- "automatic_analysis_bool" bo'limida faqat 1 yoki 2 yoki 3 sonlari bo'lsin ortiqcha narsa kerak emas
- ❗️"automatic_analysis_bool" ni tanlashda: 1 — FAQAT patologiya topilmaganda.
  Agar "automatic_analysis" da bironta patologiya nomi yozilgan bo'lsa
  (masalan I-darajali AV blokada, sinus taxikardiyasi, ekstrasistola),
  daraja kamida 2 bo'lishi SHART. Interfeys 1 ni yashil "Normal" deb
  ko'rsatadi — yengil patologiyani 1 deb belgilash shifokorni yozuvni
  ochmaslikka undaydi.
- ❗️ENG MUHIM: agar rasmda EKG yozuvi ko'rinmasa, rasm bo'sh/xira bo'lsa yoki
  boshqa sababdan tahlil qilishning imkoni bo'lmasa — "analiz_mumkinmi": false
  va "automatic_analysis_bool": null qil. Bunday holatda HECH QACHON 1
  (normal) qo'yma: shifokor yashil belgili yozuvni ochmaydi va
  tahlil qilinmagan EKG "normal" bo'lib qolib ketadi.
- "digital_measurements" bo'limida aniqlash imkoni yo'q parametrlarga null qiymat ber 
- Agar patologiya yo'q bo'lsa, nima sababdan yo'qligi aniq tushuntirilsin
- EKG apparatida yo'q bo'lgan parametrlar grafikdan o'lchab chiqilsin
- Har bir raqam yonida birliklar (bpm, ms, mV, gradus) bo'lsin
- Raqam + tibbiy baho (normal/patologik) birga yozilsin
- Elektrolit, ishemiya, perikardit yoki aritmiya aniqlansa:
  — sababi
  — EKG belgisi
  — klinik ahamiyati qisqacha tushuntirilsin

❗️Javob FAQAT JSON bo'lsin va {language} tilida bo'lsin
    """
    return prompt_header


def compose_prompt_for_openai_for_img(age, gender, complaint, lang) -> str:
    language = (
        "O'ZBEK" if lang == 'uz'
        else "RUS" if lang == 'ru'
        else "INGLIZ" if lang == 'en'
        else "O'ZBEK"
    )

    patient_info = ""

    if age is not None or gender is not None:
        patient_info += "Bemor ma'lumotlari:"
        if age is not None:
            patient_info += f"\n- Yoshi: {age}"
        if gender is not None:
            patient_info += f"\n- Jinsi: {gender}"

    if complaint:
        if isinstance(complaint, str):
            complaints = [complaint]
        else:
            complaints = complaint

        complaint_str = "\n".join(
            f"- {c}" for c in complaints if c
        )

        if complaint_str:
            patient_info += f"\n\nBemorning shikoyatlari:\n{complaint_str}"

    prompt = f"""
{patient_info}

Siz tajribali kardiolog va aritmolog shifokorsiz.
Yuborilgan EKG rasmini professional tahlil qiling.

MUHIM QOIDALAR:

- Tahlilni boshlashdan oldin EKG rasmining orientatsiyasini tekshiring.
  Agar rasm 90°, 180° yoki 270° ga aylangan, teskari yoki yonboshlagan bo'lsa,
  avval uni to'g'ri o'qish holatiga keltirilgan deb tasavvur qiling.

- Avval EKG apparati tomonidan chop etilgan raqamli qiymatlarni qidiring:
  HR/ЧСС, PR/PQ, QRS, QT, QTc, P/QRS/T axis va boshqa mavjud parametrlar.

- Apparat tomonidan chop etilgan qiymatlar birlamchi manba hisoblanadi.
  Agar parametr rasmda yozilgan bo'lsa, aynan shu qiymatdan foydalaning,
  uni grafikdan qayta hisoblamang.

- Rasm teskari yoki qiya bo'lsa, apparat yozuvlarini faqat to'g'ri
  orientatsiyada o'qigandan keyin qiymatlarni qaytaring.

- Apparat yozmagan parametrni faqat EKG grid, kalibratsiya va tasvir
  sifati yetarli bo'lsa rasmdan aniqlashga harakat qiling.

- Hech qanday raqamli qiymatni taxmin qilmang.
  Ishonchli aniqlab bo'lmasa null qaytaring.

- Ayrim raqamli parametrlarni aniqlab bo'lmasligi butun EKG tahlilini
  to'xtatish uchun sabab emas.

- Raqamli o'lchovlar aniqlanmasa ham ritm, P-QRS-T morfologiyasi,
  ST-T o'zgarishlari, aritmiya va boshqa ko'rinadigan patologik
  belgilarni vizual tahlil qilishni davom ettiring.

- Bemorning yoshi, jinsi va shikoyatlarini klinik kontekst sifatida
  hisobga oling, lekin EKGda ko'rinmaydigan holatni o'ylab topmang.

- Patologiya aniq bo'lmasa, ehtimoliy holat sifatida yozing.

- HRVni faqat yetarli RR ma'lumotlari mavjud bo'lsa aniqlang,
  aks holda null qaytaring.

- QTc apparatda yozilgan bo'lsa aynan shu qiymatdan foydalaning.
  Apparatda yozilmagan bo'lsa faqat QT va RR ishonchli aniqlanganda hisoblang.

- EKG rasmidagi grafikni tajribali kardiolog kabi mustaqil ravishda vizual tahlil qiling va grafikda ko'rinadigan patologik, morfologik hamda ritmga oid belgilarni aniqlang.

- Agar biror parametrning son qiymati EKG rasmida allaqachon yozilgan bo'lsa, shu parametr qiymatini grafikdan qayta hisoblamang yoki boshqa qiymat bilan almashtirmang. Aynan rasmda yozilgan qiymatdan foydalaning.

- Faqat EKG rasmida son qiymati umuman berilmagan parametrlarni grafikning vizual ko'rinishi asosida aniqlashga harakat qiling.

- Grafikni vizual tahlil qilishda noodatiy sakrashlar, muddatidan oldin kelgan komplekslar, ekstrasistoliyalar, pauzalar, ritmning buzilishi, ST-T o'zgarishlari, patologik Q to'lqinlari, blokadalar, aritmiyalar va boshqa ko'rinadigan patologik belgilar mavjud bo'lsa, ularni tahlilda albatta qayd eting.

- Grafikdagi patologik belgilarni aniqlash raqamli parametrlarni qayta hisoblashdan alohida vazifa hisoblanadi.

- Davolash tavsiyasida aniq dori dozasi yoki individual dori sxemasini
  belgilamang.

Javob quyidagi JSON shaklida bo'lsin.
JSON strukturasi va key nomlarini O'ZGARTIRMANG.
Javobdan oldin yoki keyin hech qanday matn yozmang.

{{
  "digital_measurements": {{
    "HR": "Yurak urish tezligi (bpm), raqamli qiymat + tibbiy baho (normal/patologik)",
    "PR_interval": "PR interval (ms), raqamli qiymat + izoh",
    "QRS_duration": "QRS davomiyligi (ms), raqamli qiymat + izoh",
    "QT_interval": "QT interval (ms), raqamli qiymat + izoh",
    "QTc_Bazett": "QTc (Bazett) (ms), raqamli qiymat + izoh",
    "QRS_axis": "QRS o'qi (gradus), raqamli qiymat + izoh",
    "P_wave_duration": "P to'lqin davomiyligi (ms), raqamli qiymat + izoh",
    "P_wave_amplitude": "P to'lqin amplitudasi (mV), raqamli qiymat + izoh",
    "R_wave_amplitude": "R to'lqin amplitudasi (mV), raqamli qiymat + izoh",
    "S_wave_amplitude": "S to'lqin amplitudasi (mV), raqamli qiymat + izoh",
    "T_wave_amplitude": "T to'lqin amplitudasi (mV), raqamli qiymat + izoh",
    "PR_segment": "PR segment (ms), raqamli qiymat + izoh",
    "ST_segment_elevation": "ST segment ko'tarilishi yoki tushishi (mV), raqamli qiymat + izoh",
    "RR_interval": "RR interval (ms), raqamli qiymat + izoh",
    "heart_rate_variability": "HRV (ms), raqamli qiymat + izoh",
    "P_QRS_T_morphology": "P, QRS va T to'lqin shakllarining qisqa professional tavsifi"
  }},

  "automatic_analysis": "EKG, bemor ma'lumotlari va bemor shikoyatlari asosida ANIQLANGAN patologik holatlar yoki kasalliklar.",

  "automatic_analysis_bool": "Holat jiddiyligi darajasi: 1 = normal (patologiya aniqlanmadi yoki topilgani klinik ahamiyatga ega emas), 2 = e'tibor talab qiladi (patologiya bor, shoshilinch emas — rejali ko'rik kerak), 3 = shoshilinch (hayot uchun xavfli yoki tezkor aralashuv talab qiladigan holat). MUHIM: patologiya topilgan bo'lsa — u qanchalik yengil bo'lmasin — 1 QO'YMA, kamida 2 qo'y.",

  "AI_recommendations": "Oddiy tilda bemor uchun tavsiyalar:  Agar kasallik yoki patologiya aniqlansa, umumiy davolash yo'nalishi qisqacha yozilsin. Agar aniqlanmasa EKG holatiga bemorga qarab tavsiya berilsin.",

  "final_summary": "Tibbiy asoslangan yakuniy xulosa: asosiy EKG topilmalari va umumiy klinik baho."
}}

MUHIM:
"digital_measurements" ichida aniqlash imkoni bo'lmagan parametr qiymatini
null qilib qaytaring va aniqlangan qiymatlarda taxminan degan so'zni yozma.

Javob FAQAT valid JSON va {language} tilida bo'lsin.
"""

    return prompt.strip()



#: 12 kanalli EKG grafigining eni (piksel). Figure eni 25 dyuym,
#: shuning uchun DPI shu qiymatdan hisoblanadi.
ECG_RENDER_TARGET_WIDTH = 2600


#: `compute_full_ecg_v3` kaliti -> (sxema kaliti, birlik).
#: Sxema kalitlari `ai_schema.ECG_MEASUREMENTS` va frontenddagi
#: `EcgResult.js` bilan bir xil bo'lishi SHART.
_SIGNAL_KEY_MAP = {
    "heart_rate_bpm":        ("HR", "bpm"),
    "pr_interval_ms":        ("PR_interval", "ms"),
    "qrs_duration_ms":       ("QRS_duration", "ms"),
    "qt_interval_ms":        ("QT_interval", "ms"),
    "qt_c_bazett_ms":        ("QTc_Bazett", "ms"),
    "qrs_axis_degree":       ("QRS_axis", "°"),
    "p_wave_duration_ms":    ("P_wave_duration", "ms"),
    "t_wave_amplitude_mv":   ("T_wave_amplitude", "mV"),
    "st_segment_mv":         ("ST_segment_elevation", "mV"),
    "rr_interval_ms":        ("RR_interval", "ms"),
    "sokolow_lyon_index_mv": ("Sokolow_Lyon", "mV"),
}


def _signal_to_schema(digitals: dict | None) -> dict | None:
    """Signal hisob-kitobi natijasini sxema kalitlariga o'giradi (T-029).

    Faqat ekranda va hisobotda ko'rsatiladigan ko'rsatkichlar olinadi.
    Qolganlari (`rv5_sv1_sum_mv`, `r_wave_v1_unit` va h.k.) oraliq
    qiymatlar bo'lib, shifokorga alohida ma'no bermaydi.
    """
    if not digitals:
        return None

    result = {}
    for source_key, (schema_key, unit) in _SIGNAL_KEY_MAP.items():
        value = digitals.get(source_key)
        if value is None:
            continue
        # Sxemada qiymatlar matn: shifokor `140` emas, `140 ms` ko'rishi kerak
        result[schema_key] = f"{value} {unit}".strip()

    return result or None


def render_12_lead_png(leads: dict, fs: float = 500.0) -> bytes:
    plt.rcParams['path.simplify'] = False
    plt.rcParams['agg.path.chunksize'] = 10000

    LEFT_LEADS = ['I','II','III','aVR','aVL','aVF']
    RIGHT_LEADS = ['V1','V2','V3','V4','V5','V6']

    n_rows = 6
    n_cols = 2

    fig, axes = plt.subplots(
        n_rows, n_cols,
        figsize=(25, n_rows * 2.0),
        sharex=False,
        constrained_layout=False
    )

    BASE_MAJOR = 25
    BASE_MINOR = 5
    SCALE = 2
    BIG = BASE_MAJOR * SCALE
    SMALL = BASE_MINOR * SCALE

    for ax in axes.flatten():
        ax.set_facecolor("none")

        # --- BORDERNI YO'QOTISH ---
        for side in ["top", "bottom", "left", "right"]:
            ax.spines[side].set_visible(False)

        ax.tick_params(left=False, bottom=False)

    # --- Signalni chizish ---
    for i in range(n_rows):
        for j, lead in enumerate([LEFT_LEADS[i], RIGHT_LEADS[i]]):
            ax = axes[i, j]
            if lead not in leads:
                continue

            y = leads[lead]
            ax.plot(y, color='black', linewidth=1.1)
            ax.set_ylabel(lead, rotation=0, labelpad=10, fontsize=18)

            y_min, y_max = np.min(y), np.max(y)
            y_range = max(y_max - y_min, 0.001)
            ax.set_ylim(y_min - y_range * 0.1, y_max + y_range * 0.1)
            ax.set_yticks([y_min, y_max])
            ax.set_yticklabels([], fontsize=14)
            
            x_min, x_max = 0, len(y) - 0.5
            ax.set_xticks([x_min, x_max])
            ax.set_xticklabels([], fontsize=0)
    # --- Gridni o'rnatish ---
    for ax in axes.flatten():
        ax.set_xticks(np.arange(0, len(y)/2, BIG))
        ax.set_xticks(np.arange(0, len(y)/2, SMALL), minor=True)
        ax.set_yticks(np.arange(-13, 2, 0.5))  
        ax.set_yticks(np.arange(-13, 2, 0.1), minor=True)
        ax.minorticks_off()

    fig.tight_layout()
    fig.subplots_adjust(hspace=0.2, wspace=0.02)
    fig.canvas.draw()

    for ax in axes.flatten():
        ax.grid(False)
        ax.minorticks_off()

    fig_axes = fig.add_subplot(111, frame_on=True, zorder=-100)
    fig_axes.set_xticks(np.arange(0, len(y), BIG), minor=False)
    fig_axes.set_xticks(np.arange(0, len(y), SMALL), minor=True)
    fig_axes.set_yticks(np.arange(-13, 2, 0.5), minor=False)
    fig_axes.set_yticks(np.arange(-13, 2, 0.1), minor=True)
    fig_axes.grid(which='major', color="#ffb0b0", linewidth=0.8)
    fig_axes.grid(which='minor', color="#fdcbcb", linewidth=0.4)
    fig_axes.set_xticklabels([])
    fig_axes.set_yticklabels([])

    fig_axes.tick_params(left=False, bottom=False)

    buf = io.BytesIO()
    # `dpi=650` figsize (25 x 12 dyuym) bilan birga 16250 x 7800 = **126
    # megapiksel** rasm berardi. Pillow uni "decompression bomb" deb rad
    # etardi va SIGNAL FAYLLARI UMUMAN ISHLAMASDI — bu nosozlik T-029 ni
    # sinash paytida aniqlandi (`DecompressionBombError`).
    #
    # Ko'rsatish uchun maqsad — 2600 px en: EKG kataklarini o'lchash uchun
    # yetarli va T-047 dagi ko'rsatish quvuri (2000 px) bilan mos.
    plt.savefig(buf, format='png', dpi=ECG_RENDER_TARGET_WIDTH / 25)
    plt.close(fig)
    buf.seek(0)
    return buf.read()

def bandpass(signal, fs, low=5.0, high=40.0, order=3):
    nyq = 0.5 * fs
    b, a = butter(order, [low/nyq, high/nyq], btype='band')
    return filtfilt(b, a, signal)

def moving_average(x, window_len):
    if window_len <= 1:
        return x
    window = np.ones(window_len) / window_len
    return np.convolve(x, window, mode='same')

def detect_r_peaks(signal, fs):
    # 1) Bandpass
    sig = bandpass(signal, fs, low=5.0, high=35.0, order=2)

    # 2) Derivative
    deriv = np.diff(sig, prepend=sig[0])
    # 3) Squaring
    squared = deriv**2
    # 4) Moving window integration (~150 ms)
    ma_win = int(round(0.150 * fs))
    env = moving_average(squared, ma_win if ma_win>1 else 1)

    # Adaptive threshold: mean + k * std
    thr = np.mean(env) + 0.5 * np.std(env)
    distance = int(round(0.25 * fs))  # 250 ms refractory by default

    peaks, props = find_peaks(env, height=thr, distance=distance)
    # refine peaks to actual R locations on original (search +/- 50 ms for max)
    r_peaks = []
    search_half = int(round(0.05 * fs))
    for p in peaks:
        lo = max(0, p - search_half)
        hi = min(len(sig)-1, p + search_half)
        local_max_idx = lo + int(np.argmax(np.abs(sig[lo:hi+1])))
        r_peaks.append(local_max_idx)
    # remove duplicates / sort
    r_peaks = np.array(sorted(list(set(r_peaks))), dtype=int)
    return r_peaks

def detect_pr_interval(signal, fs):
    try:
        signals, info = nk.ecg_process(signal, sampling_rate=fs)

        signals_delineate, waves = nk.ecg_delineate(signals["ECG_Clean"], 
                                                r_peaks=info["ECG_R_Peaks"], 
                                                sampling_rate=fs, 
                                                method="dwt")

        p_onsets = np.array(waves['ECG_P_Onsets'])
        r_onsets = np.array(waves['ECG_R_Onsets'])
    
        valid_indices = ~np.isnan(p_onsets) & ~np.isnan(r_onsets)
    
        if not np.any(valid_indices):
            return 0.0  # Agar birorta ham interval topilmasa

        sample_diffs = r_onsets[valid_indices] - p_onsets[valid_indices]
    
        sample_diffs = sample_diffs[sample_diffs > 0]

        if len(sample_diffs) == 0:
            return 0.0

        pr_intervals_ms = (sample_diffs / fs) * 1000
        

        avg_pr = np.mean(pr_intervals_ms)
    
        return round(float(avg_pr), 1)
    except Exception as e:
        return 0.0

def detect_qrs_duration(signal, fs):
    try:
        # 1. R-peaks topish
        peaks_info = nk.ecg_findpeaks(signal, sampling_rate=fs)
        r_peaks = peaks_info["ECG_R_Peaks"]

        if len(r_peaks) < 2:
            return 0.0

        # 2. Delineation (DWT usuli)
        _, waves = nk.ecg_delineate(signal, r_peaks, sampling_rate=fs, method="dwt")

        onsets = np.array(waves.get('ECG_R_Onsets', waves.get('ECG_Q_Onsets', [])))
        offsets = np.array(waves.get('ECG_R_Offsets', waves.get('ECG_S_Offsets', [])))

        valid_idx = ~np.isnan(onsets) & ~np.isnan(offsets)
        if not np.any(valid_idx):
            return 0.0

        durations = (offsets[valid_idx] - onsets[valid_idx]) / fs * 1000

        # 3. Klinik filtr (60ms - 160ms)
        valid_durations = durations[(durations >= 60) & (durations <= 165)]

        if len(valid_durations) == 0:
            return 0.0

        # 4. APPARATGA MOSLASH (Calibration): 
        # Median (50%) emas, 15-percentile ni olish NeuroKit'ning +20ms xatosini yo'qotadi.
        # Bu ro'yxatdagi eng ixcham va toza qismlarni tanlab oladi.
        qrs_final = np.percentile(valid_durations, 0)

        # 5. Qo'shimcha xavfsizlik (ixtiyoriy): 
        # Agar natija baribir apparatdan baland bo'lsa, qat'iy 10ms ayirib tashlang
        # qrs_final = qrs_final - 10 

        return round(float(qrs_final), 1)

    except Exception:
        return 0.0
def calculate_qt_interval(signal, fs):
    try:
        signal = np.array(signal)
        cleaned = nk.ecg_clean(signal, sampling_rate=fs)
        peaks_info = nk.ecg_findpeaks(cleaned, sampling_rate=fs)
        r_peaks = peaks_info["ECG_R_Peaks"]

        if len(r_peaks) < 2: return 0.0

        _, waves = nk.ecg_delineate(cleaned, r_peaks, sampling_rate=fs, method="dwt")
        q_onsets = np.array(waves.get('ECG_Q_Onsets', waves.get('ECG_R_Onsets', [])))
        t_offsets = np.array(waves.get('ECG_T_Offsets', []))

        valid_idx = ~np.isnan(q_onsets) & ~np.isnan(t_offsets)
        if not np.any(valid_idx): return 0.0

        durations = (t_offsets[valid_idx] - q_onsets[valid_idx]) / fs * 1000
        
        # Klinik filtr (shovqinli leadlarni chetlatish)
        valid_durations = durations[(durations >= 320) & (durations <= 520)]

        if len(valid_durations) == 0: return 0.0

        # Har bir lead uchun barqaror o'rtacha (median) ni olamiz
        return round(float(np.median(valid_durations)), 1)
    except:
        return 0.0
def calculate_qtc(qt_ms, hr_bpm):
    """
    Bazett formulasi bo'yicha QTc intervalini hisoblaydi.
    QTc = QT / sqrt(RR)
    RR = 60 / Heart_Rate
    """
    try:
        if qt_ms <= 0 or hr_bpm <= 0:
            return 0.0
        
        # RR intervalni soniyalarda hisoblash
        rr_sec = 60.0 / hr_bpm
        
        # Bazett formulasi
        qtc = qt_ms / math.sqrt(rr_sec)
        
        return round(float(qtc), 1)
    except Exception:
        return 0.0
    
def calculate_qrs_axis_robust(leads, fs):
    """
    EKG apparati mantiqi bo'yicha QRS o'qi darajasini hisoblaydi.
    I va aVF tarmoqlari o'rtasidagi Net Area (yuzalar) nisbatini oladi.
    """
    try:
        # 1. Leadlarni numpy array ko'rinishida olish
        lead_i_raw = leads.get('I')
        lead_ii_raw = leads.get('II')
        lead_iii_raw = leads.get('III')
        
        if lead_i_raw is None or lead_ii_raw is None:
            return None

        # Signallarni tozalash (Baseline driftni yo'qotish)
        lead_i = nk.ecg_clean(np.asarray(lead_i_raw), sampling_rate=fs)
        lead_ii = nk.ecg_clean(np.asarray(lead_ii_raw), sampling_rate=fs)
        
        # 2. aVF tarmog'ini shakllantirish
        if 'aVF' in leads:
            lead_avf = nk.ecg_clean(np.asarray(leads['aVF']), sampling_rate=fs)
        elif lead_iii_raw is not None:
            lead_iii = nk.ecg_clean(np.asarray(lead_iii_raw), sampling_rate=fs)
            lead_avf = (lead_ii + lead_iii) / 2
        else:
            lead_avf = lead_ii - (0.5 * lead_i)

        # 3. R-peaklarni va QRS chegaralarini aniqlash (NeuroKit2 yordamida)
        _, r_peaks_dict = nk.ecg_peaks(lead_ii, sampling_rate=fs)
        r_peaks = r_peaks_dict['ECG_R_Peaks']
        
        # QRS chegaralarini (onset va offset) topish
        try:
            _, waves_peak = nk.ecg_delineate(lead_ii, r_peaks, sampling_rate=fs, method="peak")
            qrs_onsets = waves_peak['ECG_Q_Peaks'] # yoki ECG_R_Onsets
            qrs_offsets = waves_peak['ECG_S_Peaks'] # yoki ECG_R_Offsets
        except:
            # Agar delineator ishlamasa, R-peak atrofida oyna olish (taxminiy)
            qrs_onsets = [max(0, r - int(0.05 * fs)) for r in r_peaks]
            qrs_offsets = [min(len(lead_ii)-1, r + int(0.05 * fs)) for r in r_peaks]

        # 4. Net Area hisoblash funksiyasi
        def net_qrs_area_for_lead(signal, onsets, offsets):
            areas = []
            for o, p in zip(onsets, offsets):
                if o is not None and p is not None and not np.isnan(o) and not np.isnan(p):
                    o, p = int(o), int(p)
                    if p > o:
                        # Signalning o'rtacha qiymatini (baseline) chiqarib tashlab hisoblash
                        segment = signal[o:p+1]
                        areas.append(np.trapz(segment))
            return float(np.mean(areas)) if areas else 0.0

        i_area = net_qrs_area_for_lead(lead_i, qrs_onsets, qrs_offsets)
        avf_area = net_qrs_area_for_lead(lead_avf, qrs_onsets, qrs_offsets)

        # 5. O'qni hisoblash (atan2(y, x))
        if i_area == 0.0 and avf_area == 0.0:
            return 0.0
            
        axis_rad = math.atan2(avf_area, i_area)
        axis_deg = math.degrees(axis_rad)
        
        return round(float(axis_deg+10*(axis_deg/abs(axis_deg))), 1)

    except Exception as e:
        return None
def get_global_st_status(st_results):
    """
    ST natijalari lug'atidan umumiy xulosaviy qiymatni chiqaradi.
    """
    values = list(st_results.values())
    
    # 1. Maksimal elevatsiya (eng xavfli nuqtani topish uchun)
    max_elevation = max(values)
    
    # 2. Maksimal depressiya (eng past manfiy nuqta)
    max_depression = min(values)
    
    # Odatda eng katta og'ish (absolyut qiymat bo'yicha) olinadi
    global_st = max_elevation if abs(max_elevation) > abs(max_depression) else max_depression
    return global_st
 
def get_st_segment_mv(leads_data, fs, gain=1000):
    st_results = {}

    for lead_name, signal in leads_data.items():
        try:
            # 1. Signalni mV ga o'tkazish va tozalash
            sig = np.array(signal) / gain
            cleaned = nk.ecg_clean(sig, sampling_rate=fs)
            
            # 2. Faqat R-cho'qqilarini topamiz (bu eng oson va aniq topiladigan nuqta)
            _, rpeaks = nk.ecg_peaks(cleaned, sampling_rate=fs)
            peaks = rpeaks['ECG_R_Peaks']
            
            beat_st_levels = []
            
            for r_idx in peaks:
                # Izolinya (Baseline): R cho'qqisidan 80ms oldingi nuqta (PR segmenti)
                baseline_idx = r_idx - int(fs * 0.08)
                
                # ST nuqtasi: R cho'qqisidan 120ms keyingi nuqta (ST segmenti o'rtasi)
                # (QRS kompleksi odatda 80-100ms davom etadi, shuning uchun 120ms - bu ST boshlanishi)
                st_idx = r_idx + int(fs * 0.12)
                
                # Signal chegarasidan chiqib ketmaslikni tekshiramiz
                if baseline_idx > 0 and st_idx < len(cleaned):
                    baseline_val = cleaned[baseline_idx]
                    st_val = cleaned[st_idx]
                    
                    # ST segmenti = ST_nuqtasi - Izolinya
                    beat_st_levels.append(st_val - baseline_val)
            
            if beat_st_levels:
                st_results[lead_name] = float(np.mean(beat_st_levels))
            else:
                st_results[lead_name] = 0.0
                
        except Exception:
            st_results[lead_name] = 0.0
    summary = get_global_st_status(st_results)       
    return summary


def check_t_wave_inversion(leads, fs=500):
    inversion_detected = None
    critical_leads = ['I', 'II', 'V4', 'V5', 'V6']
    
    for lead in critical_leads:
        if lead in leads and leads[lead] is not None:
            try:
                # Signalni tozalash va massivga o'tkazish
                sig = np.array(nk.ecg_clean(leads[lead], sampling_rate=fs))
                _, rpeaks = nk.ecg_peaks(sig, sampling_rate=fs)
                _, waves = nk.ecg_delineate(sig, rpeaks, sampling_rate=fs, method="cwt")
                
                # T to'lqini cho'qqilarini olish
                t_peaks = np.array(waves.get('ECG_T_Peaks', []))
                
                # NaN bo'lmagan indekslarni ajratib olish
                valid_indices = t_peaks[~np.isnan(t_peaks)].astype(int)
                
                if len(valid_indices) > 0:
                    # T-to'lqinlari cho'qqilaridagi o'rtacha qiymat
                    t_values = sig[valid_indices]
                    avg_t_val = np.mean(t_values)
                    inversion_detected=avg_t_val
            except Exception:
                continue
                
    return inversion_detected
    

def compute_full_ecg_v3(leads, fs=500):
    heart_rate_bpm_array=[]
    pr_intervals_ms=[]
    qrs_intervals_ms=[]
    rr_intervals_ms=[]
    qt_intervals_ms=[]
    p_durations_ms = []  # Yangi
    t_amplitudes_mv = [] 
    qtc_final=None
    heart_rate_bpm=None
    pr_interval_ms=None
    qt_interval_ms=None
    rr_interval_ms=None
    qrs_interval_ms=None
    for lead in CANONICAL_LEADS:
        lead_ii = np.asarray(leads[lead])
        lead_ii = nk.ecg_clean(lead_ii, fs)
        r_peaks = detect_r_peaks(lead_ii, fs)
        _, rpeaks1 = nk.ecg_peaks(lead_ii, sampling_rate=fs)
        _, waves = nk.ecg_delineate(lead_ii, rpeaks1, sampling_rate=fs, method="cwt")
        rr_intervals = np.diff(r_peaks) / float(fs)  # seconds
        if rr_intervals.size > 0:
            mean_rr = float(np.mean(rr_intervals))  # seconds
            heart_rate_bpm = 60.0 / mean_rr
            rr_interval_ms = mean_rr * 1000.0
        else:
            mean_rr = None
            heart_rate_bpm = None
            rr_interval_ms = None
        if heart_rate_bpm is not None and heart_rate_bpm>0:
            heart_rate_bpm_array.append(heart_rate_bpm)
        
        pr_interval_ms1 = detect_pr_interval(lead_ii,  fs)
        if pr_interval_ms1 is not None and pr_interval_ms1>0:
            pr_intervals_ms.append(pr_interval_ms1)
        
        qt_interval_ms1 = calculate_qt_interval(lead_ii,  fs)
        if qt_interval_ms1 is not None and qt_interval_ms1>0:
            qt_intervals_ms.append(qt_interval_ms1)

        qrs_interval_ms1 = detect_qrs_duration(lead_ii,  fs)-10
        if qrs_interval_ms1 is not None and qrs_interval_ms1>0:
            qrs_intervals_ms.append(qrs_interval_ms1)
        
        if rr_interval_ms is not None and rr_interval_ms>0:
            rr_intervals_ms.append(rr_interval_ms)
        if not np.isnan(waves['ECG_P_Onsets']).all():
            p_dur = np.nanmean(np.array(waves['ECG_P_Offsets']) - np.array(waves['ECG_P_Onsets'])) * (1000/fs)
            p_durations_ms.append(p_dur)
            
        t_peaks_indices = np.array(waves['ECG_T_Peaks'])

        valid_t_indices = t_peaks_indices[~np.isnan(t_peaks_indices)].astype(int)

        if len(valid_t_indices) > 0:
            t_amp = np.nanmean(lead_ii[valid_t_indices]) / 1000.0
            t_amplitudes_mv.append(t_amp)
        else:
            t_amplitudes_mv.append(0.0)
        
    pr_interval_ms=round(float(max(pr_intervals_ms)), 1)
    qt_interval_ms = round(float(np.percentile(qt_intervals_ms, 25)), 1) if qt_intervals_ms else 0.0
    if qrs_intervals_ms:
        # 0 qiymatlardan tozalanganligiga ishonch hosil qilamiz
        qrs_interval_ms = round(float(np.percentile(qrs_intervals_ms, 25)), 1)
    else:
        qrs_interval_ms = 0.0
    rr_interval_ms=round(float(max(rr_intervals_ms)), 1)
    heart_rate_bpm=round(float(max(heart_rate_bpm_array)), 1)
    qtc_final=None
    if heart_rate_bpm is not None and heart_rate_bpm>0 and qt_interval_ms is not None and qt_interval_ms>0:
        qtc_final = calculate_qtc(qt_interval_ms, heart_rate_bpm)
    
    qrs_axis_degree=calculate_qrs_axis_robust(leads, fs)
    st_segment=get_st_segment_mv(leads, fs)
    s_v1 = np.abs(np.min(leads['V1'])) / 1000.0
    r_v5 = np.max(leads['V5']) / 1000.0
    sokolow_index = s_v1 + r_v5

    # 2. R-wave Progression (Yangi)
    r_v1 = float(np.max(np.array(leads.get('V1', [0]))))
    r_v2 = float(np.max(np.array(leads.get('V2', [0]))))
    r_v3 = float(np.max(np.array(leads.get('V3', [0]))))
    r_v4 = float(np.max(np.array(leads.get('V4', [0]))))
    
    # 3. T-wave Inversion (Yangi)
    t_inversion = check_t_wave_inversion(leads, fs)
    return {
    "heart_rate_bpm": round(heart_rate_bpm, 1) if heart_rate_bpm is not None else 0,
    "pr_interval_ms": round(pr_interval_ms, 1) if pr_interval_ms is not None else None,
    "qt_interval_ms": round(qt_interval_ms, 1) if qt_interval_ms is not None else 0,
    "qt_c_bazett_ms": round(qtc_final, 1) if qtc_final is not None else 0,
    "rr_interval_ms": round(rr_interval_ms, 1) if rr_interval_ms is not None else 0,
    "qrs_duration_ms": round(qrs_interval_ms, 1) if qrs_interval_ms is not None else 0,
    "qrs_axis_degree": round(qrs_axis_degree, 1) if qrs_axis_degree is not None else None,
    "st_segment_mv": round(st_segment, 4) if st_segment is not None else 0,
    
    # Yangi diagnostik parametrlar
    "p_wave_duration_ms": round(float(np.mean(p_durations_ms)), 1) if p_durations_ms else 0,
    "t_wave_amplitude_mv": round(float(np.max(t_amplitudes_mv)), 3) if t_amplitudes_mv else 0,
    "sokolow_lyon_index_mv": round(sokolow_index, 2) if sokolow_index is not None else 0,
    "rv5_sv1_sum_mv": round(sokolow_index, 2) if sokolow_index is not None else 0, 
    "r_wave_v1_unit": round(r_v1, 1) if r_v1 is not None else 0,
    "r_wave_v2_unit": round(r_v2, 1) if r_v2 is not None else 0,
    "r_wave_v3_unit": round(r_v3, 1) if r_v3 is not None else 0,
    "r_wave_v4_unit": round(r_v4, 1) if r_v4 is not None else 0,
    "average_T_wave_value": t_inversion
}


from PIL import Image
import io
import duplicate_guard
import provider_health
import ai_schema
import ai_translate

def compress_image_bytes(file_bytes: bytes, max_width=500, max_height=500, quality=90, output_format="PNG") -> bytes:
    img = Image.open(io.BytesIO(file_bytes))
    
    # Proportsional kichraytirish
    orig_width, orig_height = img.size
    ratio = min(max_width / orig_width, max_height / orig_height, 1)
    if ratio < 1:
        new_size = (int(orig_width * ratio), int(orig_height * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)  # <-- Yangilandi
    
    # Bytesga saqlash
    output_bytes = io.BytesIO()
    if output_format.upper() == "JPEG":
        img = img.convert("RGB")
        img.save(output_bytes, format="JPEG", quality=quality, optimize=True)
    else:
        img.save(output_bytes, format="PNG", optimize=True)
    
    return output_bytes.getvalue()

#: Ko'rsatish uchun rasmning eng katta eni. 2000 px EKG lentasidagi
#: intervallarni o'qish uchun yetarli, hajmi esa maqbul.
DISPLAY_IMAGE_MAX_WIDTH = 2000

#: JPEG sifati. 85 — matn va ingichka chiziqlar uchun yaxshi muvozanat.
DISPLAY_IMAGE_QUALITY = 85


def prepare_display_image(file_bytes: bytes) -> bytes:
    """Yuklangan rasmni ko'rsatish va PDF uchun tayyorlaydi (T-047).

    Ilgari bu yerda `jpg_bytes_to_png_bytes` ishlatilardi va u JPG ni
    o'lchamini o'zgartirmasdan PNG ga o'girardi. PNG yo'qotishsiz format
    bo'lgani uchun telefonda olingan 4.2 MB JPG (4032x3024) **14 MB PNG**
    ga aylanardi. Bu:
      * PDF hisobotni 14 MB qilardi (T-039);
      * diskda o'nlab megabaytni behuda egallardi;
      * mobil internetda ochilishini bir necha daqiqaga cho'zardi.

    Endi rasm eni bo'yicha kichraytiriladi va JPEG sifatida saqlanadi.
    Asl fayl `analyse_file_link` da o'zgarishsiz turadi — arxiv sifatida.
    """
    img = Image.open(io.BytesIO(file_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")

    width, height = img.size
    if width > DISPLAY_IMAGE_MAX_WIDTH:
        new_height = int(height * DISPLAY_IMAGE_MAX_WIDTH / width)
        # LANCZOS — ingichka EKG chiziqlarini eng yaxshi saqlaydi
        img = img.resize((DISPLAY_IMAGE_MAX_WIDTH, new_height), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=DISPLAY_IMAGE_QUALITY, optimize=True)
    buf.seek(0)
    result = buf.read()

    _logger.info(
        "Ko'rsatish rasmi tayyorlandi: %d x %d -> %d x %d, %.1f MB -> %.2f MB",
        width, height, img.size[0], img.size[1],
        len(file_bytes) / 1048576, len(result) / 1048576,
    )
    return result


#: Sun'iy intellektga yuboriladigan rasmning eng katta eni.
#: Ko'rsatish uchun 2000 px yetarli, AI uchun esa emas: ST segment
#: siljishi 0.05–0.1 mV, ya'ni EKG qog'ozida atigi 0.5–1 mm. Suratni
#: 4032 px dan 2000 px ga kichraytirish aynan shu darajadagi
#: tafsilotni yo'qotadi.
AI_IMAGE_MAX_WIDTH = 3500

#: AI uchun JPEG sifati. Ko'rsatish uchun 85 yetarli, lekin q85
#: ingichka chiziqlar atrofida artefakt hosil qiladi va ular nozik
#: siljishlarga o'xshab ko'rinadi.
AI_IMAGE_QUALITY = 95


def prepare_ai_image(file_bytes: bytes) -> bytes:
    """Sun'iy intellektga yuborish uchun rasmni tayyorlaydi (A-2).

    Ilgari AI ga **ko'rsatish uchun tayyorlangan** nusxa yuborilardi:
    2000 px, JPEG q85. Ya'ni tizim arxivda asl faylni saqlagani holda
    modelga uning eng past sifatli variantini berardi.

    Bu yerda maqsad boshqacha — tafsilotni saqlash:

    * asl o'lcham 3500 px dan kichik bo'lsa **umuman tegilmaydi**;
    * kattaroq bo'lsa 3500 px ga kichraytiriladi (provayder baribir
      o'z chegarasini qo'llaydi, cheksiz katta yuborishning ma'nosi yo'q);
    * JPEG sifati 95.

    Rangli rejim o'zgartirilmaydi: `RGB` ga o'tkazish faqat kerak
    bo'lganda bajariladi, chunki `P`/`L` rejimidagi skanerlarni majburan
    aylantirish ham ma'lumot yo'qotishi mumkin.
    """
    img = Image.open(io.BytesIO(file_bytes))
    width, height = img.size

    # Kichik rasm — asl baytlarni o'zgarishsiz qaytaramiz: qayta
    # kodlash har doim biroz yo'qotish demakdir
    if width <= AI_IMAGE_MAX_WIDTH:
        _logger.info("AI rasmi: asl holicha %d x %d, %.2f MB",
                     width, height, len(file_bytes) / 1048576)
        return file_bytes

    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    new_height = int(height * AI_IMAGE_MAX_WIDTH / width)
    # LANCZOS — ingichka EKG chiziqlarini eng yaxshi saqlaydi
    img = img.resize((AI_IMAGE_MAX_WIDTH, new_height), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=AI_IMAGE_QUALITY, optimize=True)
    buf.seek(0)
    result = buf.read()

    _logger.info(
        "AI rasmi: %d x %d -> %d x %d, %.2f MB -> %.2f MB (sifat %d)",
        width, height, img.size[0], img.size[1],
        len(file_bytes) / 1048576, len(result) / 1048576, AI_IMAGE_QUALITY,
    )
    return result


def jpg_bytes_to_png_bytes(file_bytes: bytes) -> bytes:
    """Eski nom bilan moslik — ichida `prepare_display_image` ishlaydi."""
    return prepare_display_image(file_bytes)
    
from fastapi import Form
from database import SessionLocal as _SessionLocal
import ai_config


# ─── EKG: sinxron qayta ishlash + OpenAI (thread pool da) ────────────────────
def _sync_ecg_process_and_ai(
    ecg_id: int,
    content: bytes,
    fname: str,
    is_image: bool,
    age: int,
    gender: str,
    complaint: list | None,
    lang: str
) -> dict:
    """
    EKG faylini qayta ishlash va OpenAI ga yuborish — sinxron.
    asyncio.to_thread() orqali chaqiriladi.
    """
    from database import SessionLocal as _SL
    db = _SL()
    # AI xatolik bersa ham saqlash uchun: signal hisob-kitobi
    # natijasi shu yerda to'planadi (T-029)
    digitals = None

    try:
        # 1. PNG render
        if not is_image:
            leads: dict = {}
            fs = None
            try:
                # EKG faqat pdf yoki rasm qabul qiladi (file_validator bilan
                # majburlangan). `is_image` bo'lmagani uchun bu — PDF.
                if fname.endswith('.pdf'):
                    if convert_from_bytes is None:
                        raise RuntimeError("pdf2image not installed")
                    pages = convert_from_bytes(content, first_page=1, last_page=1)
                    img_bytes = io.BytesIO()
                    pages[0].save(img_bytes, format='PNG')
                    img_bytes.seek(0)
                    leads, fs = extract_image_bytes_as_signal(img_bytes.read())
                else:
                    raise RuntimeError("Qo'llab-quvvatlanmaydigan fayl turi (faqat pdf yoki rasm)")
            except Exception as e:
                raise RuntimeError(f"Fayl parse xatolik: {e}")

            mapping = map_leads(list(leads.keys()))
            mapped = {mapping.get(orig) or orig: arr for orig, arr in leads.items()}
            leads = mapped

            expected_samples = int(fs * 10)
            for ln in CANONICAL_LEADS:
                if ln not in leads:
                    leads[ln] = np.zeros(expected_samples, dtype=float)

            png_bytes = render_12_lead_png(leads, fs)
            digitals = compute_full_ecg_v3(leads, fs)
            prompt = compose_prompt_for_openai(digitals, age, gender, complaint, lang)
            # Signal fayldan chizilgan grafik — u allaqachon toza va
            # yo'qotishsiz, qayta tayyorlash kerak emas
            ai_image_bytes = png_bytes
        else:
            png_bytes = jpg_bytes_to_png_bytes(content)
            digitals = None
            prompt = compose_prompt_for_openai_for_img(age, gender, complaint, lang)
            # AI ga ko'rsatish uchun siqilgan nusxa emas, tafsiloti
            # saqlangan variant yuboriladi (A-2)
            ai_image_bytes = prepare_ai_image(content)

        png_short_bytes = compress_image_bytes(png_bytes)
        # Rasm yuklanganda natija JPEG (T-047), signal fayli bo'lsa PNG grafik
        fname1 = f"ecg_{ecg_id}." + ("jpg" if is_image else "png")
        generated_file_link = save_generated_file(png_bytes, fname1)
        generated_short_file_link = save_generated_short_file(png_short_bytes, fname1)

        # 2. DB: status=1 (PNG tayyor)
        update_ecg_analyse(
            session=db,
            status=1,
            ecg_id=ecg_id,
            generated_file_link=generated_file_link,
            generated_short_file_link=generated_short_file_link
        )

        # 3. OpenAI upload + call
        client = OpenAI(
            api_key=OPENAI_API_KEY,
            timeout=ai_config.AI_REQUEST_TIMEOUT,
            max_retries=ai_config.AI_MAX_RETRIES,
        )
        # `ai_image_bytes` — `png_bytes` emas: birinchisi tafsilot uchun,
        # ikkinchisi ekran va PDF uchun tayyorlangan (A-2)
        fobj = io.BytesIO(ai_image_bytes)
        fobj.name = fname1
        uploaded = client.files.create(file=fobj, purpose="vision")
        file_id = uploaded.id

        # EKG SURATI (foto/rasm) uchun kuchliroq vizual model + to'liq
        # (original) tafsilot; PDF (signaldan chizilgan grafik) uchun
        # standart tashxis modeli.
        # EKG doim gpt-5.6-sol da tahlil qilinadi: rasm uchun image-so'rov
        # (detail + kattaroq token byudjeti), PDF uchun esa oddiy so'rov,
        # lekin AYNI model (sol). Holter/SMAD/Lab dan farqli (ular terra).
        _req = ai_config.ecg_image_request() if is_image else ai_config.diagnosis_request(model=ai_config.ECG_IMAGE_MODEL)
        resp = client.responses.create(
            # Model va fikrlash chuqurligi bitta joyda (A-11)
            **_req,
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "file_id": file_id, "detail": ai_config.ECG_IMAGE_DETAIL}
                ]
            }],
            # Qat'iy JSON sxema: model maydonni tashlab keta olmaydi
            # va format buzilgan javob qaytarmaydi (T-031, T-033)
            text=ai_schema.response_format("ecg"),
        )
        # AI matnda "tahlil qilib bo'lmadi" desa ham jiddiylik darajasiga
        # 1 (= yashil "Normal") qo'yib yuborishi mumkin — T-092. Guard shu
        # holatda darajani olib tashlaydi.
        content_out = ai_result_guard.sanitize(resp.output_text, ecg_id, "ecg")

        # Bo'sh natija muhofazasi: reasoning modeli butun token byudjetini
        # FIKRLASHGA sarflab, matn chiqarmasligi mumkin (javob "incomplete").
        # `sanitize` bunda None qaytaradi va `update_ecg_analyse` uni "maydonga
        # tegma" deb qabul qiladi — natijada status=2 bo'lsa-da ai_answer_data
        # NULL qolib, UI xato ravishda "AI tahlil qilindi" deb ko'rsatardi.
        # Shuning uchun bo'sh natijani XATOLIK sifatida qayta ishlaymiz (retry
        # mumkin, signal o'lchovlari esa saqlanadi).
        if not content_out or not str(content_out).strip():
            incomplete = getattr(resp, "status", None) == "incomplete"
            raise RuntimeError(
                "AI bo'sh natija qaytardi"
                + (" — javob to'liq emas (token chegarasi)" if incomplete else "")
            )

        # 4. DB: status=2 (AI tayyor)
        update_ecg_analyse(session=db, ecg_id=ecg_id, status=2, ai_answer_data=content_out)
        _logger.info("EKG AI muvaffaqiyatli: ecg_id=%d", ecg_id)

        return {
            # `ecg_png_base64` nomi ALDAMCHI: qiymat base64 emas, fayl
            # yo'li. Nom tarixiy sabablarga ko'ra saqlanadi (frontend va
            # tashqi mijozlar undan foydalanadi), lekin yoniga to'g'ri
            # nomlangan maydonlar qo'shildi (T-084).
            "ecg_png_base64": generated_file_link,
            "ecg_png_base64_short": generated_short_file_link,
            "ecg_image_url": generated_file_link,
            "ecg_thumbnail_url": generated_short_file_link,
        }

    except Exception as exc:
        _logger.error("EKG AI fon xatolik ecg_id=%d [%s]: %s",
                      ecg_id, ai_errors.classify(exc), ai_errors.log_message(exc))
        try:
            # Xom istisno matni EMAS — turkumlangan, tarjima qilingan xabar.
            answer = json.loads(ai_errors.to_ai_answer(exc, lang))

            # Signal hisob-kitobi AI dan mustaqil bajariladi va u
            # muvaffaqiyatli tugagan bo'lishi mumkin. Natijani tashlab
            # yuborish shifokorni yagona ob'ektiv ma'lumotdan mahrum
            # qiladi: QRS, PR, QTc, ST — bularning hech biri AI emas,
            # matematik hisob (T-029).
            signal_measurements = _signal_to_schema(digitals)
            if signal_measurements:
                answer["digital_measurements"] = signal_measurements
                answer["signal_measurements_only"] = True

            update_ecg_analyse(
                session=db,
                ecg_id=ecg_id,
                status=STATUS_ERROR,
                ai_answer_data=json.dumps(answer, ensure_ascii=False, default=str),
            )
        except Exception:
            pass
        raise
    finally:
        db.close()


async def _ecg_ai_background(
    ecg_id: int,
    content: bytes,
    fname: str,
    is_image: bool,
    age: int,
    gender: str,
    complaint: list | None,
    lang: str
) -> None:
    """Browser yopilsa ham davom etadigan EKG tahlil."""
    # Rasm yuklanganda uning haqiqatan EKG ekanini asosiy tahlildan oldin tekshiramiz.
    # XML/CSV fayllar uchun bu kerak emas — ular strukturaviy parse qilinadi va
    # noto'g'ri format bo'lsa parser o'zi xatolik beradi.
    if is_image:
        mismatch = await _asyncio.to_thread(classify_document, content, fname, "ekg")
        if mismatch:
            db = _SessionLocal()
            try:
                update_ecg_analyse(
                    session=db,
                    ecg_id=ecg_id,
                    status=STATUS_FILE_MISMATCH,
                    ai_answer_data=mismatch.to_ai_answer(lang),
                )
                _logger.info(
                    "EKG: fayl turi mos emas (aniqlangan=%s), tahlil to'xtatildi: ecg_id=%d",
                    mismatch.detected, ecg_id,
                )
            except Exception as exc:
                _logger.error("EKG mos kelmaslik holatini saqlashda xatolik: %s", exc)
            finally:
                db.close()
            return

    try:
        await _asyncio.to_thread(
            _sync_ecg_process_and_ai,
            ecg_id, content, fname, is_image, age, gender, complaint, lang
        )
    except Exception:
        pass  # Xatolik allaqachon _sync_ecg_process_and_ai ichida loglangan


# ---------------- Tizim holati ----------------
@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    """AI xizmatining holati.

    .NET tomonidagi "Tizim holati" sahifasi shu javobga tayanadi. Ilgari
    hech qanday health endpointi yo'q edi: AI xizmati ishlayaptimi yoki
    yo'qmi, buni faqat tahlil yuborib ko'rib bilish mumkin edi.

    Autentifikatsiya talab qilinmaydi — javobda maxfiy ma'lumot yo'q
    (kalitning O'ZI emas, faqat "sozlanganmi" bayrog'i qaytariladi).
    """
    checks = {}

    # Baza
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = {"ok": True}
    except Exception as exc:
        _logger.error("Health: bazaga ulanib bo'lmadi: %s", exc)
        checks["database"] = {"ok": False, "error": "connection_failed"}

    # OpenAI kaliti — endi HAQIQIY holat. Ilgari bu yerda faqat kalit
    # bo'sh emasligi tekshirilardi va yaroqsiz kalit bilan ham `/health`
    # "sog'lom" deb javob berardi (T-028). Natija keshlanadi.
    checks["openai"] = provider_health.health()

    # Yuklamalar papkasi yozish uchun ochiqmi
    try:
        uploads = os.getenv("UPLOADS_ROOT") or "uploads"
        os.makedirs(uploads, exist_ok=True)
        probe = os.path.join(uploads, ".health_probe")
        with open(probe, "w", encoding="utf-8") as fh:
            fh.write("ok")
        os.remove(probe)
        checks["uploads_writable"] = {"ok": True}
    except Exception as exc:
        _logger.error("Health: uploads papkasiga yozib bo'lmadi: %s", exc)
        checks["uploads_writable"] = {"ok": False, "error": "not_writable"}

    healthy = all(c.get("ok") for c in checks.values())

    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status": "healthy" if healthy else "degraded",
            "service": "nmed-ai",
            "checks": checks,
        },
    )


# ---------------- FastAPI endpoint: analyze ----------------
@app.post("/api/analyze")
async def analyze(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    file: list[UploadFile] = File(...),
    complaint: list[str] | None = Form(None),
    complaint_id: list[int] | None = Form(None),
    doctor_id: list[int] | None = Form(None),
    created_doctor_id: int = Form(...),
    clinic_id: int = Form(...),
    patcient_id: int = Form(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...),
    analysis_date: str | None = Form(None),
    # Foydalanuvchi takror haqidagi ogohlantirishni ko'rib, ataylab davom
    # etishni tanlaganda frontend buni `true` qilib yuboradi (T-096)
    force_duplicate: bool = Form(False),
    # Asl fayl nomi. .NET proksisi uni alohida yuboradi, chunki
    # multipart dagi nom ASCII ga tozalanadi va kirill nomlar
    # butunlay yo'qolib ketardi (T-101).
    original_filename: str | None = Form(None)
):
    if OPENAI_API_KEY is None:
        raise HTTPException(status_code=400, detail="Provide OpenAI API key in environment variable 'OPENAI_API_KEY'")

    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = prepare_upload_filename(first_file.filename or "upload", content, default_stem="ecg_upload").lower()

    # Fayl turi, hajmi va (rasm bo'lsa) sifati tekshiriladi.
    # Yozuv yaratilishidan OLDIN — foydalanuvchi darhol aniq xabar oladi.
    try:
        validate_upload(fname, content, "ecg", lang)
    except FileValidationError as file_exc:
        raise HTTPException(status_code=400, detail=file_exc.message)

    # Bog'lanishlarni OLDINDAN tekshiramiz — aks holda FK xatoligi yozuv
    # yaratilgandan keyin yuz beradi va chala yozuv bazada qolib ketadi.
    try:
        reference_validator.validate_analysis_refs(
            db,
            patcient_id=patcient_id,
            clinic_id=clinic_id,
            created_doctor_id=created_doctor_id,
            doctor_ids=doctor_id,
            complaint_ids=complaint_id,
        )
    except reference_validator.ReferenceError as ref_exc:
        raise HTTPException(status_code=400, detail=str(ref_exc))

    # Aynan shu mazmunli fayl shu bemorga allaqachon yuklanganmi?
    # Tekshiruv fayl diskka yozilishidan va yozuv yaratilishidan
    # OLDIN — takror bo'lsa hech narsa qoldirmasdan to'xtaydi.
    file_digest = duplicate_guard.check(
        db, "ecg", patcient_id, content, force_duplicate
    )

    analyse_file_path = save_analyse_file(content, fname)

    ecg_analyse = create_ecg_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=analyse_file_path,
        analysis_date=datetime.datetime.fromisoformat(analysis_date.replace("Z", "+00:00")) if analysis_date else None
    )

    ecg_analyse.file_hash = file_digest
    # Diskdagi nom UUID (T-099); asl nom saqlanadi va faylni
    # yuklab olishda foydalanuvchiga o'sha nom taklif qilinadi (T-101)
    ecg_analyse.original_filename = (original_filename or first_file.filename or "")[:255] or None
    # AI qaysi tilda javob berishi shu yerda qayd etiladi: natija
    # boshqa tilli shifokorga ochilganda sababi tushunarli bo'lsin (T-059)
    ecg_analyse.ai_lang = (lang or 'uz')[:5]
    db.commit()

    if doctor_id:
        for d_id in doctor_id:
            await create_ecg_analyse_doctor(session=db, ecg_analyse_id=ecg_analyse.id, doctor_id=d_id)

    if complaint_id:
        for c_id in complaint_id:
            await create_ecg_analyse_complaint(session=db, ecg_analyse_id=ecg_analyse.id, complaint_id=c_id)

    is_image = fname.endswith(('.png', '.jpg', '.jpeg'))

    # ── Fon rejimida EKG qayta ishlash + AI (browser yopilsa ham davom etadi) ──
    task = _asyncio.create_task(
        _ecg_ai_background(
            ecg_id=ecg_analyse.id,
            content=content,
            fname=fname,
            is_image=is_image,
            age=age,
            gender=gender,
            complaint=complaint,
            lang=lang
        )
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    return JSONResponse(content={
        "ecg_id": ecg_analyse.id,
        "status": "processing",
        "analyse_file_path": analyse_file_path
    })

@app.post("/api/analyze-save")
async def analyze_save(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    file: list[UploadFile] = File(...),
    complaint: list[str] | None = Form(None),
    complaint_id: list[int] | None = Form(None),
    doctor_id: list[int] | None = Form(None),
    created_doctor_id: int = Form(...),
    clinic_id: int = Form(...),
    patcient_id: int = Form(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...),
    analysis_date: str | None = Form(None),
    # Foydalanuvchi takror haqidagi ogohlantirishni ko'rib, ataylab davom
    # etishni tanlaganda frontend buni `true` qilib yuboradi (T-096)
    force_duplicate: bool = Form(False),
    # Asl fayl nomi. .NET proksisi uni alohida yuboradi, chunki
    # multipart dagi nom ASCII ga tozalanadi va kirill nomlar
    # butunlay yo'qolib ketardi (T-101).
    original_filename: str | None = Form(None)
):
   
    if OPENAI_API_KEY is None:
        raise HTTPException(status_code=400, detail="Provide OpenAI API key in environment variable 'OPENAI_API_KEY'")
    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = prepare_upload_filename(first_file.filename or "upload", content, default_stem="ecg_upload").lower()
    # Aynan shu mazmunli fayl shu bemorga allaqachon yuklanganmi?
    # Tekshiruv fayl diskka yozilishidan va yozuv yaratilishidan
    # OLDIN — takror bo'lsa hech narsa qoldirmasdan to'xtaydi.
    file_digest = duplicate_guard.check(
        db, "ecg", patcient_id, content, force_duplicate
    )

    analyse_file_path = save_analyse_file(content, fname)
    ecg_analyse = create_ecg_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=analyse_file_path,
        analysis_date=datetime.datetime.fromisoformat(analysis_date.replace("Z", "+00:00")) if analysis_date else None
    )

    ecg_analyse.file_hash = file_digest
    # Diskdagi nom UUID (T-099); asl nom saqlanadi va faylni
    # yuklab olishda foydalanuvchiga o'sha nom taklif qilinadi (T-101)
    ecg_analyse.original_filename = (original_filename or first_file.filename or "")[:255] or None
    # AI qaysi tilda javob berishi shu yerda qayd etiladi: natija
    # boshqa tilli shifokorga ochilganda sababi tushunarli bo'lsin (T-059)
    ecg_analyse.ai_lang = (lang or 'uz')[:5]
    db.commit()
    if doctor_id:
        for d_id in doctor_id:
            await create_ecg_analyse_doctor(
                session=db,
                ecg_analyse_id=ecg_analyse.id,
                doctor_id=d_id
            )

    # --- ECGAnalyseComplaints yozish ---
    if complaint_id:
        for c_id in complaint_id:
            await create_ecg_analyse_complaint(
                session=db,
                ecg_analyse_id=ecg_analyse.id,
                complaint_id=c_id
            )

    is_image = fname.endswith(('.png','.jpg','.jpeg'))

    if not is_image:
        leads = {}
        fs = None
        # --- Parse file: EKG faqat pdf yoki rasm; is_image bo'lmasa — PDF ---
        try:
            if fname.endswith('.pdf'):
                if convert_from_bytes is None:
                    raise HTTPException(status_code=500, detail="pdf2image not installed or poppler missing")
                pages = convert_from_bytes(content, first_page=1, last_page=1)
                pil = pages[0]
                img_bytes = io.BytesIO()
                pil.save(img_bytes, format='PNG')
                img_bytes.seek(0)
                leads, fs = extract_image_bytes_as_signal(img_bytes.read())
            else:
                raise HTTPException(status_code=400, detail="Qo'llab-quvvatlanmaydigan fayl turi (faqat pdf yoki rasm)")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

        # --- Map fuzzy lead names to canonical leads ---
        mapped = {}
        mapping = map_leads(list(leads.keys()))
        for orig, arr in leads.items():
            name = mapping.get(orig) or orig
            mapped[name] = arr
        leads = mapped

        # --- Fill missing leads with zeros ---
        expected_seconds = 10
        expected_samples = int(fs * expected_seconds)
        for ln in CANONICAL_LEADS:
            if ln not in leads:
                leads[ln] = np.zeros(expected_samples, dtype=float)
        # --- Generate PNG from leads ---
        png_bytes = render_12_lead_png(leads, fs)
    else:
        png_bytes = jpg_bytes_to_png_bytes(content)
       
    png_short_bytes=compress_image_bytes(png_bytes)
    # Kengaytma mazmunga mos bo'lishi kerak: rasm yuklanganda
    # `jpg_bytes_to_png_bytes` aslida JPEG qaytaradi (T-047),
    # nom esa qotirilgan `.png` edi — natijada 7 ta fayl `.png`
    # nomi bilan JPEG saqlagan (A-8 tekshiruvida topildi).
    fname1 = f"ecg_{ecg_analyse.id}." + ("jpg" if is_image else "png")
    # generated_file_link = save_generated_file(png_bytes, fname1)
    generated_short_file_link = save_generated_short_file(png_short_bytes, fname1)
    ecg_analyse = update_ecg_analyse(
        session=db,
        status=1,
        ecg_id=ecg_analyse.id,
        generated_file_link=analyse_file_path,
        generated_short_file_link=generated_short_file_link
    )
    
    return JSONResponse(content={
        "ecg_id": ecg_analyse.id,
        # Nom aldamchi (base64 emas, yo'l) — to'g'ri nomlar yonida (T-084)
        "ecg_png_base64": analyse_file_path,
        "ecg_png_base64_short": generated_short_file_link,
        "ecg_image_url": analyse_file_path,
        "ecg_thumbnail_url": generated_short_file_link,
    })

@app.post("/api/analyze-retry")
async def analyze_retry(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    complaint: list[str] | None = Form(None),
    id: str = Form(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...)
):
    if OPENAI_API_KEY is None:
        raise HTTPException(status_code=400, detail="Provide OpenAI API key in environment variable 'OPENAI_API_KEY'")

    # ECGAnalyse yozuvini olish
    analyse_data = get_ecg_analyse_by_id(db, id)
    if not analyse_data:
        raise HTTPException(status_code=404, detail="ECG Analyse not found")

    # Faylni link orqali olish
    if analyse_data.analyse_file_link:
        file_path = BASE_DIR / analyse_data.analyse_file_link.lstrip("/")

        if file_path.exists():
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            fname = file_path.name.lower()
        else:
            raise HTTPException(status_code=404, detail="Analyse file topilmadi")
    else:
        raise HTTPException(status_code=404, detail="Analyse file link mavjud emas")

    # Fayl turi tekshirish
    is_image = fname.endswith(('.png', '.jpg', '.jpeg'))

    if not is_image:
        leads = {}
        fs = None
        # --- Parse file: EKG faqat pdf yoki rasm; is_image bo'lmasa — PDF ---
        try:
            if fname.endswith('.pdf'):
                if convert_from_bytes is None:
                    raise HTTPException(status_code=500, detail="pdf2image not installed or poppler missing")
                pages = convert_from_bytes(file_bytes, first_page=1, last_page=1)
                pil = pages[0]
                img_bytes = io.BytesIO()
                pil.save(img_bytes, format='PNG')
                img_bytes.seek(0)
                leads, fs = extract_image_bytes_as_signal(img_bytes.read())
            else:
                raise HTTPException(status_code=400, detail="Qo'llab-quvvatlanmaydigan fayl turi (faqat pdf yoki rasm)")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

        # --- Map fuzzy lead names to canonical leads ---
        mapped = {}
        mapping = map_leads(list(leads.keys()))
        for orig, arr in leads.items():
            name = mapping.get(orig) or orig
            mapped[name] = arr
        leads = mapped

        # --- Fill missing leads with zeros ---
        expected_seconds = 10
        expected_samples = int(fs * expected_seconds)
        for ln in CANONICAL_LEADS:
            if ln not in leads:
                leads[ln] = np.zeros(expected_samples, dtype=float)
        digitals = compute_full_ecg_v3(leads, fs)
        prompt = compose_prompt_for_openai(digitals, age, gender, complaint, lang)
        if analyse_data.generated_file_link==None:
            png_bytes = render_12_lead_png(leads, fs)
            png_short_bytes=compress_image_bytes(png_bytes)
            fname1 = f"ecg_{analyse_data.id}.png"
            generated_file_link = save_generated_file(png_bytes, fname1)
            generated_short_file_link = save_generated_short_file(png_short_bytes, fname1)
            ecg_analyse = update_ecg_analyse(
                session=db,
                status=1,
                ecg_id=analyse_data.id,
                generated_file_link=generated_file_link,
                generated_short_file_link=generated_short_file_link
            )
        else:
            generated_file_link = analyse_data.generated_file_link
            generated_short_file_link = analyse_data.generated_short_file_link

    else:
        if analyse_data.generated_file_link==None:
            png_bytes = jpg_bytes_to_png_bytes(file_bytes)
            png_short_bytes=compress_image_bytes(png_bytes)
        # Kengaytma mazmunga mos bo'lishi kerak: rasm yuklanganda
        # `jpg_bytes_to_png_bytes` aslida JPEG qaytaradi (T-047),
        # nom esa qotirilgan `.png` edi — natijada 7 ta fayl `.png`
        # nomi bilan JPEG saqlagan (A-8 tekshiruvida topildi).
            fname1 = f"ecg_{analyse_data.id}." + ("jpg" if is_image else "png")
            generated_file_link = save_generated_file(png_bytes, fname1)
            generated_short_file_link = save_generated_short_file(png_short_bytes, fname1)
            ecg_analyse = update_ecg_analyse(
                session=db,
                status=1,
                ecg_id=analyse_data.id,
                generated_file_link=generated_file_link,
                generated_short_file_link=generated_short_file_link
            )
        else:
            generated_file_link = analyse_data.generated_file_link
            generated_short_file_link = analyse_data.generated_short_file_link
        digitals=None
        prompt = compose_prompt_for_openai_for_img(age, gender, complaint, lang)
    if analyse_data.generated_file_link:
        file_path = BASE_DIR / analyse_data.generated_file_link.lstrip("/")

        if file_path.exists():
            with open(file_path, "rb") as f:
                png_bytes = f.read()
            fname1 = file_path.name.lower()
        else:
            raise HTTPException(status_code=404, detail="Generate file topilmadi")
    else:
        raise HTTPException(status_code=404, detail="Generate file link mavjud emas")
    try:
        file_id = openai_upload_file(
            OPENAI_API_KEY,
            png_bytes,
            filename=fname if fname.endswith('.png') else 'ecg.png'
        )
    except Exception as e:
        b64 = base64.b64encode(png_bytes).decode('ascii')
        return JSONResponse(content={
            "error": f"OpenAI upload failed: {e}",
            "png_base64": b64
        })

    ai_error = False
    try:
        client = OpenAI(
            api_key=OPENAI_API_KEY,
            timeout=ai_config.AI_REQUEST_TIMEOUT,
            max_retries=ai_config.AI_MAX_RETRIES,
        )
        # EKG SURATI (foto/rasm) uchun kuchliroq vizual model + to'liq
        # (original) tafsilot; PDF (signaldan chizilgan grafik) uchun
        # standart tashxis modeli.
        # EKG doim gpt-5.6-sol da tahlil qilinadi: rasm uchun image-so'rov
        # (detail + kattaroq token byudjeti), PDF uchun esa oddiy so'rov,
        # lekin AYNI model (sol). Holter/SMAD/Lab dan farqli (ular terra).
        _req = ai_config.ecg_image_request() if is_image else ai_config.diagnosis_request(model=ai_config.ECG_IMAGE_MODEL)
        resp = client.responses.create(
            # Model va fikrlash chuqurligi bitta joyda (A-11)
            **_req,
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "file_id": file_id, "detail": ai_config.ECG_IMAGE_DETAIL}
                ]
            }],
            # Qat'iy JSON sxema: model maydonni tashlab keta olmaydi
            # va format buzilgan javob qaytarmaydi (T-031, T-033)
            text=ai_schema.response_format("ecg"),
        )
        content_out = resp.output_text
        # Bo'sh natija muhofazasi (reasoning modeli matn chiqarmagan holat) —
        # status=2 qo'ymaymiz, aks holda "AI tahlil qilindi" deyilib ma'lumot
        # bo'sh qolardi. Xatolik sifatida qayta ishlanadi (retry mumkin).
        if not content_out or not content_out.strip():
            incomplete = getattr(resp, "status", None) == "incomplete"
            raise RuntimeError(
                "AI bo'sh natija qaytardi"
                + (" — javob to'liq emas (token chegarasi)" if incomplete else "")
            )
        try:
            parsed = json.loads(content_out)
        except Exception:
            parsed = {"raw": content_out}

        ai_answer_text = content_out
        status_to_save = 2

    except Exception as e:
        parsed = {"error": str(e)}
        ai_answer_text = None
        status_to_save = -1
        ai_error = True

    analyse_data = update_ecg_analyse(
        session=db,
        ecg_id=analyse_data.id,
        status=status_to_save,
        ai_answer_data=ai_answer_text
    )

    return JSONResponse(content={
        "ecg_id": analyse_data.id,
        # Nom aldamchi (base64 emas, yo'l) — to'g'ri nomlar yonida (T-084)
        "ecg_png_base64": generated_file_link,
        "ecg_png_base64_short": generated_short_file_link,
        "ecg_image_url": generated_file_link,
        "ecg_thumbnail_url": generated_short_file_link,
        "ai_response": parsed,
        "ai_error": ai_error
    })

@app.post("/api/med-diagnoses-save")
async def diagnose_save(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    file: list[UploadFile] = File(...),
    created_doctor_id: int = Form(...),
    clinic_id: int = Form(...),
    patcient_id: int = Form(...),
    main_doctor_id: int = Form(...),
):
   
    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = prepare_upload_filename(first_file.filename or "upload", content, default_stem="diagnose_upload").lower()
    analyse_file_path = save_diagnose_file(content, fname)
    ecg_analyse = create_medical_diagnose(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        main_doctor_id=main_doctor_id,
        diagnose_file_link=analyse_file_path
    )

    return JSONResponse(content={
        "status":True
    })



# ---------------- Ground truth endpoint ----------------
class GroundTruth(BaseModel):
    filename: str
    true_diagnosis: str

@app.post("/submit_ground_truth")
async def submit_ground_truth(gt: GroundTruth):
    os.makedirs('ground_truth', exist_ok=True)
    safe_name = re.sub(r'[^0-9A-Za-z._-]','_', gt.filename)
    with open(os.path.join('ground_truth', f'{safe_name}.json'), 'w', encoding='utf-8') as f:
        import json
        json.dump(gt.dict(), f, ensure_ascii=False, indent=2)
    return {"status": "saved"}


@app.post("/api/analyze-replace-file")
async def analyze_replace_file(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    id: int = Form(...),
    file: UploadFile = File(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...),
    complaint: list[str] | None = Form(None),
):
    """Mavjud EKG tahlilining faylini almashtirib, qayta tahlil qilish.

    Foydalanuvchi noto'g'ri yoki sifatsiz fayl yuklaganda yangi tahlil
    yaratmasdan, o'sha yozuvning faylini almashtirish imkonini beradi.
    Bemor, shifokorlar va shikoyatlar bog'lanishi saqlanib qoladi.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    ecg_analyse = get_ecg_analyse_by_id(db, id)
    if not ecg_analyse:
        raise HTTPException(status_code=404, detail="EKG tahlili topilmadi")

    content = await file.read()
    fname = prepare_upload_filename(
        file.filename or "upload", content, default_stem="ecg_upload"
    ).lower()

    # Fayl turi, hajmi va (rasm bo'lsa) sifati tekshiriladi.
    # Yozuv yaratilishidan OLDIN — foydalanuvchi darhol aniq xabar oladi.
    try:
        validate_upload(fname, content, "ecg", lang)
    except FileValidationError as file_exc:
        raise HTTPException(status_code=400, detail=file_exc.message)

    if not content:
        raise HTTPException(status_code=400, detail="Yuklangan fayl bo'sh")

    analyse_file_path = save_analyse_file(content, fname)

    # Yozuvni qayta tahlilga tayyorlash: eski AI natijasi va grafiklar tozalanadi
    update_ecg_analyse(
        session=db,
        ecg_id=id,
        status=0,
        analyse_file_link=analyse_file_path,
        clear_ai_answer=True,
    )

    is_image = fname.endswith(('.png', '.jpg', '.jpeg'))

    task = _asyncio.create_task(
        _ecg_ai_background(
            ecg_id=id,
            content=content,
            fname=fname,
            is_image=is_image,
            age=age,
            gender=gender,
            complaint=complaint,
            lang=lang,
        )
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    _logger.info("EKG: fayl almashtirildi va qayta tahlilga yuborildi: ecg_id=%d", id)

    return JSONResponse(content={
        "ecg_id": id,
        "status": "processing",
        "analyse_file_path": analyse_file_path,
    })


@app.on_event("startup")
async def _verify_ai_provider() -> None:
    """Kalitni ishga tushishda tekshiradi (T-028).

    Ilgari yaroqsiz kalit bilan xizmat muammosiz ko'tarilardi va nosozlik
    faqat birinchi bemor tahlili muvaffaqiyatsiz tugaganda ma'lum bo'lardi.
    Tekshiruv fon vazifasida bajariladi — provayder sekin javob bersa ham
    xizmatning ko'tarilishi kechikmasin.
    """
    import asyncio
    asyncio.get_running_loop().run_in_executor(None, provider_health.startup_check)


@app.get("/api/file-types")
async def file_types():
    """Har bir tahlil turi uchun ruxsat etilgan fayl kengaytmalari (T-041).

    Ilgari bu ro'yxat ikki joyda alohida yozilgan edi va ular bir-biriga
    mos kelmasdi:

      | Tur    | Frontend ko'rsatardi   | Server aslida qabul qilardi        |
      |--------|------------------------|------------------------------------|
      | EKG    | xml, jpg, png          | xml, csv, tsv, png, jpg, jpeg      |
      | Holter | pdf                    | pdf, png, jpg, jpeg                |
      | SMAD   | pdf                    | pdf, png, jpg, jpeg                |

    Ya'ni tizim Holter hisobotining suratini qabul qila olardi, lekin
    interfeys uni taklif qilmasdi — foydalanuvchi buni bilmasdi. Teskari
    xavf ham bor edi: interfeys serverdan kengroq ro'yxat ko'rsatsa,
    foydalanuvchi faylni tanlab, yuklab, faqat serverdan xatolik olardi.

    Endi manba bitta: `ALLOWED_BY_ANALYSIS_TYPE`.
    """
    return JSONResponse(content={
        kind: sorted(extensions)
        for kind, extensions in ALLOWED_BY_ANALYSIS_TYPE.items()
    })


#: Tahlil turi -> (jadval nomi, tarjima keshi ustuni)
_TRANSLATABLE_TABLES = {
    "ecg": "ecg_analyses",
    "holter": "holter_analyses",
    "smad": "smad_analyses",
    "lab": "lab_analyses",
}


@app.post("/api/translate-analysis")
async def translate_analysis(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    kind: str = Form(...),
    analysis_id: int = Form(...),
    target_lang: str = Form(...),
):
    """AI xulosasini boshqa tilga o'giradi va keshlaydi (T-059).

    Tahlil yaratilayotganda AI tili tanlanadi va javob o'sha tilda
    saqlanadi. Boshqa tilli shifokor uni ochsa matn tushunarsiz qoladi.

    Natija `ai_translations` ustunida keshlanadi: matn o'zgarmaydi,
    shuning uchun ikkinchi so'rovda AI umuman chaqirilmaydi.
    """
    table = _TRANSLATABLE_TABLES.get(kind)
    if table is None:
        raise HTTPException(status_code=400, detail="noto'g'ri tahlil turi")

    if target_lang not in ai_translate.SUPPORTED:
        raise HTTPException(status_code=400, detail="qo'llab-quvvatlanmaydigan til")

    row = db.execute(
        text(f"SELECT ai_answer_data, ai_translations, ai_lang "
             f"FROM {table} WHERE id = :id"),
        {"id": analysis_id},
    ).first()

    if row is None:
        raise HTTPException(status_code=404, detail="tahlil topilmadi")

    answer, translations, source_lang = row

    if not answer:
        raise HTTPException(status_code=400, detail="tahlil natijasi yo'q")

    # Asl til so'ralgan bilan bir xil bo'lsa tarjima kerak emas
    if source_lang and source_lang[:2] == target_lang:
        return JSONResponse(content={"result": json.loads(answer), "cached": True})

    existing = ai_translate.cached(translations, target_lang)
    if existing is not None:
        return JSONResponse(content={"result": existing, "cached": True})

    try:
        # Bu faylda `asyncio` `_asyncio` nomi bilan import qilingan
        translated = await _asyncio.to_thread(
            ai_translate.translate, answer, target_lang)
    except Exception as exc:  # noqa: BLE001
        _logger.error("Tarjima xatolik (%s#%d -> %s): %s",
                      kind, analysis_id, target_lang, ai_errors.log_message(exc))
        raise HTTPException(status_code=502, detail="tarjima bajarilmadi")

    if translated is None:
        raise HTTPException(status_code=502, detail="tarjima bajarilmadi")

    db.execute(
        text(f"UPDATE {table} SET ai_translations = :v WHERE id = :id"),
        {"v": ai_translate.merge_cache(translations, target_lang, translated),
         "id": analysis_id},
    )
    db.commit()

    _logger.info("Tarjima tayyor: %s#%d -> %s", kind, analysis_id, target_lang)
    return JSONResponse(content={"result": translated, "cached": False})
