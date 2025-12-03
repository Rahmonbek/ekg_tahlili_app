# ============================ ecg_api_full.py (1-qism) ============================
import io
import os
import re
import math
from openai import OpenAI
import base64
import cv2
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
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import butter, filtfilt, find_peaks, medfilt
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from typing import Dict
import math
import neurokit2 as nk
import openai
import warnings
import json
Image.MAX_IMAGE_PIXELS = None
# Optional for PDF -> image
try:
    from pdf2image import convert_from_bytes
except Exception:
    convert_from_bytes = None

# For fuzzy lead mapping
from fuzzywuzzy import process

# ---------------- FastAPI app init ----------------
app = FastAPI(title="AI EKG Analyzer")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- OpenAI API key ----------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
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
        
        # Maksimal 3000 sample (oxirgi qism)
        if len(arr) > 4500:
            arr = arr[-4500:-2000]
        else: 
            if len(arr) > 3500:
                arr = arr[-3500:-1000]
        
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

# ---------------- Lead signal helper ----------------
def get_lead_signal(leads: dict, lead: str):
    if lead in leads:
        return leads[lead]
    if lead.upper() in leads:
        return leads[lead.upper()]
    if lead.lower() in leads:
        return leads[lead.lower()]
    # fuzzy contains
    for key in leads.keys():
        if lead.lower() in key.lower():
            return leads[key]
    return np.zeros(1)

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
def compose_prompt_for_openai(digitals) -> str:

    if isinstance(digitals, dict):
        digitals_str = json.dumps(digitals, ensure_ascii=False, indent=2)
    else:
        digitals_str = str(digitals)
    prompt_header = f"""
    EKG aparatdan olingan ekg parametrlari qiymatlari:
    {digitals_str}"""

    prompt_header += """
    
    Siz tajribali kardiolog shifokorsiz. Quyidagi rasmdagi EKG grafiklarini va ekg grafikdan olingan yuqorida berilgan ekg parametrlari qiymatlarini tahlil qiling va natijani faqat quyidagi JSON formatida RETURN qiling. Hech qanday izoh, sharh yoki qo‘shimcha matn yozmang — faqat toza JSON. Barcha matnlar o‘zbek tilida bo‘lsin. Agar rasm yetarli sifatda bo‘lmasa yoki qaysidir o‘lchovni aniq hisoblash mumkin bo‘lmasa, tegishli maydonda ""o'lchab bo‘lmaydi"" deb qaytaring.
    
    JSON shabloni:
    {
        "digital_measurements": {
            "HR": "Yurak urish tezligi (bpm) va qisqa izoh",
            "PR_interval": "PR interval (ms) va qisqa izoh",
            "QRS_duration": "QRS davomiyligi (ms) va qisqa izoh",
            "QT_interval": "QT interval (ms) va qisqa izoh",
            "QTc_Bazett": "QTc (Bazett) (ms) va qisqa izoh",
            "QRS_axis": "QRS o‘qi (gradus bilan) va qisqa izoh",
            "P_wave_duration": "P to‘lqin davomiyligi (ms) va qisqa izoh",
            "P_wave_amplitude": "P to‘lqin amplitudasi (mV) va qisqa izoh",
            "R_wave_amplitude": "R to‘lqin amplitudasi (mV) va qisqa izoh",
            "S_wave_amplitude": "S to‘lqin amplitudasi (mV) va qisqa izoh",
            "T_wave_amplitude": "T to‘lqin amplitudasi (mV) va qisqa izoh",
            "PR_segment": "PR segment (ms) va qisqa izoh",
            "ST_segment_elevation": "ST segment ko‘tarilishi/tushishi (mV) va qisqa izoh",
            "RR_interval": "RR interval (ms) va qisqa izoh",
            "heart_rate_variability": "HRV (ms) va qisqa izoh",
            "P_QRS_T_morphology": "P, QRS va T to‘lqin shakli haqida qisqa tavsif"
        },

    "automatic_analysis": "EKG signalida quyidagi belgilar bor yoki yo'qligini aniqlang:
    Ishemik yurak kasalliklari
 • ST elevatsiyasi (STEMI — to‘liq o‘tkazuvchi tromb)
 • ST depressiyasi (NSTEMI, stenokardiya)
 • T tishchasi inversiyasi
 • Q patologik tishcha (o‘tkazilgan MI belgisi)
 • Reciprocal o‘zgarishlar
 • Wellens sindromi (kuchli LAD stenoz)
 • De Winter changes (LAD akut o‘tkazuvchi lekin ST ko‘tarilmagan)
 • Prinzmetal stenokardiyasi (spazm)

Aritmiyalar
 • Sinus taxikardiya / bradikardiya
 • AV tugunidan chiqadigan ritemlar
 • Atrial fibrillyatsiya
 • Atrial flutter
 • Supraventrikulyar taxikardiya (AVNRT, AVRT)
 • Ventrikulyar taxikardiya
 • Ventrikulyar fibrillyatsiya
 • Premature beats (PAC, PVC)
 • Torsades de pointes

O‘tkazuvchanlik buzilishlari
 • SA blok
 • AV bloklar (I, II — Mobitz I/II, III)
 • His shoxi bloklari (LBBB, RBBB)
 • Fascicular bloklar (LAHB/LPHB)
 • Wolff-Parkinson-White (WPW)
 • O‘tkir transmural MI da yangi LBBB xavf belgisidir

Bo‘lmacha va qorincha kengayishi / gipertrofiyasi
 • Chap bo‘lmacha kengayishi (P mitrale)
 • O‘ng bo‘lmacha kengayishi (P pulmonale)
 • Chap qorincha gipertrofiyasi (LVH) + strain
 • O‘ng qorincha gipertrofiyasi (RVH)

Klapan kasalliklari oqibatlari
 • Mitral stenoz → P-mitrale, AF, RVH
 • Mitral yetishmovchiligi → LVH, P-mitrale
 • Aorta stenoz → LVH + repolyarizatsiya buzilishi
 • Aorta yetishmovchiligi → LVH
 • Trikuspid patologiyalar → P-pulmonale, RVH

(Asl sababni EKG bevosita ko‘rmaymiz, oqibatini ko‘ramiz)

Perikard kasalliklari
 • Perikardit → diffuz ST elevatsiyasi + PR depressiyasi
 • Perikard tamponadasi → past voltaj, elektr alternans

Miyokardit / Kardiomiopatiyalar
 • Dilatatsion KMP → QRS keng, sintetik o‘zgarishlar, AF/V
 • Gipertrofik KMP → LVH, Q chuqur, aritmiyalar
 • ARVD (o‘ng qorincha displazi) → epsilon to‘lqin V1-V3

Elektrolit buzilishlari

🟡 Kaliy
 • Giperkalemiya:
 • T baland va uchi o‘tkir (tented T)
 • PR uzaygan
 • QRS kengaygan → sine-wave → asistoliya xavfi
 • Gipokalemiya:
 • U tishchasi paydo bo‘ladi
 • T yassi / inversiya
 • ST depressiyasi
 • Torsades xavfi ↑ (QT uzayishi)

⚪️ Kalsiy
 • Giperkalsemiya:
 • QT qisqaradi
 • Gipokalsemiya:
 • QT uzayadi → Torsades xavfi ↑

Bular dori toksikligi bilan aralashib ketishi mumkin (masalan, digoksin)

Dori toksikligi
 • Digoksin: Scooping ST depressiyasi
 • Antiaritmiklarga xos:
 • Amiodaron → QT uzayishi
 • Lidokain → QRS kengayishi
 • TCA toksikligi → QRS keng + arritmiyalar
 
O‘tkir o‘pka patologiyasi
 • O‘tkir o‘pka emboliyasi:
 • S1Q3T3 belgisi
 • Sinus taxikardiya
 • RVH va o‘ngga og‘ish
 • RBBB

Qorincha ritmi qurilmalarida
 • Pacemaker ritmi
 • ICD shocks izlari

Metabolik va boshqa holatlar
 • Gipotermiya → Osborn (J) to‘lqin
 • Gipotiroidizm → past voltaj
 • Sepsis → sinus taxikardiya
 • Anemiya → taxikardiya
 • Vagus tonusi yuqori → sinus bradi",
    "automatic_analysis_bool": "xulosaning jiddiylik darajasi (1 = yengil, 2 = o‘rtacha, 3 = og‘ir)",
    "AI_recommendations": "Oddiy tilda bemor uchun tavsiya: tekshiruv zarurati, dam olish, jismoniy yuklamani kamaytirish, yoki shifokor ko‘rigiga murojaat qilish va agarda kasallik aniqlansa shu kasallik davolash usuli haqida.",
    "final_summary": "Tibbiy asosli yakuniy tashxis va qisqa tahlil natijasi, asosiy klinik xulosa bilan."
    }
Qo‘shimcha talablar:
- "digital_measurements" da mavjud ammo EKG aparatdan olingan ekg parametrlarida qiymati mavjud bo'lmagan parametrlarni ekg grafik rasmidan o'lchab chiqaring
- Har bir parametr uchun birliklar (bpm, ms, gradus) aniq yozilsin.
- Raqamli qiymatlar va ularning tibbiy bahosi (normal/patologik) alohida yozilsin.
- Elektrolit, perikard, ishemiya yoki aritmiya belgilaridan biri aniqlansa, u alohida tibbiy izoh bilan tushuntirilsin (sababi, EKG belgisi, klinik ahamiyati).
- Model javobi faqat JSON bo‘lsin, hech qanday matn tashqarida bo‘lmasin.
    """
    return prompt_header
