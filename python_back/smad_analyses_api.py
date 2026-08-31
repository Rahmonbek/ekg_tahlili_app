import asyncio
import ai_config
import logging
import os
import io
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from smad_analyse_doctors import create_smad_analyse_doctor
from smad_analyse import get_smad_analyse_by_id, create_smad_analyse, update_smad_analyse
from openai import OpenAI
from config import OPENAI_API_KEY
from auth_middleware import verify_token
from file_validator import prepare_upload_filename, validate_file_type, validate_upload, FileValidationError
import ai_errors
import ai_result_guard
import storage
import reference_validator
import ai_schema
import duplicate_guard
from document_classifier import (
    classify_document,
    STATUS_DONE,
    STATUS_ERROR,
    STATUS_FILE_MISMATCH,
)

logger = logging.getLogger(__name__)
_bg_tasks: set = set()
BASE_DIR = Path(__file__).parent  # Loyihangiz papkasi


router = APIRouter(
    prefix="/smad",
    tags=["Smad Analyses"]
)

UPLOAD_DIR1 = BASE_DIR / "uploads" / "smad_analyse_files"
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
    """Faylni yagona saqlash ildiziga yozadi (T-099).

    Ilgari fayl loyiha papkasi ichiga (`python_back/uploads/`) va asl nomi
    bilan yozilardi. Endi `STORAGE_ROOT` (kod tashqarisida) ostiga,
    sana bo'yicha papkalarga va UUID nomi bilan saqlanadi — asl nom
    bemor ismini oshkor qilishi mumkin edi.
    """
    return storage.save("smad", filename, file_bytes)

def openai_upload_file(api_key: str, file_bytes: bytes, filename: str = "smad.png") -> str:
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
    Sizga bemorda olingan va shifokor tomonidan tayyorlangan smad natijasi fayli va bemor ma'lumotlari berildi. 
    
❗️JAVOB QOIDALARI:
- Javobni {language} tilida taqdim et
- Smad natijasini tahlil qiling va quyidagi bo'limlarni to'ldiring:


### JAVOB MAZMUNI:

Javob tuzilishi qat'iy sxema bilan belgilangan — maydonlarni o'zing
o'ylab topma. Har bir maydonga nima yozish kerakligi quyida:

- "digital_measurements" — yozuvdan o'qib olingan raqamli ko'rsatkichlar:
  sutkalik/kunduzgi/tungi o'rtacha SBP va DBP, maksimal va minimal bosim,
  sistolik va diastolik yuk indekslari, tungi pasayish darajasi va tungi
  profil turi (dipper / non-dipper / over-dipper / night-peaker),
  o'rtacha yurak urish tezligi.
  Fayldan aniqlab bo'lmagan har bir ko'rsatkichga `null` ber. TAXMIN QILMA.

- "automatic_analysis" — aniqlangan patologik holatlar va kasalliklar.
- "AI_recommendations" — oddiy tilda tavsiya: qaysi qo'shimcha tekshiruv
  kerak, shifokorga qachon murojaat qilish kerak, turmush tarzi bo'yicha
  ko'rsatma. **Bu maydon hech qachon bo'sh qolmasin** — patologiya
  topilmasa profilaktik tavsiya yoz.
