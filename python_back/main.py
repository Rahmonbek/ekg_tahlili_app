import os
import tempfile
import numpy as np
import pandas as pd
import cv2
import neurokit2 as nk
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAI
import xml.etree.ElementTree as ET
import base64
from dotenv import load_dotenv
import json
import math
load_dotenv()

# ============================
# 🔹 FASTAPI konfiguratsiyasi
# ============================
app = FastAPI(title="AI EKG Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================
# 🔹 OpenAI mijozini sozlash
# ============================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY muhit o'zgaruvchisi topilmadi.")
client = OpenAI(api_key=OPENAI_API_KEY)

PROMPT_TEMPLATE = """
Siz tajribali kardiolog shifokorsiz. Quyidagi EKG signal tahlilidan olingan o'lchovlarni tahlil qiling va natijani faqat JSON formatida qaytaring. Hech qanday qo‘shimcha izoh yoki matn yozmang — faqat toza JSON. Barcha matnlar o‘zbek tilida bo‘lsin.

Natijani faqat JSON formatida qaytaring:

{{
  "digital_measurements_str":"EKG o‘lchovlarning eng asosiylarini, qiymatga ega bo‘lganlarini tanlab, har birining nomi, qiymati, birligi va qiymatga beriladigan izohini yoz. Qiymati mavjud bo‘lmagan o‘lchovlarni yozma. Natijani object ko‘rinishida emas, umumiy bitta string ko‘rinishida chiqarsin.",
  "automatic_analysis": "EKG signali asosida yurak ritmi, o‘tkazuvchanlik, interval va o‘qlar tahlili, ishemik belgilar, aritmiyalar hamda digital_measurements dagi parametrlarning normal yoki patologik holati haqida to‘liq tibbiy izoh. Agar aniqlansa, quyidagi klinik holatlar haqida ham batafsil ma’lumot bering: giperkalemiya, gipokalemiya, gipokaltsemiya, giperkaltsemiya, perikardit, perikard effuziyasi, digoksin ta’siri, antiaritmiklar, intoksikatsiyalar, stress, sinus taxikardiya/bradikardiya, ekstrasistoliyalar, atrial fibrillyatsiya/flutter, ventrikulyar taxikardiya/fibrillyatsiya, miokard ishemiyasi yoki infarkti. Har bir aniqlangan o‘zgarish klinik jihatdan asoslanib, yurak mushaklari faoliyati va bemor holatiga ta’siri bilan izohlanishi kerak.",
  "automatic_analysis_bool": "1 = yengil, 2 = o‘rtacha, 3 = og‘ir (xulosaning jiddiylik darajasi)",
  "AI_recommendations": "Oddiy tilda bemor uchun tavsiya: tekshiruv zarurati, dam olish, jismoniy yuklamani kamaytirish yoki shifokor ko‘rigiga murojaat qilish, kasallik aniqlansa davolash usuli.",
  "final_summary": "Tibbiy asosli yakuniy tashxis va qisqa tahlil natijasi, asosiy klinik xulosa bilan."
}}

Qo‘shimcha talablar:
- Elektrolit, perikard, ishemiya yoki aritmiya belgilaridan biri aniqlansa, u alohida tibbiy izoh bilan tushuntirilsin.

O'lchovlar:
{digital_measurements}
"""

# ============================
# 🔹 Helper funksiyalar
# ============================
def extract_signal_from_image(file_path):
    img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    # Threshold -> o'rtacha bo'ylab chiziq olinadi
    _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY_INV)
    # X o'qi bo'yicha o'rtacha (qalin chiziq bo'lsa good)
    signal = np.mean(thresh, axis=0)
    return signal.astype(float)

def detect_sampling_rate_from_csv(df):
    # Time ustuni bo'lsa undan aniqlashga urinamiz
    time_cols = [c for c in df.columns if "time" in c.lower() or "t" == c.lower()]
    if time_cols:
        try:
            t = df[time_cols[0]].values.astype(float)
            if len(t) >= 2:
                dt = np.median(np.diff(t))
                if dt > 0:
                    return int(round(1.0 / dt))
        except Exception:
            pass
    return None

def extract_signal_from_csv_with_rate(df):
    sampling_rate = detect_sampling_rate_from_csv(df)
    # Asosiy signal ustuni – birinchi numeric ustun
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        # agar barcha qiymatlar string bo'lsa, har birini float qilib o'qish
        vals = pd.to_numeric(df.iloc[:, 0], errors='coerce').dropna().values
        return vals.astype(float), sampling_rate
    signal = df[numeric_cols[0]].values.astype(float)
    return signal, sampling_rate

