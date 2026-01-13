# ============================ ecg_api_full.py (1-qism) ============================
import io
import os
import re
import math
from sqlalchemy.orm import Session
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
import pandas as pd
from scipy.signal import find_peaks
from PIL import Image, ImageDraw, ImageFont, UnidentifiedImageError
from scipy.signal import butter, filtfilt, find_peaks, medfilt
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from typing import Dict
import math
from database import get_db
from ecg_analyse import create_ecg_analyse
from medical_diagnoses import create_medical_diagnose
from ecg_analyse import get_ecg_analyse_by_id
from ecg_analyse import update_ecg_analyse
from fastapi.staticfiles import StaticFiles
from ecg_analyse_doctors import create_ecg_analyse_doctor
from ecg_analyse_complaints import create_ecg_analyse_complaint
import neurokit2 as nk
import openai
import warnings
import json
from pathlib import Path
Image.MAX_IMAGE_PIXELS = None
# Optional for PDF -> image
try:
    from pdf2image import convert_from_bytes
except Exception:
    convert_from_bytes = None

# For fuzzy lead mapping
from fuzzywuzzy import process


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
    
    # Fayl mavjud bo‘lsa, index qo‘shib unik nom yaratish
    name, ext = os.path.splitext(safe_name)
    counter = 1
    while True:
        new_name = f"{name}_{counter}{ext}"
        new_filepath = directory / new_name
        if not new_filepath.exists():
            return new_name
        counter += 1
        
def save_diagnose_file(file_bytes: bytes, filename: str) -> str:
    safe_name = get_unique_filename(UPLOAD_DIR1, filename)
    filepath = UPLOAD_DIR_DIAGNOSE / safe_name
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/medical_diagnoses/{safe_name}"

def save_analyse_file(file_bytes: bytes, filename: str) -> str:
    safe_name = get_unique_filename(UPLOAD_DIR1, filename)
    filepath = UPLOAD_DIR1 / safe_name
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/ecg_analyse_files/{safe_name}"

def save_generated_file(file_bytes: bytes, filename: str) -> str:
    safe_name = get_unique_filename(UPLOAD_DIR2, filename)
    filepath = UPLOAD_DIR2 / safe_name
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/ecg_generated_files/{safe_name}"

def save_generated_short_file(file_bytes: bytes, filename: str) -> str:
    safe_name = get_unique_filename(UPLOAD_DIR3, filename)
    filepath = UPLOAD_DIR3 / safe_name
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/ecg_generated_short_files/{safe_name}"

# ---------------- FastAPI app init ----------------
app = FastAPI(title="AI EKG Analyzer")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- OpenAI API key ----------------
OPENAI_API_KEY = "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"
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY muhit o'zgaruvchisi topilmadi.")

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

# ---------------- Parsers ----------------
def parse_table_bytes(b: bytes) -> Tuple[Dict[str, np.ndarray], Optional[float]]:
    text = b.decode('utf-8', errors='ignore')
    df = None
    # try separators
    for sep in [',',';','\t',' ']:
        try:
            df_try = pd.read_csv(io.StringIO(text), sep=sep)
            if df_try.shape[1] > 1:
                df = df_try
                break
        except Exception:
            continue
    if df is None or df.shape[1] < 1:
        raise ValueError("Could not parse table data")
    # find time column
    time_col = None
    for c in df.columns:
        if re.search(r'time|sec|s$', str(c), re.IGNORECASE):
            time_col = c
            break
    leads = {}
    mapping = map_leads(df.columns)
    for col in df.columns:
        if col == time_col:
            continue
        name = mapping.get(col) or col
        try:
            arr = pd.to_numeric(df[col], errors='coerce').dropna().to_numpy(dtype=float)
            if arr.size > 0:
                leads[name] = arr
        except Exception:
            continue
    fs = None
    if time_col is not None:
        t = pd.to_numeric(df[time_col], errors='coerce').dropna().to_numpy(dtype=float)
        if t.size > 2:
            fs = 1.0 / np.mean(np.diff(t))
    return leads, fs