- "final_summary" — tibbiy asoslangan yakuniy xulosa.
- "automatic_analysis_bool" — 1 (normal), 2 (e'tibor talab qiladi) yoki
  3 (shoshilinch).
- "analiz_mumkinmi" — fayl tahlilga yaroqsiz bo'lsa `false`, sababini
  "analiz_mumkin_emas_sababi" ga yoz va "automatic_analysis_bool" ni
  `null` qoldir.

❗️Javob FAQAT JSON bo'lsin va {language} tilida bo'lsin
    """
    return prompt_header

# ─── Sinxron OpenAI chaqiruvi ────────────────────────────────────────────────
def _sync_smad_openai(content: bytes, fname: str, age: int, gender: str, lang: str) -> dict:
    client = OpenAI(api_key=OPENAI_API_KEY)
    fname = prepare_upload_filename(fname, content, default_stem="smad_upload").lower()
    fobj = io.BytesIO(content)
    fobj.name = fname
    uploaded = client.files.create(file=fobj, purpose="user_data")
    file_id = uploaded.id

    is_image = fname.endswith(('.png', '.jpg', '.jpeg'))
    ai_type = "input_image" if is_image else "input_file"
    prompt = compose_prompt_for_openai(age, gender, lang)

    # `text` orqali JSON Schema beriladi — model maydonlarni tashlab
    # keta olmaydi va javobni ``` ichiga o'rab yubormaydi (T-031, T-032)
    resp = client.responses.create(
        # Model va fikrlash chuqurligi bitta joyda (A-11)
        **ai_config.diagnosis_request(),
        input=[{
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt},
                {"type": ai_type, "file_id": file_id}
            ]
        }],
        text=ai_schema.response_format("smad"),
    )
    try:
        return json.loads(resp.output_text)
    except Exception:
        logger.warning(
            "SMAD: javobni JSON sifatida o'qib bo'lmadi, xom matn saqlanadi"
        )
        return {"raw": resp.output_text}


# ─── Fon rejimidagi AI tahlil ─────────────────────────────────────────────────
async def _smad_ai_background(
    analyse_id: int,
    content: bytes,
    fname: str,
    age: int,
    gender: str,
    lang: str
) -> None:
    db = SessionLocal()
    try:
        # Fayl SMAD tahliliga mos kelishini asosiy tahlildan oldin tekshirish.
        # Mos kelmasa qimmat tahlil umuman yuborilmaydi.
        mismatch = await asyncio.to_thread(
            classify_document, content, fname, "smad"
        )
        if mismatch:
            update_smad_analyse(
                session=db,
                analyse_id=analyse_id,
                status=STATUS_FILE_MISMATCH,
                ai_answer_data=mismatch.to_ai_answer(lang),
            )
            logger.info(
                "SMAD: fayl turi mos emas (aniqlangan=%s), tahlil to'xtatildi: analyse_id=%d",
                mismatch.detected, analyse_id,
            )
            return

        parsed = await asyncio.to_thread(_sync_smad_openai, content, fname, age, gender, lang)

        # Sxema barcha maydonlarni kafolatlaydi; `normalize` ularni
        # bazaga yoziladigan ko'rinishga keltiradi va tahlil imkonsiz
        # bo'lganda jiddiylik darajasini olib tashlaydi
        ai_data_str = json.dumps(
            ai_schema.normalize(parsed), ensure_ascii=False
        )


        # AI matnda "tahlil qilib bo'lmadi" desa ham jiddiylik

        # darajasiga 1 (= yashil "Normal") qo'yib yuborishi mumkin.

        # Guard shunday holatda darajani olib tashlaydi (T-092).

        ai_data_str = ai_result_guard.sanitize(ai_data_str, analyse_id, "smad")

        update_smad_analyse(session=db, analyse_id=analyse_id, status=STATUS_DONE, ai_answer_data=ai_data_str)
        logger.info("SMAD AI muvaffaqiyatli: analyse_id=%d", analyse_id)

    except Exception as exc:
        logger.error("SMAD AI fon xatolik analyse_id=%d [%s]: %s",
                     analyse_id, ai_errors.classify(exc), ai_errors.log_message(exc))
        try:
            update_smad_analyse(
                session=db,
                analyse_id=analyse_id,
                status=STATUS_ERROR,
                # Xom istisno matni EMAS — turkumlangan, tarjima qilingan xabar.
                # Xom matn faqat yuqoridagi logger.error() ga tushadi.
                ai_answer_data=ai_errors.to_ai_answer(exc, lang),
            )
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
    analysis_date: str | None = Form(None),
    # Foydalanuvchi takror haqidagi ogohlantirishni ko'rib, ataylab davom
    # etishni tanlaganda frontend buni `true` qilib yuboradi (T-096)
    force_duplicate: bool = Form(False),
    # Asl fayl nomi. .NET proksisi uni alohida yuboradi, chunki
    # multipart dagi nom ASCII ga tozalanadi va kirill nomlar
    # butunlay yo'qolib ketardi (T-101).
    original_filename: str | None = Form(None)
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    first_file: UploadFile = file[0]
    content = await first_file.read()
    fname = prepare_upload_filename(first_file.filename or "upload", content, default_stem="smad_upload").lower()

    # Fayl turi, hajmi va (rasm bo'lsa) sifati tekshiriladi.
    # Yozuv yaratilishidan OLDIN — foydalanuvchi darhol aniq xabar oladi.
    try:
        validate_upload(fname, content, "smad", lang)
    except FileValidationError as file_exc:
        raise HTTPException(status_code=400, detail=file_exc.message)

    # Bog'lanishlarni OLDINDAN tekshiramiz (chala yozuv qolmasligi uchun)
    try:
        reference_validator.validate_analysis_refs(
            db,
            patcient_id=patcient_id,
            clinic_id=clinic_id,
            created_doctor_id=created_doctor_id,
            doctor_ids=doctor_id,
            main_doctor_id=main_doctor_id,
        )
    except reference_validator.ReferenceError as ref_exc:
        raise HTTPException(status_code=400, detail=str(ref_exc))

    # Aynan shu mazmunli fayl shu bemorga allaqachon yuklanganmi?
    # Tekshiruv fayl diskka yozilishidan va yozuv yaratilishidan
    # OLDIN — takror bo'lsa hech narsa qoldirmasdan to'xtaydi.
    file_digest = duplicate_guard.check(
        db, "smad", patcient_id, content, force_duplicate
    )

    analyse_file_path = save_analyse_file(content, fname)

    import datetime
    smad_analyse = create_smad_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        main_doctor_id=main_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=analyse_file_path,
        analysis_date=datetime.datetime.fromisoformat(analysis_date.replace("Z", "+00:00")) if analysis_date else None
    )

    smad_analyse.file_hash = file_digest
    # Diskdagi nom UUID (T-099); asl nom saqlanadi va faylni
    # yuklab olishda foydalanuvchiga o'sha nom taklif qilinadi (T-101)
    smad_analyse.original_filename = (original_filename or first_file.filename or "")[:255] or None
    # AI qaysi tilda javob berishi shu yerda qayd etiladi: natija
    # boshqa tilli shifokorga ochilganda sababi tushunarli bo'lsin (T-059)
    smad_analyse.ai_lang = (lang or 'uz')[:5]
    db.commit()

    if doctor_id:
        for d_id in doctor_id:
            await create_smad_analyse_doctor(session=db, smad_analyse_id=smad_analyse.id, doctor_id=d_id)

    # ── Fon rejimida AI ──────────────────────────────────────────────────────
    task = asyncio.create_task(
        _smad_ai_background(smad_analyse.id, content, fname, age, gender, lang)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    return JSONResponse(content={
        "smad_id": smad_analyse.id,
        "status": "processing",
        "analyse_file_path": analyse_file_path
    })


@router.post("/replace-file")
async def replace_file(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    id: int = Form(...),
    file: UploadFile = File(...),
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...),
):
    """Mavjud SMAD tahlilining faylini almashtirib, qayta tahlil qilish.

    Foydalanuvchi noto'g'ri fayl yuklaganda (masalan boshqa turdagi hujjat)
    yangi tahlil yaratmasdan, o'sha yozuvning faylini almashtirish imkonini beradi.
    Bemor, shifokorlar va boshqa bog'lanishlar saqlanib qoladi.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    analyse = get_smad_analyse_by_id(db, id)
    if not analyse:
        raise HTTPException(status_code=404, detail="Tahlil topilmadi")

    content = await file.read()
    fname = prepare_upload_filename(
        file.filename or "upload", content, default_stem="smad_upload"
    ).lower()

    # Fayl turi, hajmi va (rasm bo'lsa) sifati tekshiriladi.
    # Yozuv yaratilishidan OLDIN — foydalanuvchi darhol aniq xabar oladi.
    try:
        validate_upload(fname, content, "smad", lang)
    except FileValidationError as file_exc:
        raise HTTPException(status_code=400, detail=file_exc.message)

    if not content:
        raise HTTPException(status_code=400, detail="Yuklangan fayl bo'sh")

    analyse_file_path = save_analyse_file(content, fname)

    # Yozuvni qayta tahlilga tayyorlash: eski AI natijasi tozalanadi
    update_smad_analyse(
        session=db,
        analyse_id=id,
        status=0,
        analyse_file_link=analyse_file_path,
        clear_ai_answer=True,
    )

    task = asyncio.create_task(
        _smad_ai_background(id, content, fname, age, gender, lang)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    logger.info("SMAD: fayl almashtirildi va qayta tahlilga yuborildi: analyse_id=%d", id)

    return JSONResponse(content={
        "smad_id": id,
        "status": "processing",
        "analyse_file_path": analyse_file_path,
    })


@router.post("/retry")
async def retry_analyse(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    id: int = Form(...),
    gender: str = Form("erkak"),
    lang: str = Form("uz"),
    age: int = Form(0),
):
    """Xatolik bilan tugagan tahlilni MAVJUD fayl bilan qayta ishga tushirish.

    Nima uchun kerak (T-044): ilgari `status = -1` yozuvida foydalanuvchida
    hech qanday harakat imkoniyati yo'q edi — yozuv ro'yxatda abadiy
    "Xatolik" bo'lib turardi va yagona yechim uni o'chirib, bemor,
    shifokorlar va shikoyatlarni qaytadan kiritish edi.

    Fayl almashtirilmaydi — o'sha faylning o'zi qayta yuboriladi. Fayl
    noto'g'ri bo'lsa `/replace-file` ishlatiladi.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    analyse = get_smad_analyse_by_id(db, id)
    if not analyse:
        raise HTTPException(status_code=404, detail="Tahlil topilmadi")

    link = getattr(analyse, "analyse_file_link", None) or getattr(analyse, "AnalyseFileLink", None)
    path = storage.resolve_existing(link)
    if path is None:
        raise HTTPException(
            status_code=400,
            detail="Tahlil fayli topilmadi. Faylni qaytadan yuklang.",
        )

    content = path.read_bytes()
    fname = path.name

    # Yozuvni qayta tahlilga tayyorlash: eski xatolik matni tozalanadi
    update_smad_analyse(
        session=db,
        analyse_id=id,
        status=0,
        clear_ai_answer=True,
    )

    task = asyncio.create_task(
        _smad_ai_background(id, content, fname, age, gender, lang)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    logger.info("SMAD: qayta tahlilga yuborildi: analyse_id=%d", id)

    return JSONResponse(content={"smad_id": id, "status": "processing"})