# ============================ ecg_api_full.py (2-qism) ============================

# ---------------- ECG Process Wrapper ----------------
def ecg_process_wrapper(signal: np.ndarray, sampling_rate: float = 500.0):
    
    out = {
        'ecg_clean': None,
        'rpeaks': np.array([], dtype=int),
        'peaks': {},
        'delineate': {},
        'hr': np.array([])
    }

    if signal is None or len(signal) < 3:
        return out

    sr = sampling_rate if sampling_rate is not None else 500.0

    # 1) Clean signal
    try:
        ecg_clean = nk.ecg_clean(signal, sampling_rate=sr)
    except Exception:
        try:
            from scipy.signal import butter, filtfilt
            b, a = butter(2, [0.5/(sr/2), 40/(sr/2)], btype='band')
            ecg_clean = filtfilt(b, a, signal)
        except Exception:
            ecg_clean = signal.copy()
    out['ecg_clean'] = ecg_clean

    # 2) Detect R-peaks
    try:
        peaks, info = nk.ecg_peaks(ecg_clean, sampling_rate=sr)
        out['peaks'] = peaks
        rpeaks = peaks.get('ECG_R_Peaks', np.array([], dtype=int))
        rpeaks = np.array(rpeaks, dtype=int) if rpeaks is not None else np.array([], dtype=int)
        out['rpeaks'] = rpeaks
    except Exception:
        out['rpeaks'] = np.array([], dtype=int)
        out['peaks'] = {}

    # 3) Compute HR series
    try:
        r = out['rpeaks']
        if len(r) >= 2:
            rr_sec = np.diff(r) / sr
            rr_sec = rr_sec[rr_sec>0]
            if rr_sec.size>0:
                out['hr'] = 60.0 / rr_sec
            else:
                out['hr'] = np.array([])
        else:
            out['hr'] = np.array([])
    except Exception:
        out['hr'] = np.array([])

    # 4) Delineation (QRS, P, T)
    try:
        if len(out['rpeaks']) > 0:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", RuntimeWarning)
                delineate = nk.ecg_delineate(ecg_clean, out['rpeaks'], sampling_rate=sr, method='dwt')
            if isinstance(delineate, dict):
                out['delineate'] = delineate
            else:
                out['delineate'] = {}
    except Exception:
        out['delineate'] = {}

    return out


