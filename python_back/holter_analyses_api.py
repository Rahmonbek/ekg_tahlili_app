import asyncio
import logging
import os
import io
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from holter_analyse_doctors import create_holter_analyse_doctor
from database import get_db, SessionLocal
from holter_analyse import create_holter_analyse, update_holter_analyse

from openai import OpenAI
from config import OPENAI_API_KEY
from auth_middleware import verify_token
from file_validator import validate_file_type

logger = logging.getLogger(__name__)
_bg_tasks: set = set()
BASE_DIR = Path(__file__).parent  # Loyihangiz papkasi


router = APIRouter(
    prefix="/holter",
    tags=["Holter Analyses"]
)

UPLOAD_DIR1 = BASE_DIR / "uploads" / "holter_analyse_files"
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
    return f"/uploads/holter_analyse_files/{safe_name}"

def openai_upload_file(api_key: str, file_bytes: bytes, filename: str = "holter.png") -> str:
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
    Sizga bemorda olingan va shifokor tomonidan tayyorlangan holter natijasi fayli va bemor ma'lumotlari berildi. 
    
❗️JAVOB QOIDALARI:
- Javob FAQAT quyida berilgan JSON formatida bo'lsin
- JSON dan tashqarida hech qanday izoh, sharh yoki qo'shimcha matn YOZILMASIN
- Javobni {language} tilida taqdim et
- Holter natijasini tahlil qiling va quyidagi bo'limlarni to'ldiring:

### JSON SHABLONI (QAT'IY SAQLANSIN):

{"""{
  "automatic_analysis": "Holter natijasi faylining tahlili",
   "automatic_analysis_bool": "Holat jiddiyligi darajasi: 1 = yengil, 2 = o'rtacha, 3 = og'ir",
   "final_summary": "Tibbiy asoslangan yakuniy xulosa"
}"""}

---

### QO'SHIMCHA TALABLAR:
- "automatic_analysis_bool" bo'limida faqat 1 yoki 2 yoki 3 sonlari bo'lsin ortiqcha narsa kerak emas 

❗️Javob FAQAT JSON bo'lsin va {language} tilida bo'lsin
    """
    return prompt_header

# ─── Sinxron OpenAI chaqiruvi ────────────────────────────────────────────────
def _sync_holter_openai(content: bytes, fname: str, age: int, gender: str, lang: str) -> dict:
    client = OpenAI(api_key=OPENAI_API_KEY)
    fobj = io.BytesIO(content)
    fobj.name = fname
    uploaded = client.files.create(file=fobj, purpose="user_data")
    file_id = uploaded.id

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
async def _holter_ai_background(
    analyse_id: int,
    content: bytes,
    fname: str,
    age: int,
    gender: str,
    lang: str
) -> None:
    db = SessionLocal()
    try:
        parsed = await asyncio.to_thread(_sync_holter_openai, content, fname, age, gender, lang)

        automatic_analysis_text = parsed.get("automatic_analysis", "") if isinstance(parsed, dict) else ""
        final_summary = parsed.get("final_summary", "") if isinstance(parsed, dict) else ""
        try:
            automatic_analysis_bool = int(parsed.get("automatic_analysis_bool", 0)) if isinstance(parsed, dict) else 0
        except (ValueError, TypeError):
            automatic_analysis_bool = 0

        ai_data_str = json.dumps({
            "automatic_analysis": automatic_analysis_text,
            "final_summary": final_summary,
            "automatic_analysis_bool": automatic_analysis_bool
        }, ensure_ascii=False)

        update_holter_analyse(session=db, analyse_id=analyse_id, status=2, ai_answer_data=ai_data_str)
        logger.info("Holter AI muvaffaqiyatli: analyse_id=%d", analyse_id)

    except Exception as exc:
        logger.error("Holter AI fon xatolik analyse_id=%d: %s", analyse_id, exc)
        try:
            update_holter_analyse(session=db, analyse_id=analyse_id, status=-1, ai_answer_data=str(exc))
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
    created_doctor_id: int = Form(...),
    main_doctor_id: int = Form(...),
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

    if not validate_file_type(fname, content):
        raise HTTPException(status_code=400, detail=f"Ruxsat etilmagan fayl turi: {fname}")

    analyse_file_path = save_analyse_file(content, fname)

    import datetime
    holter_analyse = create_holter_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        main_doctor_id=main_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=analyse_file_path,
        analysis_date=datetime.datetime.fromisoformat(analysis_date.replace("Z", "+00:00")) if analysis_date else None
    )

    if doctor_id:
        for d_id in doctor_id:
            await create_holter_analyse_doctor(session=db, holter_analyse_id=holter_analyse.id, doctor_id=d_id)

    # ── Fon rejimida AI ──────────────────────────────────────────────────────
    task = asyncio.create_task(
        _holter_ai_background(holter_analyse.id, content, fname, age, gender, lang)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    return JSONResponse(content={
        "holter_id": holter_analyse.id,
        "status": "processing",
        "analyse_file_path": analyse_file_path
    })