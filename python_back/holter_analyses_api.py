import os
import io
import json
import base64
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from holter_analyse_doctors import create_holter_analyse_doctor
from database import get_db
from holter_analyse import create_holter_analyse, update_holter_analyse

from openai import OpenAI
BASE_DIR = Path(__file__).parent  # Loyihangiz papkasi
OPENAI_API_KEY = "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"
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY muhit o'zgaruvchisi topilmadi.")


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
- Javob FAQAT quyida berilgan JSON formatida bo‘lsin
- JSON dan tashqarida hech qanday izoh, sharh yoki qo‘shimcha matn YOZILMASIN
- Javobni {language} tilida taqdim et
- Holter natijasini tahlil qiling va quyidagi bo‘limlarni to‘ldiring:

### JSON SHABLONI (QAT’IY SAQLANSIN):

{"""{
  "automatic_analysis": "Holter natijasi faylining tahlili",
   "automatic_analysis_bool": "Holat jiddiyligi darajasi: 1 = yengil, 2 = o‘rtacha, 3 = og‘ir",
   "final_summary": "Tibbiy asoslangan yakuniy xulosa"
}"""}

---

### QO‘SHIMCHA TALABLAR:
- "automatic_analysis_bool" bo'limida faqat 1 yoki 2 yoki 3 sonlari bo'lsin ortiqcha narsa kerak emas 

❗️Javob FAQAT JSON bo‘lsin va {language} tilida bo'lsin
    """
    return prompt_header

@router.post("/analyze")
async def analyze(
    db: Session = Depends(get_db),
    doctor_id: list[int] | None = Form(None),
    file: list[UploadFile] = File(...),
    created_doctor_id: int = Form(...),
    main_doctor_id: int = Form(...),
    clinic_id: int = Form(...),
    patcient_id: int = Form(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...)
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = (first_file.filename or "upload").lower()
    is_image = fname.endswith(('.png','.jpg','.jpeg'))
    analyse_file_path = save_analyse_file(content, fname)

    # Lab analyse yozuvini yaratish
    holter_analyse = create_holter_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        main_doctor_id=main_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=analyse_file_path
    )
    if doctor_id:
        for d_id in doctor_id:
            await create_holter_analyse_doctor(
                session=db,
                holter_analyse_id=holter_analyse.id,
                doctor_id=d_id
            )

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
        automatic_analysis_text = None
        automatic_analysis_bool = None
        final_summary = None

        if isinstance(parsed, dict):    
            automatic_analysis_text = parsed.get("automatic_analysis", "")
            final_summary = parsed.get("final_summary", "")
            automatic_analysis_bool = parsed.get("automatic_analysis_bool", "")
        
        ai_data_to_save = {
            "automatic_analysis": automatic_analysis_text,
            "final_summary": final_summary,
            "automatic_analysis_bool": automatic_analysis_bool
        }
        ai_answer_data_str = json.dumps(ai_data_to_save, ensure_ascii=False)
        
        # Bazaga yozish
        update_holter_analyse(
            session=db,
            analyse_id=holter_analyse.id,
            status=status_to_save,
            ai_answer_data=ai_answer_data_str,  # endi faqat AI tahlil matni
            
        )

    except Exception as e:
        ai_error = True
        status_to_save = -1
        update_holter_analyse(
            session=db,
            analyse_id=holter_analyse.id,
            status=status_to_save,
            ai_answer_data=str(e)
        )

    return JSONResponse(content={
        "holter_id": holter_analyse.id,
        "ai_response": parsed,
        "ai_error": ai_error,
        "analyse_file_path": analyse_file_path
    })