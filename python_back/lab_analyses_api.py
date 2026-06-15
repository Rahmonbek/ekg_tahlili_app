import asyncio
import logging
import os
import io
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from lab_analyse_categories import create_lab_analyse_category
from lab_analyse import create_lab_analyse, update_lab_analyse
from lab_analyse_doctors import create_lab_analyse_doctor
from openai import OpenAI
from config import OPENAI_API_KEY
from auth_middleware import verify_token
from file_validator import prepare_upload_filename, validate_file_type

logger = logging.getLogger(__name__)

# Background task lar uchun referenslar — GC dan himoya
_bg_tasks: set = set()
BASE_DIR = Path(__file__).parent  # Loyihangiz papkasi


router = APIRouter(
    prefix="/lab",
    tags=["Lab Analyses"]
)

UPLOAD_DIR1 = BASE_DIR / "uploads" / "lab_analyse_files"
UPLOAD_DIR1.mkdir(parents=True, exist_ok=True)

def get_unique_filename(directory: Path, filename: str) -> str:
    safe_name = filename.replace(" ", "_")
    filepath = directory / safe_name
    if not filepath.exists():
        return safe_name
    name, ext = os.path.splitext(safe_name)
    counter = 1
    while True:
        new_name = f"{name}_{counter}{ext}"
        if not (directory / new_name).exists():
            return new_name
        counter += 1

def save_analyse_file(file_bytes: bytes, filename: str) -> str:
    safe_name = get_unique_filename(UPLOAD_DIR1, filename)
    filepath = UPLOAD_DIR1 / safe_name
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return f"/uploads/lab_analyse_files/{safe_name}"

def openai_upload_file(api_key: str, file_bytes: bytes, filename: str = "lab.png") -> str:
    client = OpenAI(api_key=api_key)
    try:
        fobj = io.BytesIO(file_bytes)
        fobj.name = filename
        resp = client.files.create(file=fobj, purpose="user_data")  # purpose="vision" PNG uchun
        return resp.id
    except Exception as e:
        raise RuntimeError(f"OpenAI file upload failed: {e}")

