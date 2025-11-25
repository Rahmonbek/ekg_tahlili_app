# ============================ ecg_api_full.py (1-qism) ============================
import io
import os
import re
import math
from openai import OpenAI
import base64
from matplotlib.ticker import MultipleLocator
from typing import Dict, Optional, Tuple
import xml.etree.ElementTree as ET
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
import neurokit2 as nk
import openai
import warnings
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
        arr = np.array([float(x) for x in digits_str.split()])
        
        origin_elem = value_elem.find("hl7:origin", ns)
        scale_elem = value_elem.find("hl7:scale", ns)
        origin = float(origin_elem.get("value")) if origin_elem is not None else 0.0
        scale = float(scale_elem.get("value")) if scale_elem is not None else 1.0
        arr = origin + arr * scale
        
        # Old va oxiridagi 0 larni qirqish
        nonzero_idx = np.where(arr != 0)[0]
        if len(nonzero_idx) > 0:
            arr = arr[nonzero_idx[0]:nonzero_idx[-1]+1]
        
        # Maksimal 3000 sample (oxirgi qism)
        if len(arr) > 3000:
            arr = arr[-3000:]
        
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
def compose_prompt_for_openai() -> str:
    prompt_header = """
    Siz tajribali kardiolog shifokorsiz. Quyidagi rasmdagi EKG grafiklarini tahlil qiling va natijani faqat quyidagi JSON formatida RETURN qiling. Hech qanday izoh, sharh yoki qo‘shimcha matn yozmang — faqat toza JSON. Barcha matnlar o‘zbek tilida bo‘lsin. Agar rasm yetarli sifatda bo‘lmasa yoki o‘lchovlarni aniq hisoblash mumkin bo‘lmasa, tegishli maydonda ""o'lchab bo‘lmaydi"" yoki ""taxminiy qiymat"" deb qaytaring.
    
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

    "automatic_analysis": "EKG signali asosida yurak ritmi turi (ektopik ritmlardan, Nod (AV tugun) ritmlaridan, qorincha (ventrikulyar) ritmlaridan, taxiaritmiya ritmlaridan, Ektopik urishlaridan, bradyaritmiyalaridan biri), o‘tkazuvchanlik, interval va o‘qlar tahlili, ishemik belgilar, aritmiyalar hamda digital_measurements dagi parametrlarning normal yoki patologik holati haqida to‘liq tibbiy izoh. Agar aniqlansa, quyidagi klinik holatlar haqida ham batafsil ma’lumot bering:\n, Giperkalemiya (Kaliy ortiq) – T to‘lqinlar baland va o‘tkir shaklda, Gipokalemiya (Kaliy kam) – T to‘lqin tekis, U to‘lqin paydo bo‘ladi, Gipokaltsemiya (Kaltsiy kam) – QT oralig‘i uzayadi, Giperkaltsemiya (Kaltsiy ko‘p) – QT oralig‘i qisqaradi, Perikardit – yurak atrofidagi qop yallig‘lanadi (ST ko‘tarilishi, PR pastlash), Perikard effuziyasi – yurak atrofida suyuqlik to‘planadi (voltaj pasayadi), Digoksin ta’siri – ST segment “kupa” shaklida pastga egilgan, Antiaritmiklar (amiodaron va h.k.) – QT oralig‘i uzayadi, Intoksikatsiyalar (alkogol, kokain) – ritm buzilishi yoki ST o‘zgarishlar, Stress, charchoq, vegetativ disfunktsiyada sinus taxikardiya yoki ritm o‘zgarishlari, Sinus taxikardiya – yurak urishi >100/min, Sinus bradikardiya – yurak urishi <60/min, Ekstrasistoliyalar – “qo‘shimcha” urishlar, Atrial fibrillyatsiya (AFib) – yuqori bo‘lmachalar notekis uradi, Atrial flutter – arrali ritm, Ventrikulyar taxikardiya (VT) – xavfli tez ritm, Ventrikulyar fibrillyatsiya (VF) – yurak mushaklari tartibsiz “qaltiraydi”, Miokard ishemiyasi – ST pastlash yoki T inversiyasi, O‘tkir miokard infarkti – ST ko‘tarilishi (yangi infarkt), Eski infarkt (Q to‘lqinli) – avvalgi zararlanish izi, Subendokardial ishemiya – ichki qatlam shikastlanishi\n\nHar bir aniqlangan o‘zgarish klinik jihatdan asoslanib, yurak mushaklari faoliyati va bemor holatiga ta’siri bilan izohlanishi shart.",
    "automatic_analysis_bool": "xulosaning jiddiylik darajasi (1 = yengil, 2 = o‘rtacha, 3 = og‘ir)",
    "AI_recommendations": "Oddiy tilda bemor uchun tavsiya: tekshiruv zarurati, dam olish, jismoniy yuklamani kamaytirish, yoki shifokor ko‘rigiga murojaat qilish va agarda kasallik aniqlansa shu kasallik davolash usuli haqida.",
    "final_summary": "Tibbiy asosli yakuniy tashxis va qisqa tahlil natijasi, asosiy klinik xulosa bilan."
    }
Qo‘shimcha talablar:
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

# ---------------- Measure from signal ----------------
def measure_from_signal(leads: Dict[str, np.ndarray], fs: Optional[float]) -> Dict:
    out = {}
    sr = fs if fs is not None else 500.0

    # --- Reference lead tanlash ---
    ref = next((l for l in ['II','V2','I'] if l in leads), None)
    if ref is None:
        ref = list(leads.keys())[0]

    sig = leads.get(ref, np.zeros(1))

    # --- Signalni invert qilish (agar o‘rtacha < 0 bo‘lsa) ---
    if np.mean(sig) < 0:
        sig = -sig

    # --- ECG preprocessing va R-peaks ---
    try:
        ecg_clean = nk.ecg_clean(sig, sampling_rate=sr)
        peaks, info = nk.ecg_peaks(ecg_clean, sampling_rate=sr)
        rpeaks = np.array(peaks.get('ECG_R_Peaks', []), dtype=int)
    except Exception:
        ecg_clean = sig.copy()
        rpeaks = np.array([], dtype=int)

    # --- Instant HR va RR interval ---
    if len(rpeaks) >= 2:
        rr_ms = np.diff(rpeaks) / sr * 1000
        mean_rr = np.nanmean(rr_ms)
        mean_hr = 60000 / mean_rr if mean_rr > 0 else "not measurable"
        out['HR'] = f"{mean_hr:.1f} bpm" if mean_rr > 0 else "not measurable"
        out['RR_interval'] = f"{mean_rr:.1f} ms" if mean_rr > 0 else "not measurable"
    else:
        # Signal juda qisqa yoki R-peaks aniqlanmagan
        out['HR'] = "not measurable"
        out['RR_interval'] = "not measurable"

    # --- Delineation (QRS, P, T) ---
    try:
        if len(rpeaks) > 0:
            delineate = nk.ecg_delineate(ecg_clean, rpeaks, sampling_rate=sr, method='dwt')
        else:
            delineate = {}
    except Exception:
        delineate = {}

    try:
        q_on = delineate.get('ECG_Q_on', [])
        s_off = delineate.get('ECG_S_off', [])
        p_on = delineate.get('ECG_P_on', [])
        t_off = delineate.get('ECG_T_off', [])

        # QRS duration
        qrs_list = [(s-q)/sr*1000 for q,s in zip(q_on,s_off) if q is not None and s is not None]
        out['QRS_duration'] = f"{np.nanmean(qrs_list):.1f} ms" if qrs_list else "not measurable"

        # PR interval
        pr_list = [(q-p)/sr*1000 for p,q in zip(p_on,q_on) if p is not None and q is not None]
        out['PR_interval'] = f"{np.nanmean(pr_list):.1f} ms" if pr_list else "not measurable"

        # QT interval
        qt_list = [(t-q)/sr*1000 for q,t in zip(q_on,t_off) if q is not None and t is not None]
        out['QT_interval'] = f"{np.nanmean(qt_list):.1f} ms" if qt_list else "not measurable"

        # QTc Bazett
        if out['QT_interval'] != "not measurable" and out['RR_interval'] != "not measurable":
            qt_ms = float(out['QT_interval'].split()[0])
            rr_ms = float(out['RR_interval'].split()[0])
            rr_sec = rr_ms / 1000.0
            qtc = qt_ms / math.sqrt(rr_sec)
            out['QTc_Bazett'] = f"{qtc:.1f} ms"
        else:
            out['QTc_Bazett'] = "not measurable"
    except Exception:
        out['QRS_duration'] = out['PR_interval'] = out['QT_interval'] = out['QTc_Bazett'] = "not measurable"

    # --- QRS axis (I va aVF asosida) ---
    try:
        if 'I' in leads and 'aVF' in leads:
            angle = math.degrees(math.atan2(np.mean(leads['aVF']), np.mean(leads['I'])))
            out['QRS_axis'] = f"{angle:.1f} deg"
        else:
            out['QRS_axis'] = "not measurable"
    except Exception:
        out['QRS_axis'] = "not measurable"

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


def render_12_lead_png(leads: dict, fs: float = 500.0, gain_mm_mv: float = 10.0) -> bytes:
    """
    Maksimal sifatli (tibbiy darajadagi) 12-lead EKG PNG generatsiyasi.
    1 katakcha (big square) o'lchami 2 baravar kattalashtirilgan.
    """

    # Anti-aliasing (grafik sifatini oshirish)
    plt.rcParams['path.simplify'] = False
    plt.rcParams['agg.path.chunksize'] = 10000

    CANONICAL_LEADS = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']
    n_leads = len(CANONICAL_LEADS)

    fig, axes = plt.subplots(
        n_leads, 1,
        figsize=(22, n_leads * 1.6),
        sharex=True,
        constrained_layout=True
    )

    # --- 2× KATTA GRID UCHUN KOEFFITSIENT ---
    BASE_MAJOR = 25   # canonical big square = 25 samples
    BASE_MINOR = 5    # canonical small square = 5 samples
    SCALE = 2         # 2× katta katak
    BIG = BASE_MAJOR * SCALE      # 50 samples
    SMALL = BASE_MINOR * SCALE    # 10 samples

    for i, lead in enumerate(CANONICAL_LEADS):
        y = leads[lead] * gain_mm_mv / 1000.0

        # Signalni chizish
        axes[i].plot(y, color='black', linewidth=1.3)
        axes[i].set_ylabel(lead, rotation=0, labelpad=20, fontsize=14)
        axes[i].set_facecolor("#ffffff")

        # Min–Max ko‘rsatish
        y_min, y_max = np.min(y), np.max(y)
        y_range = max(y_max - y_min, 0.001)

        axes[i].set_ylim(y_min - y_range * 0.1, y_max + y_range * 0.1)
        axes[i].set_yticks([y_min, y_max])
        axes[i].set_yticklabels([f"{y_min:.1f}", f"{y_max:.1f}"], fontsize=10)

        # X o‘qi – boshlanish/oxir
        x_min, x_max = 0, len(y) - 1
        axes[i].set_xticks([x_min, x_max])
        axes[i].set_xticklabels([0, round(x_max / fs, 1)], fontsize=10)

        # --- 2× KATTA GRID LOKATORLAR ---
        axes[i].xaxis.set_major_locator(MultipleLocator(BIG))     # 50 samples
        axes[i].xaxis.set_minor_locator(MultipleLocator(SMALL))   # 10 samples

        # Y-oq (avtomatik major/minor)
        major_step = max(y_range / 5, 0.1)
        minor_step = max(y_range / 25, 0.01)

        axes[i].yaxis.set_major_locator(MultipleLocator(major_step))
        axes[i].yaxis.set_minor_locator(MultipleLocator(minor_step))

        # --- GRID CHIZIQLAR (kattaroq ko‘rinishi uchun) ---
        axes[i].grid(which='major', color='#ffb3b3', linewidth=1.1)
        axes[i].grid(which='minor', color='#ffd9d9', linewidth=0.55)

    axes[-1].set_xlabel("Time (s)")

    # PNG ga yuqori DPI bilan saqlash
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=650)   # juda yuqori sifatlilik
    plt.close(fig)

    buf.seek(0)
    return buf.read()
# ============================ ecg_api_full.py (3-qism) ============================

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
        elif fname.endswith(('.png','.jpg','.jpeg')):
            leads, fs = extract_image_bytes_as_signal(content)
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
    for ln in CANONICAL_LEADS:
        if ln not in leads:
            leads[ln] = np.zeros(250*10)  # 10s of zeros at 250Hz
    print(leads, fs)
    
    

    # --- Generate PNG ---
    if fname.endswith(('.png','.jpg','.jpeg')):
        png_bytes = content
    else:
        png_bytes = render_12_lead_png(leads, fs, gain_mm_mv=gain)
        # compressed_png = compress_final_png(png_bytes, scale=0.3)
        compressed_png=png_bytes
    # --- Upload PNG to OpenAI ---
    try:
        file_id = openai_upload_file(OPENAI_API_KEY, compressed_png, filename=fname if fname.endswith('.png') else 'ecg.png')
    except Exception as e:
        b64 = base64.b64encode(compressed_png).decode('ascii')
        return JSONResponse(content={
            "error": f"OpenAI upload failed: {e}",
            
            "png_base64": b64
        })
    
    # --- Compose prompt ---
    prompt = compose_prompt_for_openai()

    # --- Call OpenAI ChatCompletion ---
    
    print(file_id)
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.responses.create(
            model="gpt-4.1",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {"type": "input_image", "file_id": file_id}  # <--- eski file_id o‘rniga
                    ]
                }
            ],
            temperature=0.2
        )
        content_out = resp.output_text
        print("FULL RESPONSE:", resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI chat completion failed: {e}")

# --- Parse JSON ---
    try:
        import json
        parsed = json.loads(content_out)
    except Exception:
        parsed = {"raw": content_out}

# --- Encode PNG to base64 for frontend ---
    png_b64 = base64.b64encode(compressed_png).decode('ascii')

    return JSONResponse(content={
        "openai_file_id": file_id,
        "ai_response": parsed,
        "ecg_png_base64": png_b64  # rasm base64 sifatida foydalanuvchiga qaytariladi
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