# ---------------- Draw ECG Grid ----------------
def draw_ecg_grid(width_px:int, height_px:int, pixels_per_mm:float=3.0):
    img = Image.new('RGB', (width_px, height_px), color=(255,255,255))
    draw = ImageDraw.Draw(img)
    # 1 mm grid
    for x in range(0, width_px, int(pixels_per_mm)):
        draw.line([(x,0),(x,height_px)], fill=(235,235,235))
    for y in range(0, height_px, int(pixels_per_mm)):
        draw.line([(0,y),(width_px,y)], fill=(235,235,235))
    # 5 mm grid (qalinroq)
    for x in range(0, width_px, int(5*pixels_per_mm)):
        draw.line([(x,0),(x,height_px)], fill=(200,200,200))
    for y in range(0, height_px, int(5*pixels_per_mm)):
        draw.line([(0,y),(width_px,y)], fill=(200,200,200))
    return img

def compress_final_png(png_bytes: bytes, scale: float = 0.3) -> bytes:
    
    # Bytes -> Image
    img = Image.open(io.BytesIO(png_bytes))

    # Yangi o‘lcham
    new_w = int(img.width * scale)
    new_h = int(img.height * scale)

    # Sifatli downscale
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)

    # Output buffer
    buf = io.BytesIO()

    # PNG sifatini buzmasdan saqlash
    img_resized.save(buf, format="PNG", optimize=True)

    return buf.getvalue()