def compose_prompt_for_openai(age, gender,  lang) -> str:
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

    
        
    
    
    
    prompt_header += f"""
    Sizga laboratoriya natijasi fayli va bemor ma'lumotlari berildi. 
    
❗️JAVOB QOIDALARI:
- Javob FAQAT quyida berilgan JSON formatida bo'lsin
- JSON dan tashqarida hech qanday izoh, sharh yoki qo'shimcha matn YOZILMASIN
- Javobni {language} tilida taqdim et
- Laboratoriya natijasini tahlil qiling va quyidagi bo'limlarni to'ldiring:
- Laboratoriya faylidagi quyidagi parametrlardan qaysi birlarini qiymatini aniqlash mumkin bo'lsa, ularni aniqlang va qiymatlarini yozing. Parametrlar:
hb - Gemoglobin – qonda kislorod tashuvchi oqsil (g/L)
rbc - Qizil qon hujayralari soni (x10¹²/L)
wbc - Oq qon hujayralari soni (x10⁹/L)
plt - Qon trombotsitlari soni (x10⁹/L)
hct - Gematokrit – qondagi qizil qon hujayralari foizi (%)
mcv - O'rtacha eritrosit hajmi (fL)
mch - O'rtacha gemoglobin miqdori eritrositda (pg)
mchc - O'rtacha gemoglobin kontsentratsiyasi eritrositda (g/L)
esr - Erythrocyte Sedimentation Rate – qizil qon hujayralari cho'kishi (mm/soat)
glucose - Qonda glyukoza darajasi (mmol/L)
cholesterol - Qonda xolesterol darajasi (mmol/L)
alt - Alanin aminotransferaza – jigar fermenti (U/L)
ast - Aspartat aminotransferaza – jigar/miya fermenti (U/L)
bilirubin_total - Jami bilirubin – jigar funksiyasi (µmol/L)
bilirubin_direct - To'g'ridan-to'g'ri bilirubin (µmol/L)
creatinine - Kreatinin – buyrak funksiyasi (µmol/L)
urea - Mochevina – buyrak funksiyasi (mmol/L)
total_protein - Jami oqsillar (g/L)
albumin - Albumin oqsili (g/L)
calcium - Qondagi kalsiy (mmol/L)
sodium - Qondagi natriy (mmol/L)
potassium - Qondagi kaliy (mmol/L)
iron - Qondagi temir (µmol/L)
tsh - Tiroid stimulyator gormoni (µIU/mL)
free_t4 - Bepul tiroksin T4 (pmol/L)
insulin - Qondagi insulin (µIU/mL)
urine_volume - Peshob hajmi (mL)
urine_density - Peshob zichligi (1.010–1.025)
urine_ph - Peshob pH (0–14)
urine_protein - Peshobdagi oqsillar (g/L)
urine_glucose - Peshobdagi glyukoza (mmol/L)
urine_ketones - Peshobdagi keton tanqalari (mmol/L)
urine_bilirubin - Peshobdagi bilirubin (µmol/L)
urobilinogen - Peshobdagi urobilinogen (µmol/L)
urine_rbc - Peshobdagi qizil qon hujayralari soni (count/field)
urine_wbc - Peshobdagi oq qon hujayralari soni (count/field)
daily_protein - 24 soatlik peshobdagi protein (mg/24h)
daily_creatinine - 24 soatlik kreatinin (mmol/24h)
daily_calcium - 24 soatlik kalsiy (mmol/24h)
daily_sodium - 24 soatlik natriy (mmol/24h)

---

### JSON SHABLONI (QAT'IY SAQLANSIN):

{"""{
  "digital_measurements": {
    "hb": {"value": , "unit": "g/L"},
    
  },

  "automatic_analysis": "Labaratoriya natijasi faylidagi mavjud parametrlardan qaysilari normada emas ekanligi yozilsin. Normasi qancha bo'lishini yozma. Parametrlardan qaysilarini aniqlab bo'lmasligi haqida ham yozma. Agar hech qanday parametr aniqlanmasa shunchaki labaratoriya faylini tahlil qil.",

  "automatic_analysis_bool": "Holat jiddiyligi darajasi: 1 = yengil, 2 = o'rtacha, 3 = og'ir",
   "final_summary": "Tibbiy asoslangan yakuniy xulosa"
}"""}

---

### QO'SHIMCHA TALABLAR:
- "automatic_analysis_bool" bo'limida faqat 1 yoki 2 yoki 3 sonlari bo'lsin ortiqcha narsa kerak emas 
- "digital_measurements" bo'limida fayldan aniqlash mumkin bo'lgan barcha parametrlar yozilsin
- "digital_measurements" har bir parametrni qiymatini faqat {"""{"value": , "unit": ""}"""} shu formatda yozilsin

❗️Javob FAQAT JSON bo'lsin va {language} tilida bo'lsin
    """
    return prompt_header

# ─── Sinxron OpenAI chaqiruvi (thread pool da ishlaydi) ──────────────────────
def _sync_lab_openai(content: bytes, fname: str, age: int, gender: str, lang: str) -> dict:
    """OpenAI ga sinxron so'rov — asyncio.to_thread() orqali chaqiriladi."""
    client = OpenAI(api_key=OPENAI_API_KEY)
    fname = prepare_upload_filename(fname, content, default_stem="lab_upload").lower()

    # 1. Faylni OpenAI ga yuklash
    fobj = io.BytesIO(content)
    fobj.name = fname
    uploaded = client.files.create(file=fobj, purpose="user_data")
    file_id = uploaded.id

    # 2. AI tahlil
    is_image = fname.endswith(('.png', '.jpg', '.jpeg'))
    ai_type = "input_image" if is_image else "input_file"
    prompt = compose_prompt_for_openai(age, gender, lang)

    resp = client.responses.create(
        model="gpt-5.2",
        input=[{
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt},
                {"type": ai_type, "file_id": file_id}
            ]
        }]
    )
    try:
        return json.loads(resp.output_text)
    except Exception:
        return {"raw": resp.output_text}