def detect_sampling_rate_from_hl7_xml(root):
    ns = {"hl7": "urn:hl7-org:v3"}
    sequences = root.findall(".//hl7:sequence", ns)
    for seq in sequences:
        code = seq.find("hl7:code", ns)
        if code is not None and code.attrib.get("code") == "TIME_ABSOLUTE":
            value = seq.find("hl7:value", ns)
            if value is not None:
                increment = value.find("hl7:increment", ns)
                if increment is not None and "value" in increment.attrib:
                    try:
                        delta_t = float(increment.attrib["value"])
                        if delta_t > 0:
                            return int(round(1.0 / delta_t))
                    except:
                        continue
    return None

def detect_sampling_rate_from_xml(root):
    tags = [
        ".//SampleRate",
        ".//SamplingRate",
        ".//SampleFrequency",
        ".//fs",
        ".//WaveFormSampleRate",
        ".//Hz"
    ]
    for tag in tags:
        node = root.find(tag)
        if node is not None and node.text:
            try:
                val = float(node.text.strip())
                if val > 0:
                    return int(round(val))
            except:
                continue
    return None

def extract_signal_from_xml_with_rate(file_path, lead_name="MDC_ECG_LEAD_I"):
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        signal = None
        sampling_rate = None

        # 1️⃣ HL7 <component> ichidan berilgan lead signalini olish
        components = root.findall(".//{urn:hl7-org:v3}component")
        for comp in components:
            code = comp.find(".//{urn:hl7-org:v3}code")
            if code is not None and code.attrib.get("code") == lead_name:
                digits = comp.find(".//{urn:hl7-org:v3}digits")
                if digits is not None and digits.text:
                    nums = [float(x) for x in digits.text.strip().split()]
                    signal = np.array(nums, dtype=float)
                    break

        # 2️⃣ WaveFormData fallback (base64 int16)
        if signal is None:
            wave_data = root.find(".//WaveFormData")
            if wave_data is not None and wave_data.text:
                try:
                    decoded = base64.b64decode(wave_data.text.strip())
                    signal = np.frombuffer(decoded, dtype=np.int16).astype(float)
                except Exception:
                    signal = None

        # 3️⃣ ECGWaveform yoki LeadData fallback (whitespace-separated floats)
        if signal is None:
            waveform = root.find(".//ECGWaveform")
            if waveform is not None and waveform.text:
                try:
                    nums = [float(x) for x in waveform.text.split() 
                            if x.replace(".", "", 1).replace("-", "", 1).isdigit()]
                    signal = np.array(nums, dtype=float)
                except Exception:
                    signal = None

        # 4️⃣ Oxirgi fallback: barcha matn ichidagi raqamlar
        if signal is None:
            text = ET.tostring(root, encoding='unicode', method='text')
            nums = [float(x) for x in text.split() if x.replace(".", "", 1).replace("-", "", 1).isdigit()]
            if nums:
                signal = np.array(nums, dtype=float)

        # 5️⃣ Sampling rate aniqlash
        sampling_rate = detect_sampling_rate_from_hl7_xml(root) or detect_sampling_rate_from_xml(root) or 500

        if signal is None:
            return None, None

        return signal, int(round(sampling_rate))

    except Exception as e:
        print("XML parsing xatosi:", e)
        return None, None

def safe_format(value, unit=None):
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if unit:
        # agar value hanuz ms yoki bpm bo'lsa, formatlab qaytarish
        try:
            v = float(value)
            return f"{round(v, 2)} {unit}"
        except:
            return f"{value} {unit}"
    else:
        try:
            return round(float(value), 2)
        except:
            return value

