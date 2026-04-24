import os
import io
import json
import base64
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from lab_analyse_categories import create_lab_analyse_category
from lab_analyse import create_lab_analyse, update_lab_analyse
from lab_analyse_doctors import create_lab_analyse_doctor
from openai import OpenAI
from config import OPENAI_API_KEY, OPENAI_MODEL
from auth_middleware import verify_token
from file_validator import validate_file_type
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
- Javob FAQAT quyida berilgan JSON formatida bo‘lsin
- JSON dan tashqarida hech qanday izoh, sharh yoki qo‘shimcha matn YOZILMASIN
- Javobni {language} tilida taqdim et
- Laboratoriya natijasini tahlil qiling va quyidagi bo‘limlarni to‘ldiring:
- Laboratoriya faylidagi quyidagi parametrlardan qaysi birlarini qiymatini aniqlash mumkin bo‘lsa, ularni aniqlang va qiymatlarini yozing. Parametrlar:
hb - Gemoglobin – qonda kislorod tashuvchi oqsil (g/L)
rbc - Qizil qon hujayralari soni (x10¹²/L)
wbc - Oq qon hujayralari soni (x10⁹/L)
plt - Qon trombotsitlari soni (x10⁹/L)
hct - Gematokrit – qondagi qizil qon hujayralari foizi (%)
mcv - O‘rtacha eritrosit hajmi (fL)
mch - O‘rtacha gemoglobin miqdori eritrositda (pg)
mchc - O‘rtacha gemoglobin kontsentratsiyasi eritrositda (g/L)
esr - Erythrocyte Sedimentation Rate – qizil qon hujayralari cho‘kishi (mm/soat)
glucose - Qonda glyukoza darajasi (mmol/L)
cholesterol - Qonda xolesterol darajasi (mmol/L)
alt - Alanin aminotransferaza – jigar fermenti (U/L)
ast - Aspartat aminotransferaza – jigar/miya fermenti (U/L)
bilirubin_total - Jami bilirubin – jigar funksiyasi (µmol/L)
bilirubin_direct - To‘g‘ridan-to‘g‘ri bilirubin (µmol/L)
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

### JSON SHABLONI (QAT’IY SAQLANSIN):

{"""{
  "digital_measurements": {
    "hb": {"value": , "unit": "g/L"},
    
  },

  "automatic_analysis": "Labaratoriya natijasi faylidagi mavjud parametrlardan qaysilari normada emas ekanligi yozilsin. Normasi qancha bo'lishini yozma. Parametrlardan qaysilarini aniqlab bo'lmasligi haqida ham yozma. Agar hech qanday parametr aniqlanmasa shunchaki labaratoriya faylini tahlil qil.",

  "automatic_analysis_bool": "Holat jiddiyligi darajasi: 1 = yengil, 2 = o‘rtacha, 3 = og‘ir",
   "final_summary": "Tibbiy asoslangan yakuniy xulosa"
}"""}

---

### QO‘SHIMCHA TALABLAR:
- "automatic_analysis_bool" bo'limida faqat 1 yoki 2 yoki 3 sonlari bo'lsin ortiqcha narsa kerak emas 
- "digital_measurements" bo'limida fayldan aniqlash mumkin bo‘lgan barcha parametrlar yozilsin
- "digital_measurements" har bir parametrni qiymatini faqat {"""{"value": , "unit": ""}"""} shu formatda yozilsin

❗️Javob FAQAT JSON bo‘lsin va {language} tilida bo'lsin
    """
    return prompt_header

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
    fname = (first_file.filename or "upload").lower()

    # Fayl turi tekshiruvi
    if not validate_file_type(fname, content):
        raise HTTPException(status_code=400, detail=f"Ruxsat etilmagan fayl turi: {fname}")

    is_image = fname.endswith(('.png','.jpg','.jpeg'))
    analyse_file_path = save_analyse_file(content, fname)

    # Lab analyse yozuvini yaratish
    lab_analyse = create_lab_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=analyse_file_path,
        analysis_date=__import__("datetime").datetime.fromisoformat(analysis_date.replace("Z", "+00:00")) if analysis_date else None
    )
    if doctor_id:
        for d_id in doctor_id:
            await create_lab_analyse_doctor(
                session=db,
                lab_analyse_id=lab_analyse.id,
                doctor_id=d_id
            )
    # Lab categories bog'lash
    if lab_category_id:
        for c_id in lab_category_id:
            await create_lab_analyse_category(session=db, lab_analyse_id=lab_analyse.id, category_id=c_id)

    # OpenAI file upload
    try:
        file_id = openai_upload_file(OPENAI_API_KEY, content, filename=fname)
    except Exception as e:
        return JSONResponse(content={"error": f"OpenAI upload failed: {e}"})

    prompt = compose_prompt_for_openai(age, gender, lang)
    ai_error = False
    parsed = {}

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        ai_type="input_image"
        if not is_image:
            ai_type="input_file"
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
        content_out = resp.output_text
        try:
            parsed = json.loads(content_out)
        except Exception:
            parsed = {"raw": content_out}

        status_to_save = 2
        print(parsed)
        digital_measurements = {}
        automatic_analysis_text = None
        automatic_analysis_bool = None
        final_summary = None

        if isinstance(parsed, dict):    
            digital_measurements = parsed.get("digital_measurements", {})
            automatic_analysis_text = parsed.get("automatic_analysis", "")
            final_summary = parsed.get("final_summary", "")
            try:
                automatic_analysis_bool = int(parsed.get("automatic_analysis_bool", 0))
            except (ValueError, TypeError):
                automatic_analysis_bool = 0
        digital_values = {}
        ai_data_to_save = {
            "automatic_analysis": automatic_analysis_text,
            "final_summary": final_summary,
            "automatic_analysis_bool": automatic_analysis_bool
        }
        ai_answer_data_str = json.dumps(ai_data_to_save, ensure_ascii=False)
        for k, v in digital_measurements.items():
            if isinstance(v, dict) and "value" in v:
                digital_values[k] = v["value"]
        # Bazaga yozish
        update_lab_analyse(
            session=db,
            analyse_id=lab_analyse.id,
            status=status_to_save,
            ai_answer_data=ai_answer_data_str,  # endi faqat AI tahlil matni
            **digital_values
        )

    except Exception as e:
        ai_error = True
        status_to_save = -1
        update_lab_analyse(
            session=db,
            analyse_id=lab_analyse.id,
            status=status_to_save,
            ai_answer_data=str(e)
        )

    return JSONResponse(content={
        "lab_id": lab_analyse.id,
        "ai_response": parsed,
        "ai_error": ai_error,
        "analyse_file_path": analyse_file_path
    })