# ─── Fon rejimidagi AI tahlil ─────────────────────────────────────────────────
async def _lab_ai_background(
    analyse_id: int,
    content: bytes,
    fname: str,
    age: int,
    gender: str,
    lang: str
) -> None:
    """Browser yopilsa ham davom etadigan AI tahlil — mustaqil DB sessiyasi."""
    db = SessionLocal()
    try:
        parsed = await asyncio.to_thread(_sync_lab_openai, content, fname, age, gender, lang)

        digital_measurements: dict = parsed.get("digital_measurements", {}) if isinstance(parsed, dict) else {}
        automatic_analysis_text = parsed.get("automatic_analysis", "") if isinstance(parsed, dict) else ""
        final_summary = parsed.get("final_summary", "") if isinstance(parsed, dict) else ""
        try:
            automatic_analysis_bool = int(parsed.get("automatic_analysis_bool", 0)) if isinstance(parsed, dict) else 0
        except (ValueError, TypeError):
            automatic_analysis_bool = 0

        digital_values = {
            k: v["value"]
            for k, v in digital_measurements.items()
            if isinstance(v, dict) and "value" in v
        }
        ai_data_str = json.dumps({
            "automatic_analysis": automatic_analysis_text,
            "final_summary": final_summary,
            "automatic_analysis_bool": automatic_analysis_bool
        }, ensure_ascii=False)

        update_lab_analyse(
            session=db,
            analyse_id=analyse_id,
            status=2,
            ai_answer_data=ai_data_str,
            **digital_values
        )
        logger.info("Lab AI muvaffaqiyatli: analyse_id=%d", analyse_id)

    except Exception as exc:
        logger.error("Lab AI fon xatolik analyse_id=%d: %s", analyse_id, exc)
        try:
            update_lab_analyse(session=db, analyse_id=analyse_id, status=-1, ai_answer_data=str(exc))
        except Exception:
            pass
    finally:
        db.close()


@router.post("/analyze")
async def analyze(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    doctor_id: list[int] | None = Form(None),
    file: list[UploadFile] = File(...),
    lab_category_id: list[int] | None = Form(None),
    created_doctor_id: int = Form(...),
    clinic_id: int = Form(...),
    patcient_id: int = Form(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...),
    analysis_date: str | None = Form(None)
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = prepare_upload_filename(first_file.filename or "upload", content, default_stem="lab_upload").lower()

    # Fayl turi tekshiruvi
    if not validate_file_type(fname, content):
        raise HTTPException(status_code=400, detail=f"Ruxsat etilmagan fayl turi: {fname}")

    analyse_file_path = save_analyse_file(content, fname)

    # Lab analyse yozuvini yaratish (status=0 — kutmoqda)
    import datetime
    lab_analyse = create_lab_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=analyse_file_path,
        analysis_date=datetime.datetime.fromisoformat(analysis_date.replace("Z", "+00:00")) if analysis_date else None
    )

    # Shifokorlarni bog'lash
    if doctor_id:
        for d_id in doctor_id:
            await create_lab_analyse_doctor(session=db, lab_analyse_id=lab_analyse.id, doctor_id=d_id)

    # Kategoriyalarni bog'lash
    if lab_category_id:
        for c_id in lab_category_id:
            await create_lab_analyse_category(session=db, lab_analyse_id=lab_analyse.id, category_id=c_id)

    # ── Fon rejimida AI ishga tushirish (browser yopilsa ham davom etadi) ────
    task = asyncio.create_task(
        _lab_ai_background(lab_analyse.id, content, fname, age, gender, lang)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    # Darhol javob qaytarish — frontend formani tozalaydi, list sahifasidan natija ko'rinadi
    return JSONResponse(content={
        "lab_id": lab_analyse.id,
        "status": "processing",
        "analyse_file_path": analyse_file_path
    })