# ============================
# 🔹 EKG tahlil funksiyasi
# ============================
def analyze_signal(signal, sampling_rate=300):
    signal = np.array(signal, dtype=float)
    print(sampling_rate)
    fs = int(round(sampling_rate))
    print(fs)
    if len(signal) < 200:
        raise ValueError("Signal juda qisqa (kamida 200 nuqta kerak).")

    # NeuroKit bilan tozalash va R-piklarni aniqlash
    clean = nk.ecg_clean(signal, sampling_rate=fs, method='neurokit')
    try:
        signals, info = nk.ecg_peaks(clean, sampling_rate=fs, method="neurokit", correct_artifacts=False)
        print(signals.keys())
    except Exception as e:
        # fallback: find_peaks oddiy usuli
        peaks_indices, _ = nk.signal_findpeaks(clean, relative_height=0.5)
        signals = {"ECG_R_Peaks": peaks_indices}
        info = {}

    # R-peaks olish: nk.ecg_peaks qaytargan formatlar bir nechta bo'lishi mumkin
    if isinstance(signals, dict) and "ECG_R_Peaks" in signals:
        rpeaks_arr = signals["ECG_R_Peaks"]
        # agar bu binary vector bo'lsa, indekslarni olib kelamiz
        if len(rpeaks_arr) == len(clean):
            rpeaks = np.where(np.array(rpeaks_arr) > 0)[0]
        else:
            rpeaks = np.array(rpeaks_arr, dtype=float)
    else:
        # info ichida bo'lishi mumkin
        rpeaks = np.array(info.get("ECG_R_Peaks", []), dtype=float)
        if rpeaks.size == 0:
            rpeaks = np.array([], dtype=float)

    # Agar rpeaks topilmasa xato beramiz
    if rpeaks.size < 2:
        raise ValueError("R-piklar yetarli emas yoki aniqlanmadi.")

    # HR hisoblash (RR intervallari orqali)
    rr_samples = np.diff(rpeaks)
    
    rr_ms = (rr_samples / fs) * 1000.0
    heart_rate_inst = 60000.0 / rr_ms  # instant HR in bpm
    heart_rate_mean = np.mean(heart_rate_inst)
    heart_rate_std = np.std(heart_rate_inst)
    print(rpeaks)
    # Deleniate (P/QRS/T onset/offset) — ba'zan muvaffaqiyatsiz bo'ladi -> try/except
    delineate = None
    try:
        delineate, info_del = nk.ecg_delineate(clean, rpeaks=rpeaks, sampling_rate=fs, method="peak", show=False)
    except Exception:
        delineate = None
    print(delineate)
    digital_measurements = {
        "Heart_Rate_Mean_bpm": safe_format(heart_rate_mean, "bpm"),
        "Heart_Rate_Std_bpm": safe_format(heart_rate_std, "bpm"),
        "R_Peaks_Count": int(len(rpeaks)),
        "Sampling_Rate_Hz": int(fs),
    }
    print(delineate is not None and isinstance(delineate, (pd.DataFrame, dict)))
    if delineate is not None:
        # delineate DataFrame ko'rinishida bo'lsa
        if isinstance(delineate, dict):
            df = pd.DataFrame(delineate)
        else:
            df = delineate
        print(df)
        cols = df.columns.tolist()
        cols1 = signals.columns.tolist()
        print(cols)
        # QRS onsets/offsets / P onsets / T offsets - sample birlikda
        # O'rtacha ms ga o'tkazish (samples -> ms)
        print("ECG_P_Onsets" in cols and "ECG_R_Peaks" in cols1)
        try:
            if "ECG_P_Onsets" in cols and "ECG_R_Peaks" in cols1:
                p_onsets = np.array(df["ECG_P_Onsets"].dropna(), dtype=float)
                r_peaks_col = np.array(signals["ECG_R_Peaks"].dropna(), dtype=float)
                print(p_onsets, r_peaks_col, 'XXXXXXXXXXXXX')
                # some delineate outputs have NaN rows; compute per-beat where both exist
                valid = (~np.isnan(p_onsets)) & (~np.isnan(r_peaks_col))
                print(valid, 'SAlo,')
                if valid.any():
                    pr_samples = r_peaks_col[valid] - p_onsets[valid]
                    pr_ms = np.nanmean(pr_samples) / fs * 1000.0
                    digital_measurements["PR_Interval_ms"] = safe_format(pr_ms, "ms")
            if "ECG_QRS_Onsets" in cols and "ECG_QRS_Offsets" in cols:
                q_on = np.array(df["ECG_QRS_Onsets"].dropna(), dtype=float)
                q_off = np.array(df["ECG_QRS_Offsets"].dropna(), dtype=float)
                # align lengths
                n = min(len(q_on), len(q_off))
                if n > 0:
                    qrs_samples = q_off[:n] - q_on[:n]
                    qrs_ms = np.nanmean(qrs_samples) / fs * 1000.0
                    digital_measurements["QRS_Duration_ms"] = safe_format(qrs_ms, "ms")
            if "ECG_QRS_Onsets" in cols and "ECG_T_Offsets" in cols:
                q_on = np.array(df["ECG_QRS_Onsets"].dropna(), dtype=float)
                t_off = np.array(df["ECG_T_Offsets"].dropna(), dtype=float)
                n = min(len(q_on), len(t_off))
                if n > 0:
                    qt_samples = t_off[:n] - q_on[:n]
                    qt_ms = np.nanmean(qt_samples) / fs * 1000.0
                    digital_measurements["QT_Interval_ms"] = safe_format(qt_ms, "ms")
        except Exception as e:
            # agar delimiter format bilan bog'liq muammo bo'lsa davom etamiz
            pass

    return digital_measurements

