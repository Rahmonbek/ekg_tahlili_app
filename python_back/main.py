import os
import tempfile
import numpy as np
import pandas as pd
import cv2
import neurokit2 as nk
import wfdb
import matplotlib.pyplot as plt
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAI
import json
from dotenv import load_dotenv

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
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
def extract_signal_from_image(file_path):
    """Rasm yoki PDF'dan signalni taxminiy ajratish"""
    img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY_INV)
    signal = np.mean(thresh, axis=0)
    return signal
def safe_format(value, unit=None):
  
    if value is None or np.isnan(value):
        return None
    return f"{round(value, 2)} {unit}" if unit else round(value, 2)

def analyze_signal(signal, sampling_rate=300):
    
    signal = np.array(signal, dtype=float)

    # 1. Signalni tozalash
    clean_signal = nk.ecg_clean(signal, sampling_rate=sampling_rate)

    # 2. R-tepalarni aniqlash
    peaks, _ = nk.ecg_peaks(clean_signal, sampling_rate=sampling_rate)
    
    # 4. Yurak urishi (HR) hisoblash
    heart_rate = nk.ecg_rate(peaks, sampling_rate=sampling_rate)
    
    # 3. EKG delineatsiya (P, QRS, T segmentlarini aniqlash)
    try:
        delineate, _ = nk.ecg_delineate(
            clean_signal,
            peaks,
            sampling_rate=sampling_rate,
            method="peak",
            show=False
        )
    except Exception as e:
        print(f"Delineate xatosi: {e}")
        delineate = None
    
    # 5. O'lchovlarni chiqarish
    digital_measurements = {
        "Heart_Rate_Mean": safe_format(np.mean(heart_rate), "bpm"),
        "Heart_Rate_Std": safe_format(np.std(heart_rate), "bpm"),
        "Signal_Length": len(signal),
        "Sampling_Rate": sampling_rate,
        "R_Peaks_Count": len(peaks['ECG_R_Peaks'][peaks['ECG_R_Peaks'] > 0]),
    }
    print(delineate)
    # Delineate bo'lsa, qo'shimcha o'lchovlarni qo'sh
    if delineate is not None:
        try:
            # Delineate ichidagi ustunlarni tekshirish (DataFrame'dagi ustun nomlari)
            available_cols = delineate.columns.tolist()
            print(f"Available columns: {available_cols}")
            
            # DataFrame'dan ustunlarni to'g'ri olish
            p_onsets = delineate["ECG_P_Onsets"].values if "ECG_P_Onsets" in available_cols else None
            r_peaks = delineate["ECG_R_Peaks"].values if "ECG_R_Peaks" in available_cols else None
            qrs_onsets = delineate["ECG_QRS_Onsets"].values if "ECG_QRS_Onsets" in available_cols else None
            qrs_offsets = delineate["ECG_QRS_Offsets"].values if "ECG_QRS_Offsets" in available_cols else None
            t_offsets = delineate["ECG_T_Offsets"].values if "ECG_T_Offsets" in available_cols else None
            
            measurements_to_add = {}
            
            if p_onsets is not None and r_peaks is not None:
                pr_interval = np.nanmean(r_peaks - p_onsets)
                measurements_to_add["PR_Interval"] = safe_format(pr_interval, "ms")
            
            if qrs_onsets is not None and qrs_offsets is not None:
                qrs_duration = np.nanmean(qrs_offsets - qrs_onsets)
                measurements_to_add["QRS_Duration"] = safe_format(qrs_duration, "ms")
            
            if qrs_onsets is not None and t_offsets is not None:
                qt_interval = np.nanmean(t_offsets - qrs_onsets)
                measurements_to_add["QT_Interval"] = safe_format(qt_interval, "ms")
            
            digital_measurements.update(measurements_to_add)
        
        except Exception as e:
            print(f"Interval hisoblashda xato: {e}")
            import traceback
            traceback.print_exc()
    
    try:
        digital_measurements["QRS_Axis"] = safe_format(nk.ecg_axis(clean_signal, sampling_rate=sampling_rate))
    except:
        digital_measurements["QRS_Axis"] = None
    
    return digital_measurements


# ============================
# 🔹 API yo‘li
# ============================
@app.post("/api/analyze")
async def analyze_ekg(file: UploadFile = File(...)):
    try:
        # Faylni vaqtincha saqlash
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        mime = file.content_type
        signal = None

        # CSV yoki text signal
        if mime in ["text/csv", "application/octet-stream"]:
            df = pd.read_csv(tmp_path)
            signal = df.iloc[:, 0].values
        elif file.filename.endswith(".edf"):
            import pyedflib
            f = pyedflib.EdfReader(tmp_path)
            signal = f.readSignal(0)
            f.close()
        elif mime in ["image/png", "image/jpeg", "application/pdf"]:
            signal = extract_signal_from_image(tmp_path)
        else:
            raise HTTPException(status_code=400, detail=f"Noto‘g‘ri fayl turi: {mime}")

        if signal is None or len(signal) < 100:
            raise HTTPException(status_code=400, detail="Signal aniqlanmadi yoki juda qisqa")

        # Tahlil
      
        digital_measurements = analyze_signal(signal)
        print(digital_measurements)
        prompt = PROMPT_TEMPLATE.format(digital_measurements=digital_measurements)

        # AI tahlili
        completion = client.responses.create(
            model="gpt-4.1-mini",
            input=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        ai_text = completion.output[0].content[0].text

        os.remove(tmp_path)

        return JSONResponse(
            content={
                # "measurements": digital_measurements,
                "ai_analysis": ai_text,
            }
        )

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ============================
# 🔹 Root URL
# ============================
@app.get("/")
async def root():
    return {"message": "✅ AI EKG Analyzer backend ishlayapti!", "endpoint": "/api/analyze"}