LEAD_NAME_MAP = {
    'MDC_ECG_LEAD_I': 'I',
    'MDC_ECG_LEAD_II': 'II',
    'MDC_ECG_LEAD_III': 'III',
    'MDC_ECG_LEAD_AVR': 'aVR',
    'MDC_ECG_LEAD_AVL': 'aVL',
    'MDC_ECG_LEAD_AVF': 'aVF',
    'MDC_ECG_LEAD_V1': 'V1',
    'MDC_ECG_LEAD_V2': 'V2',
    'MDC_ECG_LEAD_V3': 'V3',
    'MDC_ECG_LEAD_V4': 'V4',
    'MDC_ECG_LEAD_V5': 'V5',
    'MDC_ECG_LEAD_V6': 'V6'
}
def parse_xml_bytes(b: bytes) -> Tuple[Dict[str, np.ndarray], float]:
    ns = {'hl7': 'urn:hl7-org:v3', 'xsi': 'http://www.w3.org/2001/XMLSchema-instance'}
    root = ET.fromstring(b)
    
    leads_dict = {}
    fs = 500.0  # default sampling rate

    sr_elem = root.find(".//hl7:sampleRate", ns)
    if sr_elem is not None and sr_elem.text:
        try:
            fs = float(sr_elem.text.strip())
        except:
            pass
    
    for sequence_comp in root.findall(".//hl7:sequence", ns):
        code_elem = sequence_comp.find("hl7:code", ns)
        value_elem = sequence_comp.find("hl7:value", ns)
        if code_elem is None or value_elem is None:
            continue
        
        raw_lead_name = code_elem.get("code")
        if not raw_lead_name:
            continue
        
        lead_name = LEAD_NAME_MAP.get(raw_lead_name, raw_lead_name)  # Standart nomga o'tkazish
        
        digits_elem = value_elem.find("hl7:digits", ns)
        if digits_elem is None or not digits_elem.text:
            continue
        
        digits_str = digits_elem.text.strip()
        arr = np.array([float(x) for x in re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', digits_str)])
        
        origin_elem = value_elem.find("hl7:origin", ns)
        scale_elem = value_elem.find("hl7:scale", ns)
        origin = float(origin_elem.get("value")) if origin_elem is not None else 0.0
        scale = float(scale_elem.get("value")) if scale_elem is not None else 1.0
        arr = origin + arr * scale
        
        unit_elem = value_elem.find("hl7:unit", ns)
        if unit_elem is not None and unit_elem.get("code"):
            unit = unit_elem.get("code")
            if unit.lower() in ["uv", "μv", "microvolt"]:
                arr = arr / 1000.0  # uV → mV
            # endi arr mV da
        
        # Old va oxiridagi 0 larni qirqish
        nonzero_idx = np.where(arr != 0)[0]
        if len(nonzero_idx) > 0:
            arr = arr[nonzero_idx[0]:nonzero_idx[-1]+1]
        print(len(arr))
        # Maksimal 3000 sample (oxirgi qism)
        if len(arr) > 7500:
            arr = arr[-7500:-4500]
        else: 
            if len(arr) > 5500:
                arr = arr[-5500:-2500]
            else: 
                if len(arr) >3001:
                    arr = arr[-3001:-1]
        
        leads_dict[lead_name] = arr

    return leads_dict, fs

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
        resp = client.files.create(file=fobj, purpose="vision")  # purpose="answers" PNG uchun to‘g‘ri
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
        print(digitals_str)

    
        
    
    
    
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
Grafikdagi vizual (paralogik) o‘zgarishlarni ham inobatga oling. 
Tahlilda bemorning ma'lumotlari va shikoyatlarini ham inobatga oling.

Vazifa:
- Kardiolog va aritmolog shifokorlar ishlatadigan PROFESSIONAL tibbiy terminlar bilan yozing
- Tashxisni aniq, qisqa va klinik asoslangan qilib yozing
- Agar xavfli holat aniqlansa, alohida qayd eting
- Tashxisdan so‘ng qisqa "Xulosa" bo‘limini yozing

❗️JAVOB QOIDALARI:
- Javob FAQAT quyida berilgan JSON formatida bo‘lsin
- JSON dan tashqarida hech qanday izoh, sharh yoki qo‘shimcha matn YOZILMASIN
- Javobni {language} tilida taqdim et
- Agar EKG rasmi sifati yetarli bo‘lmasa yoki aniq o‘lchash imkoni bo‘lmasa, mos maydonda:
  "o‘lchab bo‘lmaydi"
  deb yozilsin

---

### JSON SHABLONI (QAT’IY SAQLANSIN):

{"""{
  "digital_measurements": {
    "HR": "Yurak urish tezligi (bpm), raqamli qiymat + tibbiy baho (normal/patologik)",
    "PR_interval": "PR interval (ms), raqamli qiymat + izoh",
    "QRS_duration": "QRS davomiyligi (ms), raqamli qiymat + izoh",
    "QT_interval": "QT interval (ms), raqamli qiymat + izoh",
    "QTc_Bazett": "QTc (Bazett) (ms), raqamli qiymat + izoh",
    "QRS_axis": "QRS o‘qi (gradus), raqamli qiymat + izoh",
    "P_wave_duration": "P to‘lqin davomiyligi (ms), raqamli qiymat + izoh",
    "P_wave_amplitude": "P to‘lqin amplitudasi (mV), raqamli qiymat + izoh",
    "R_wave_amplitude": "R to‘lqin amplitudasi (mV), raqamli qiymat + izoh",
    "S_wave_amplitude": "S to‘lqin amplitudasi (mV), raqamli qiymat + izoh",
    "T_wave_amplitude": "T to‘lqin amplitudasi (mV), raqamli qiymat + izoh",
    "PR_segment": "PR segment (ms), raqamli qiymat + izoh",
    "ST_segment_elevation": "ST segment ko‘tarilishi/tushishi (mV), raqamli qiymat + izoh",
    "RR_interval": "RR interval (ms), raqamli qiymat + izoh",
    "heart_rate_variability": "HRV (ms), raqamli qiymat + izoh",
    "P_QRS_T_morphology": "P, QRS va T to‘lqin shakllari haqida qisqa tavsif"
  },

  "automatic_analysis": "EKG, bemor ma'lumotlari, bemor shikoyatlari va raqamli parametrlar asosida ANIQLANGAN kasalliklarni yoki patologik holatlarni yoz.",

  "automatic_analysis_bool": "Holat jiddiyligi darajasi: 1 = yengil, 2 = o‘rtacha, 3 = og‘ir",

  "AI_recommendations": "Oddiy tilda bemor uchun tavsiya:
— qo‘shimcha tekshiruv zarurati
— jismoniy faollik bo‘yicha tavsiya
— shifokorga murojaat qilish zarurati
Agar kasallik aniqlansa, umumiy davolash yo‘nalishini qisqacha yoz.",

  "final_summary": "Tibbiy asoslangan yakuniy xulosa:
asosiy EKG topilmalar va umumiy klinik baho."
}"""}

---

### QO‘SHIMCHA TALABLAR:
- bemorga tashxis qo'yishda bemor ma'lumotlarini, EKG parametrlarini va EKG rasmdagi grafikni birinchi o'ringa qo'y, undan kn bemor shikoyatlarini ham inobatga ol
- "automatic_analysis" bo‘limida faqat BOR patologiyalar yozilsin va yo'qlari haqida ma'lumot shart emas
- "automatic_analysis_bool" bo'limida faqat 1 yoki 2 yoki 3 sonlari bo'lsin ortiqcha narsa kerak emas 
- "digital_measurements" bo'limida aniqlash imkoni yo'q parametrlarga null qiymat ber 
- Agar patologiya yo‘q bo‘lsa, nima sababdan yo‘qligi aniq tushuntirilsin
- EKG apparatida yo‘q bo‘lgan parametrlar grafikdan o‘lchab chiqilsin
- Har bir raqam yonida birliklar (bpm, ms, mV, gradus) bo‘lsin
- Raqam + tibbiy baho (normal/patologik) birga yozilsin
- Elektrolit, ishemiya, perikardit yoki aritmiya aniqlansa:
  — sababi
  — EKG belgisi
  — klinik ahamiyati qisqacha tushuntirilsin

❗️Javob FAQAT JSON bo‘lsin va {language} tilida bo'lsin
    """
    return prompt_header


def compose_prompt_for_openai_for_img(age, gender, complaint, lang) -> str:
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
    
    prompt_header += f"""
    Siz tajribali kardiolog va aritmolog shifokorsiz. Yuborilgan EKG rasmni tahlil qiling. Javob quyidagi JSON shaklida taqdim eting ortiqcha belgilarni yozmang.
    Hech qaysi parametr qiymatini taxmin qilma. Faqat aniq aniqlash imkoni bor parametrlardan foydalan. Tahlilda grafikdagi vizual (paralogik) o‘zgarishlarni ham inobatga oling.
    {
 """{ "digital_measurements": {
    "HR": "Yurak urish tezligi (bpm), raqamli qiymat + tibbiy baho (normal/patologik)",
    "PR_interval": "PR interval (ms), raqamli qiymat + izoh",
    "QRS_duration": "QRS davomiyligi (ms), raqamli qiymat + izoh",
    "QT_interval": "QT interval (ms), raqamli qiymat + izoh",
    "QTc_Bazett": "QTc (Bazett) (ms), raqamli qiymat + izoh",
    "QRS_axis": "QRS o‘qi (gradus), raqamli qiymat + izoh",
    "P_wave_duration": "P to‘lqin davomiyligi (ms), raqamli qiymat + izoh",
    "P_wave_amplitude": "P to‘lqin amplitudasi (mV), raqamli qiymat + izoh",
    "R_wave_amplitude": "R to‘lqin amplitudasi (mV), raqamli qiymat + izoh",
    "S_wave_amplitude": "S to‘lqin amplitudasi (mV), raqamli qiymat + izoh",
    "T_wave_amplitude": "T to‘lqin amplitudasi (mV), raqamli qiymat + izoh",
    "PR_segment": "PR segment (ms), raqamli qiymat + izoh",
    "ST_segment_elevation": "ST segment ko‘tarilishi yoki tushishi (mV), raqamli qiymat + izoh",
    "RR_interval": "RR interval (ms), raqamli qiymat + izoh",
    "heart_rate_variability": "HRV (ms), raqamli qiymat + izoh",
    "P_QRS_T_morphology": "P, QRS va T to‘lqin shakllarining qisqa professional tavsifi"
  },

  "automatic_analysis": "EKG, bemor ma’lumotlari va bemor shikoyatlari asosida ANIQLANGAN patologik holatlar yoki kasalliklar.",
  
  "automatic_analysis_bool": "Holat jiddiyligi: 1 = yengil, 2 = o‘rtacha, 3 = og‘ir",

  "AI_recommendations": "Oddiy tilda bemor uchun tavsiyalar:
— qo‘shimcha tekshiruv zarurati
- "digital_measurements" bo'limida aniqlash imkoni yo'q parametrlarga null qiymat ber 
- rasmda ekg aparat aniqlagan qiymatlar mavjud bo'lsa shulardan foydalan yo'qlarini o'zing aniqlashga urinib ko'r
— jismoniy faollik bo‘yicha ko‘rsatma
— shifokorga murojaat qilish zarurati
Agar kasallik aniqlansa, umumiy davolash yo‘nalishi qisqacha yozilsin.",
"final_summary": "Tibbiy asoslangan yakuniy xulosa:
asosiy EKG topilmalar va umumiy klinik baho."
}"""}


❗️Javob FAQAT JSON bo‘lsin va {language} tilida bo‘lsin.
    """
    return prompt_header



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

        # --- BORDERNI YO‘QOTISH ---
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
    # --- Gridni o‘rnatish ---
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
    plt.savefig(buf, format='png', dpi=650)
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
        print(f"Xatolik: {e}")
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
    print(st_results)
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
            except Exception as e:
                print(f"Lead {lead} tahlilida xatolik: {e}")
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
        print(rr_intervals)
        if rr_intervals.size > 0:
            mean_rr = float(np.mean(rr_intervals))  # seconds
            print(mean_rr)
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
        
    print(qt_intervals_ms)
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
        "heart_rate_bpm": round(heart_rate_bpm, 1),
        "pr_interval_ms": round(pr_interval_ms,1) if pr_interval_ms is not None else None,
        "qt_interval_ms": round(qt_interval_ms, 1),
        "qt_c_bazett_ms": round(qtc_final, 1),
        "rr_interval_ms": round(rr_interval_ms, 1),
        "qrs_duration_ms": round(qrs_interval_ms, 1),
        "qrs_axis_degree": round(qrs_axis_degree, 1),
        "st_segment_mv": round(st_segment, 4),
        # Yangi diagnostik parametrlar
        "p_wave_duration_ms": round(float(np.mean(p_durations_ms)), 1) if p_durations_ms else 0,
        "t_wave_amplitude_mv": round(float(np.max(t_amplitudes_mv)), 3) if t_amplitudes_mv else 0,
        "sokolow_lyon_index_mv": round(sokolow_index, 2),
        "rv5_sv1_sum_mv": round(sokolow_index, 2), 
        "r_wave_v1_unit": round(r_v1, 1),
        "r_wave_v2_unit": round(r_v2, 1),
        "r_wave_v3_unit": round(r_v3, 1),
        "r_wave_v4_unit": round(r_v4, 1),
        "average_T_wave_value": t_inversion
    }


from PIL import Image
import io

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

def jpg_bytes_to_png_bytes(file_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(file_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return buf.read()
    
from fastapi import Form

# ---------------- FastAPI endpoint: analyze ----------------
@app.post("/api/analyze")
async def analyze(
    db: Session = Depends(get_db),
    file: list[UploadFile] = File(...),
    complaint: list[str] | None = Form(None),
    complaint_id: list[int] | None = Form(None),
    doctor_id: list[int] | None = Form(None),
    created_doctor_id: int = Form(...),
    patcient_id: int = Form(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...)
):
   
    if OPENAI_API_KEY is None:
        raise HTTPException(status_code=400, detail="Provide OpenAI API key in environment variable 'OPENAI_API_KEY'")
    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = (first_file.filename or "upload").lower()
    analyse_file_path = save_analyse_file(content, fname)
    ecg_analyse = create_ecg_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        status=0,
        analyse_file_link=analyse_file_path
    )
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
        # --- Parse file according to extension ---
        try:
            if fname.endswith(('.csv','.txt','.tsv')):
                leads, fs = parse_table_bytes(content)
            elif fname.endswith('.xml'):
                leads, fs = parse_xml_bytes(content)
            elif fname.endswith('.pdf'):
                if convert_from_bytes is None:
                    raise HTTPException(status_code=500, detail="pdf2image not installed or poppler missing")
                pages = convert_from_bytes(content, first_page=1, last_page=1)
                pil = pages[0]
                img_bytes = io.BytesIO()
                pil.save(img_bytes, format='PNG')
                img_bytes.seek(0)
                leads, fs = extract_image_bytes_as_signal(img_bytes.read())
            else:
                try:
                    leads, fs = parse_table_bytes(content)
                except Exception:
                    leads, fs = parse_xml_bytes(content)
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
        print(leads)
        # --- Generate PNG from leads ---
        png_bytes = render_12_lead_png(leads, fs)
        digitals = compute_full_ecg_v3(leads, fs)
        print(digitals)
        prompt = compose_prompt_for_openai(digitals, age, gender, complaint, lang)
    else:
        png_bytes = jpg_bytes_to_png_bytes(content)
        digitals=None
        prompt = compose_prompt_for_openai_for_img(age, gender, complaint, lang)
    png_short_bytes=compress_image_bytes(png_bytes)
    fname1 = f"ecg_{ecg_analyse.id}.png"
    generated_file_link = save_generated_file(png_bytes, fname1)
    generated_short_file_link = save_generated_short_file(png_short_bytes, fname1)
    ecg_analyse = update_ecg_analyse(
        session=db,
        status=1,
        ecg_id=ecg_analyse.id,
        generated_file_link=generated_file_link,
        generated_short_file_link=generated_short_file_link
    )
    
    
    try:
        file_id = openai_upload_file(
            OPENAI_API_KEY,
            png_bytes,
            filename=fname1 if fname1.endswith('.png') else 'ecg.png'
        )
    except Exception as e:
        b64 = base64.b64encode(png_bytes).decode('ascii')
        return JSONResponse(content={
            "error": f"OpenAI upload failed: {e}",
            "png_base64": b64
        })
   
    # --- Compose prompt ---
    print(file_id)
    
    
    ai_error = False
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.responses.create(
            model="gpt-5.2",
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "file_id": file_id}
                ]
            }]
        )
        content_out = resp.output_text
        try:
            parsed = json.loads(content_out)
        except Exception:
            parsed = {"raw": content_out}
    
        # --- Matnni bevosita bazaga saqlash ---
        ai_answer_text = content_out
        status_to_save = 2
    
    except Exception as e:
        parsed = {"error": str(e)}
        ai_answer_text = None
        status_to_save = -1
        ai_error = True
    
    # --- ECGAnalyse yangilash AI natija bilan ---
    ecg_analyse = update_ecg_analyse(
        session=db,
        ecg_id=ecg_analyse.id,
        status=status_to_save,
        ai_answer_data=ai_answer_text  # Fayl yo‘li o‘rniga matnni uzatamiz
    )

    

    return JSONResponse(content={
        "ecg_id": ecg_analyse.id,
        "ecg_png_base64": generated_file_link,
        "ecg_png_base64_short": generated_short_file_link,
        "ai_response": parsed,
        "ai_error": ai_error
    })

@app.post("/api/analyze-save")
async def analyze_save(
    db: Session = Depends(get_db),
    file: list[UploadFile] = File(...),
    complaint: list[str] | None = Form(None),
    complaint_id: list[int] | None = Form(None),
    doctor_id: list[int] | None = Form(None),
    created_doctor_id: int = Form(...),
    patcient_id: int = Form(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...)
):
   
    if OPENAI_API_KEY is None:
        raise HTTPException(status_code=400, detail="Provide OpenAI API key in environment variable 'OPENAI_API_KEY'")
    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = (first_file.filename or "upload").lower()
    analyse_file_path = save_analyse_file(content, fname)
    ecg_analyse = create_ecg_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        status=0,
        analyse_file_link=analyse_file_path
    )
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
        # --- Parse file according to extension ---
        try:
            if fname.endswith(('.csv','.txt','.tsv')):
                leads, fs = parse_table_bytes(content)
            elif fname.endswith('.xml'):
                leads, fs = parse_xml_bytes(content)
            elif fname.endswith('.pdf'):
                if convert_from_bytes is None:
                    raise HTTPException(status_code=500, detail="pdf2image not installed or poppler missing")
                pages = convert_from_bytes(content, first_page=1, last_page=1)
                pil = pages[0]
                img_bytes = io.BytesIO()
                pil.save(img_bytes, format='PNG')
                img_bytes.seek(0)
                leads, fs = extract_image_bytes_as_signal(img_bytes.read())
            else:
                try:
                    leads, fs = parse_table_bytes(content)
                except Exception:
                    leads, fs = parse_xml_bytes(content)
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
        print(leads)
        # --- Generate PNG from leads ---
        png_bytes = render_12_lead_png(leads, fs)
    else:
        png_bytes = jpg_bytes_to_png_bytes(content)
       
    png_short_bytes=compress_image_bytes(png_bytes)
    fname1 = f"ecg_{ecg_analyse.id}.png"
    generated_file_link = save_generated_file(png_bytes, fname1)
    generated_short_file_link = save_generated_short_file(png_short_bytes, fname1)
    ecg_analyse = update_ecg_analyse(
        session=db,
        status=1,
        ecg_id=ecg_analyse.id,
        generated_file_link=generated_file_link,
        generated_short_file_link=generated_short_file_link
    )
    
    return JSONResponse(content={
        "ecg_id": ecg_analyse.id,
        "ecg_png_base64": generated_file_link,
        "ecg_png_base64_short": generated_short_file_link
    })

@app.post("/api/analyze-retry")
async def analyze_retry(
    db: Session = Depends(get_db),
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
        # --- Parse file according to extension ---
        try:
            if fname.endswith(('.csv','.txt','.tsv')):
                leads, fs = parse_table_bytes(file_bytes)
            elif fname.endswith('.xml'):
                leads, fs = parse_xml_bytes(file_bytes)
            elif fname.endswith('.pdf'):
                if convert_from_bytes is None:
                    raise HTTPException(status_code=500, detail="pdf2image not installed or poppler missing")
                pages = convert_from_bytes(file_bytes, first_page=1, last_page=1)
                pil = pages[0]
                img_bytes = io.BytesIO()
                pil.save(img_bytes, format='PNG')
                img_bytes.seek(0)
                leads, fs = extract_image_bytes_as_signal(img_bytes.read())
            else:
                try:
                    leads, fs = parse_table_bytes(file_bytes)
                except Exception:
                    leads, fs = parse_xml_bytes(file_bytes)
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
        print(leads)
        digitals = compute_full_ecg_v3(leads, fs)
        print(digitals)
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
   
    # --- Compose prompt ---
    print(file_id)
    
    
    ai_error = False
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.responses.create(
            model="gpt-5.2",
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "file_id": file_id}
                ]
            }]
        )
        content_out = resp.output_text
        try:
            parsed = json.loads(content_out)
        except Exception:
            parsed = {"raw": content_out}
    
        # --- Matnni bevosita bazaga saqlash ---
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
        "ecg_png_base64": generated_file_link,
        "ecg_png_base64_short": generated_short_file_link,
        "ai_response": parsed,
        "ai_error": ai_error
    })

@app.post("/api/med-diagnoses-save")
async def analyze_save(
    db: Session = Depends(get_db),
    file: list[UploadFile] = File(...),
    created_doctor_id: int = Form(...),
    patcient_id: int = Form(...),
    main_doctor_id: int = Form(...),
):
   
    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = (first_file.filename or "upload").lower()
    analyse_file_path = save_diagnose_file(content, fname)
    ecg_analyse = create_medical_diagnose(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        main_doctor_id=main_doctor_id,
        diagnose_file_link=analyse_file_path
    )

    return JSONResponse(content={
        "data":ecg_analyse
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