def render_12_lead_png(leads: dict, fs: float = 500.0) -> bytes:
    plt.rcParams['path.simplify'] = False
    plt.rcParams['agg.path.chunksize'] = 10000

    LEFT_LEADS = ['I','II','III','aVR','aVL','aVF']
    RIGHT_LEADS = ['V1','V2','V3','V4','V5','V6']

    n_rows = 6
    n_cols = 2

    fig, axes = plt.subplots(
        n_rows, n_cols,
        figsize=(22, n_rows * 2.0),
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

    fig.tight_layout()
    fig.subplots_adjust(hspace=0.2, wspace=0.02)
    fig.canvas.draw()

    for ax in axes.flatten():
        ax.grid(False)

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

def qrs_onset_offset(signal, peak_idx, fs):
    # Use slope threshold around peak to find onset/offset
    # compute absolute derivative in short window
    win = int(round(0.12 * fs))  # look +/- 120 ms
    lo = max(0, peak_idx - win)
    hi = min(len(signal)-1, peak_idx + win)
    seg = signal[lo:hi+1]
    deriv = np.abs(np.diff(seg, prepend=seg[0]))
    # threshold = small fraction of max derivative in the segment
    if deriv.size == 0:
        return peak_idx, peak_idx
    thr = 0.10 * np.max(deriv)  # 10% of max slope
    # onset: search left from peak to first index where deriv < thr for consecutive samples
    peak_rel = peak_idx - lo
    onset_rel = peak_rel
    for i in range(peak_rel, 0, -1):
        if deriv[i] < thr:
            onset_rel = i
            # require a small run of low derivative to avoid noise
            if i-3 >=0 and np.all(deriv[max(0,i-3):i] < thr):
                onset_rel = i-3
                break
    # offset: search right
    offset_rel = peak_rel
    for i in range(peak_rel, len(deriv)-1):
        if deriv[i] < thr:
            offset_rel = i
            if i+3 < len(deriv) and np.all(deriv[i+1:min(len(deriv),i+4)] < thr):
                offset_rel = i+3
                break
    onset = lo + max(0, onset_rel)
    offset = lo + min(len(seg)-1, offset_rel)
    return onset, offset

def find_t_peak_and_end(signal, r_idx, fs):
    # T window: 120 ms to 400 ms after R (typical)
    start = r_idx + int(round(0.12*fs))
    end = r_idx + int(round(0.40*fs))
    end = min(end, len(signal)-1)
    if start >= end:
        return None, None
    segment = signal[start:end+1]
    # find peaks (both positive and negative) in absolute sense, but prefer same sign as segment mean
    if len(segment)==0:
        return None, None
    # pick peaks of the segment
    peaks_pos, _ = find_peaks(segment, distance=int(0.05*fs))
    peaks_neg, _ = find_peaks(-segment, distance=int(0.05*fs))
    candidates = []
    for p in peaks_pos:
        candidates.append((p, segment[p]))
    for p in peaks_neg:
        candidates.append((p, segment[p]))
    if not candidates:
        return None, None
    # choose the largest amplitude (abs) candidate as T-peak
    t_rel, t_val = max(candidates, key=lambda x: abs(x[1]))
    t_idx = start + int(t_rel)

    # Find T-end: search forward from t_idx until signal returns near baseline (PR baseline),
    # or slope becomes very small for a run of samples
    # baseline estimate: mean of pre-R PR segment: r_idx - 200ms .. r_idx - 80ms
    pr_start = max(0, r_idx - int(round(0.20*fs)))
    pr_end = max(0, r_idx - int(round(0.06*fs)))
    baseline = np.mean(signal[pr_start:pr_end+1]) if pr_end>pr_start else 0.0

    search_start = t_idx
    search_end = min(len(signal)-1, r_idx + int(round(0.55*fs)))  # search up to 550 ms after R
    tend = None
    # tolerance to baseline
    tol = 0.05 * max(1e-6, np.std(signal))  # 5% of signal std
    # require return to within (baseline +/- tol) and slope small
    for i in range(search_start, search_end):
        window = signal[i:min(i+int(round(0.02*fs))+1, len(signal))]
        slope = np.abs(np.diff(window)).mean() if len(window)>1 else 0.0
        if abs(signal[i] - baseline) <= tol and slope < 0.01*np.std(signal):
            tend = i
            break
    # fallback: if not found, take last zero-crossing of derivative after t_idx
    if tend is None:
        deriv_after = np.diff(signal[t_idx:search_end+1], prepend=signal[t_idx])
        zero_cross = np.where(np.sign(deriv_after[:-1]) != np.sign(deriv_after[1:]))[0]
        if len(zero_cross)>0:
            tend = t_idx + zero_cross[-1]
    # as ultimate fallback set tend = t_idx + 200 ms if within bounds
    if tend is None:
        fallback = t_idx + int(round(0.20*fs))
        tend = fallback if fallback < len(signal) else len(signal)-1

    return t_idx, tend
def detect_pr_interval(signal, r_peaks, fs):
    pr_list = []

    for r in r_peaks:
        # P-to‘lqin qidiriladigan oyna: R - 200ms → R - 80ms
        p_start = max(0, r - int(round(0.20 * fs)))
        p_end   = max(0, r - int(round(0.08 * fs)))
        if p_end <= p_start:
            continue

        segment = signal[p_start:p_end]

        if len(segment) < 5:
            continue

        # P-to‘lqin tepasi (peak) qidirish
        p_pos, _ = find_peaks(segment, distance=int(0.04*fs))
        p_neg, _ = find_peaks(-segment, distance=int(0.04*fs))

        candidates = []
        for p in p_pos:
            candidates.append((p, segment[p]))
        for p in p_neg:
            candidates.append((p, segment[p]))

        if not candidates:
            continue

        # eng katta amplitudali P-to‘lqin
        p_rel, p_val = max(candidates, key=lambda x: abs(x[1]))
        p_peak = p_start + p_rel

        # P-onset → peakdan chapga asta-pasta pasayish nuqtasi
        # derivative threshold
        deriv = np.abs(np.diff(signal[p_start:p_peak+1], prepend=signal[p_start]))
        if len(deriv) == 0:
            continue

        thr = 0.08 * np.max(deriv)  # 8% slope threshold
        p_onset_rel = None

        for i in range(p_peak - p_start, 0, -1):
            if deriv[i] < thr:
                p_onset_rel = i
                # ketma-ket bir nechta sample past bo‘lishi shart
                if i-2 >= 0 and np.all(deriv[i-2:i+1] < thr):
                    p_onset_rel = i-2
                    break

        if p_onset_rel is None:
            continue

        p_onset = p_start + p_onset_rel

        # PR interval (ms)
        pr_ms = (r - p_onset) / float(fs) * 1000.0
        pr_list.append(pr_ms)

    if len(pr_list) == 0:
        return None

    return float(np.mean(pr_list))

def compute_full_ecg_v2(leads, fs=500):
    """
    Improved ECG feature extraction.
    - leads: dict mapping lead name -> 1D numpy array (same length)
    - fs: sampling frequency in Hz
    Returns: dict (not JSON string) with measured values (units: ms for intervals, mV for voltages where original units assumed)
    """
    import numpy as np

    # Basic checks
    if 'II' not in leads:
        raise ValueError("Lead II required for robust R detection (leads must contain 'II').")

    lead_ii = np.asarray(leads['II'])
    if lead_ii.size == 0:
        raise ValueError("Empty lead signal.")

    # R-peaks
    r_peaks = detect_r_peaks(lead_ii, fs)
    # compute RR in seconds, careful arithmetic
    rr_intervals = np.diff(r_peaks) / float(fs)  # seconds

    if rr_intervals.size > 0:
        mean_rr = float(np.mean(rr_intervals))  # seconds
        heart_rate_bpm = 60.0 / mean_rr
        rr_interval_ms = mean_rr * 1000.0
    else:
        mean_rr = None
        heart_rate_bpm = None
        rr_interval_ms = None

    # QRS durations (ms)
    qrs_durations = []
    qrs_onsets = []
    qrs_offsets = []
    for r in r_peaks:
        onset, offset = qrs_onset_offset(lead_ii, r, fs)
        qrs_onsets.append(onset)
        qrs_offsets.append(offset)
        qms = (offset - onset) / float(fs) * 1000.0
        qrs_durations.append(qms)
    qrs_duration_ms = float(np.mean(qrs_durations)) if qrs_durations else None

    # QT intervals (ms) and QTc Bazett
    qt_intervals = []
    for r in r_peaks:
        t_peak, t_end = find_t_peak_and_end(lead_ii, r, fs)
        if t_peak is not None and t_end is not None and t_end > r:
            qt_ms = (t_end - r) / float(fs) * 1000.0
            qt_intervals.append(qt_ms)
    qt_interval_ms = float(np.mean(qt_intervals)) if qt_intervals else None
    # QTc Bazett: use seconds internally
    if qt_interval_ms is not None and mean_rr is not None and mean_rr > 0:
        qt_s = qt_interval_ms / 1000.0
        qtc_s = qt_s / math.sqrt(mean_rr)
        qt_c_bazett_ms = qtc_s * 1000.0
    else:
        qt_c_bazett_ms = None

    # QRS axis: use net area (integral) of QRS window in leads I and aVF
    def net_qrs_area_for_lead(signal, onsets, offsets):
        areas = []
        for o, p in zip(onsets, offsets):
            if p > o:
                areas.append(np.trapz(signal[o:p+1]))
        return float(np.mean(areas)) if areas else 0.0

    i_area = net_qrs_area_for_lead(np.asarray(leads.get('I', np.zeros_like(lead_ii))), qrs_onsets, qrs_offsets)
    avf_area = net_qrs_area_for_lead(np.asarray(leads.get('aVF', np.zeros_like(lead_ii))), qrs_onsets, qrs_offsets)
    # axis in degrees (standard quadrant mapping)
    # atan2(y, x) where y=+aVF, x=+I
    axis_rad = math.atan2(avf_area, i_area) if (i_area != 0.0 or avf_area != 0.0) else 0.0
    axis_deg = math.degrees(axis_rad)

    # ST segment: measure relative to PR baseline
    st_values = {}
    j_offset = int(round(0.04 * fs))  # J-point ~ 40 ms after R
    st_shift = int(round(0.06 * fs))  # measure ST 60 ms after J
    for lead_name, signal in leads.items():
        sig = np.asarray(signal)
        st_points = []
        baselines = []
        for r in r_peaks:
            # baseline (PR segment): r - 200.. r - 60 ms
            pr_s = max(0, r - int(round(0.20*fs)))
            pr_e = max(0, r - int(round(0.06*fs)))
            baseline = np.mean(sig[pr_s:pr_e+1]) if pr_e>pr_s else 0.0
            baselines.append(baseline)
            st_idx = r + j_offset + st_shift
            if st_idx < len(sig):
                st_points.append(sig[st_idx] - baseline)  # deviation relative to baseline
        st_values[lead_name] = float(np.mean(st_points)) if st_points else None

    # Q waves: minimal deflection before R within 40 ms
    q_waves = {}
    for lead_name, signal in leads.items():
        sig = np.asarray(signal)
        qlist = []
        for r in r_peaks:
            start = max(0, r - int(round(0.04*fs)))
            region = sig[start:r] if r>start else np.array([])
            if region.size > 0:
                q_min = float(np.min(region))
                # accept as Q if negative and sufficiently below local baseline
                pr_s = max(0, r - int(round(0.20*fs)))
                pr_e = max(0, r - int(round(0.06*fs)))
                baseline = np.mean(sig[pr_s:pr_e+1]) if pr_e>pr_s else 0.0
                if q_min < baseline - 0.02 * max(1.0, np.std(sig)):  # threshold adapt
                    qlist.append(q_min)
                else:
                    qlist.append(None)
            else:
                qlist.append(None)
        q_waves[lead_name] = qlist

    # R progression for V1..V6: mean R amplitude around peak (+/- 20 ms)
    r_progression = {}
    for v in ["V1","V2","V3","V4","V5","V6"]:
        sig = np.asarray(leads.get(v, np.zeros_like(lead_ii)))
        r_amps = []
        for r in r_peaks:
            lo = max(0, r - int(round(0.02*fs)))
            hi = min(len(sig)-1, r + int(round(0.02*fs)))
            if hi>lo:
                # pick peak amplitude (signed) in window
                idx_rel = np.argmax(np.abs(sig[lo:hi+1]))
                r_amps.append(float(sig[lo + idx_rel]))
        r_progression[v] = float(np.mean(r_amps)) if r_amps else None
    pr_interval_ms = detect_pr_interval(lead_ii, r_peaks, fs)
    result = {
        "heart_rate_bpm": round(heart_rate_bpm, 1) if heart_rate_bpm is not None else None,
        "pr_interval_ms": round(pr_interval_ms,1) if pr_interval_ms is not None else None,
        "rr_interval_ms": round(rr_interval_ms, 1) if rr_interval_ms is not None else None,
        "qrs_duration_ms": round(qrs_duration_ms, 1) if qrs_duration_ms is not None else None,
        "qt_interval_ms": round(qt_interval_ms, 1) if qt_interval_ms is not None else None,
        "qt_c_bazett_ms": round(qt_c_bazett_ms, 1) if qt_c_bazett_ms is not None else None,
        "qrs_axis_degree": round(axis_deg, 1),
        "st_segment_mV": st_values,
        
        "q_waves_mV": q_waves,
        "r_progression_mV": r_progression,
        "r_peak_count": int(len(r_peaks)),
        "r_peaks_indices": r_peaks.tolist()
    }

    return result

from fastapi import Form

# ---------------- FastAPI endpoint: analyze ----------------
@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    paper_speed: float = Form(25.0),
    gain: float = Form(10.0),
):
    if OPENAI_API_KEY is None:
        raise HTTPException(status_code=400, detail="Provide OpenAI API key in environment variable 'OPENAI_API_KEY'")
    
    content = await file.read()
    fname = (file.filename or "upload").lower()

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
        png_bytes = content
    digitals = compute_full_ecg_v2(leads, fs)
    print(digitals)
    # --- Upload PNG to OpenAI ---
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
    prompt = compose_prompt_for_openai(digitals)

    # --- Call OpenAI ChatCompletion ---
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.responses.create(
            model="gpt-4.1",
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "file_id": file_id}
                ]
            }]
        )
        content_out = resp.output_text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI chat completion failed: {e}")

    # --- Parse JSON ---
    try:
        import json
        parsed = json.loads(content_out)
    except Exception:
        parsed = {"raw": content_out}

    # --- Encode PNG to base64 for frontend ---
    png_b64 = base64.b64encode(png_bytes).decode('ascii')

    return JSONResponse(content={
        "openai_file_id": file_id,
        "ai_response": parsed,
        "ecg_png_base64": png_b64
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