# ============================
# 🔹 API endpoint
# ============================
@app.post("/api/analyze")
async def analyze_ekg(
    file: UploadFile = File(...),
    paper_speed: float = Form(25.0),      # mm/s, default 25
    amplitude: float = Form(10.0),        # mm/mV, default 10
):
    tmp_path = None
    try:
        # Temp faylga yozish
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        mime = file.content_type or ""
        signal = None
        sampling_rate = None

        filename_lower = (file.filename or "").lower()

        # CSV: ba'zi brauzerlar application/vnd.ms-excel yuboradi shuning uchun tekshiramiz
        if "csv" in mime or filename_lower.endswith(".csv") or "excel" in mime:
            df = pd.read_csv(tmp_path)
            signal, sampling_rate = extract_signal_from_csv_with_rate(df)

        elif filename_lower.endswith(".xml") or "xml" in mime:
            signal, sampling_rate = extract_signal_from_xml_with_rate(tmp_path)
            print(signal)
        elif filename_lower.endswith(".edf"):
            try:
                import pyedflib
                f = pyedflib.EdfReader(tmp_path)
                signal = f.readSignal(0)
                f.close()
                sampling_rate = int(round(f.getSampleFrequency(0)))
            except Exception:
                # fallback
                signal = None

        elif "image" in mime or filename_lower.endswith((".png", ".jpg", ".jpeg")):
            signal = extract_signal_from_image(tmp_path)

        elif "pdf" in mime or filename_lower.endswith(".pdf"):
            # PDF ichidagi rasmni chiqarish murakkab; hozir oddiy fallback
            signal = extract_signal_from_image(tmp_path)

        else:
            raise HTTPException(status_code=400, detail=f"Noto'g'ri yoki qo'llab-quvvatlanmaydigan fayl turi: {mime}")

        if signal is None or len(signal) < 100:
            raise HTTPException(status_code=400, detail="Signal aniqlanmadi yoki juda qisqa (kamida 100 nuqta kerak).")

        # ===========================
        # Sampling rate hisoblash
        # ===========================
        if paper_speed and amplitude:
            standard_paper_speed = 25    # mm/s
            standard_amplitude = 10      # mm/mV
            standard_sampling_rate = 500 # Hz

            # Hisoblash: paper_speed va amplitude asosida skeyl qilinadi
            sampling_rate = standard_sampling_rate * (paper_speed / standard_paper_speed) * (standard_amplitude / amplitude)

        if sampling_rate is None:
            sampling_rate = 500  # default

        # ===========================
        # Signalni tahlil qilish
        # ===========================
        print(sampling_rate)
        digital_measurements = analyze_signal(signal, sampling_rate=sampling_rate)

        # PROMPT uchun JSON string
        digital_measurements_str = json.dumps(digital_measurements, ensure_ascii=False)
        print(digital_measurements_str)
        prompt = PROMPT_TEMPLATE.format(digital_measurements=digital_measurements_str)

        # OpenAI chaqirig'i
        completion = client.responses.create(
            model="gpt-4.1-mini",
            input=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )

        # Turli formatli chiqishni qo'llab-quvvatlash
        ai_text = ""
        try:
            # official SDK may have 'output_text' or structured output
            if hasattr(completion, "output_text") and completion.output_text:
                ai_text = completion.output_text
            else:
                # structured fallback
                out = completion.output if hasattr(completion, "output") else None
                if isinstance(out, list) and len(out) > 0:
                    # birinchi elementda content bo'lishi mumkin
                    first = out[0]
                    # content ichidan matn olish
                    cont = first.get("content") if isinstance(first, dict) else None
                    if isinstance(cont, list) and len(cont) > 0:
                        piece = cont[0]
                        ai_text = piece.get("text", "") if isinstance(piece, dict) else str(piece)
                # oxirgi fallback: raw dict ga aylantiramiz
                if not ai_text:
                    ai_text = json.dumps(completion, default=str, ensure_ascii=False)
        except Exception:
            ai_text = str(completion)

        # Agar ai_text bo'sh bo'lsa xatolik qaytaramiz
        if not ai_text:
            raise RuntimeError("AI javobi olinmadi yoki bo'sh.")

        # Faylni o'chirish
        try:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass

        return JSONResponse(content={"ai_analysis": ai_text, "digital_measurements": digital_measurements})

    except HTTPException as he:
        # saqlangan temp faylni tozalash
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise he

    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        return JSONResponse(content={"error": str(e)}, status_code=500)
