import asyncio
import ai_config
import ai_schema
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
from lab_analyse import get_lab_analyse_by_id, create_lab_analyse, update_lab_analyse
from lab_analyse_doctors import create_lab_analyse_doctor
from openai import OpenAI
from config import OPENAI_API_KEY
from auth_middleware import verify_token
from file_validator import prepare_upload_filename, validate_file_type, validate_upload, FileValidationError
import ai_errors
import ai_result_guard
import storage
import reference_validator
import duplicate_guard
from document_classifier import (
    classify_document,
    STATUS_DONE,
    STATUS_ERROR,
    STATUS_FILE_MISMATCH,
)

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
    """Faylni yagona saqlash ildiziga yozadi (T-099).

    Ilgari fayl loyiha papkasi ichiga (`python_back/uploads/`) va asl nomi
    bilan yozilardi. Endi `STORAGE_ROOT` (kod tashqarisida) ostiga,
    sana bo'yicha papkalarga va UUID nomi bilan saqlanadi — asl nom
    bemor ismini oshkor qilishi mumkin edi.
    """
    return storage.save("lab", filename, file_bytes)

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

### MAYDONLAR

Javob shakli qat'iy JSON sxema bilan belgilangan (A-7) — shablon
yozishning hojati yo'q. Har bir maydonga nima yozilishi:

- **digital_measurements** — fayldan o'qib olingan ko'rsatkichlar
  ro'yxati. Har bir element: `column_name` (yuqoridagi ro'yxatdan),
  `value` (raqam) va `unit` (birlik).
  ❗️FAQAT faylda haqiqatan bor ko'rsatkichlarni yoz. Yo'q
  ko'rsatkichni ro'yxatga QO'SHMA — qiymatini taxmin qilish tibbiy
  xato demakdir. Raqamni o'qib bo'lmasa `value` ni `null` qoldir.

- **automatic_analysis** — qaysi ko'rsatkichlar normada emasligi.
  Normaning o'zini yozma. Aniqlab bo'lmagan parametrlar haqida yozma.

- **automatic_analysis_bool** — 1 = normal (barcha ko'rsatkichlar
  norma ichida), 2 = e'tibor talab qiladi (chetlanish bor, shoshilinch
  emas), 3 = shoshilinch. Chetlanish topilgan bo'lsa 1 QO'YMA.

- **AI_recommendations** — oddiy tilda: qaysi qo'shimcha tekshiruv,
  qaysi mutaxassis, ovqatlanish va turmush tarzi. Barcha ko'rsatkich
  normada bo'lsa ham profilaktik tavsiya yoz — bu maydon bo'sh
  qolmasin.

- **final_summary** — tibbiy asoslangan yakuniy xulosa.

❗️Matnli maydonlar {language} tilida bo'lsin
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
        # Model va fikrlash chuqurligi bitta joyda (A-11)
        **ai_config.diagnosis_request(),
        input=[{
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt},
                {"type": ai_type, "file_id": file_id}
            ]
        }],
        # Qat'iy JSON sxema (A-7). Ko'rsatkichlar massiv sifatida
        # qaytadi va `column_name` `enum` bilan cheklangan — model
        # mavjud bo'lmagan ustun nomini o'ylab topa olmaydi.
        text=ai_schema.response_format("lab"),
    )
    try:
        return json.loads(resp.output_text)
    except Exception:
        return {"raw": resp.output_text}


def _measurements_to_dict(raw) -> dict:
    """Ko'rsatkichlarni bir xil lug'at ko'rinishiga keltiradi (A-7).

    Kirish ikki xil bo'lishi mumkin:

    * **massiv** — yangi qat'iy sxema natijasi:
      ``[{"column_name": "hb", "value": 142, "unit": "g/L"}, ...]``
    * **lug'at** — sxemasiz eski javoblar:
      ``{"hb": {"value": 142, "unit": "g/L"}}``

    Chiqish har doim lug'at, chunki bazaga yozish, frontend va PDF
    shu shaklga tayanadi.

    Qiymati `null` bo'lgan yozuvlar **tushirib qoldiriladi**: model
    ko'rsatkichni topgan, lekin o'qiy olmagan degani — bunday qatorni
    ekranda ko'rsatish shifokorni chalg'itadi.
    """
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, list):
        return {}

    out = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = item.get("column_name")
        value = item.get("value")
        if not name or value is None:
            continue
        # Sxemadagi `enum` buni kafolatlaydi, lekin sxemasiz zaxira
        # yo'lda ham xavfsiz bo'lishi kerak
        if name not in ai_schema.LAB_COLUMNS:
            logger.warning("Lab: noma'lum ko'rsatkich o'tkazib yuborildi: %s", name)
            continue
        out[name] = {"value": value, "unit": item.get("unit")}
    return out


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
        # Fayl laboratoriya tahliliga mos kelishini asosiy tahlildan oldin tekshirish.
        # Mos kelmasa qimmat tahlil umuman yuborilmaydi va natija "baholanmagan" bo'lib qoladi.
        mismatch = await asyncio.to_thread(
            classify_document, content, fname, "laboratoriya"
        )
        if mismatch:
            update_lab_analyse(
                session=db,
                analyse_id=analyse_id,
                status=STATUS_FILE_MISMATCH,
                ai_answer_data=mismatch.to_ai_answer(lang),
            )
            logger.info(
                "Lab: fayl turi mos emas (aniqlangan=%s), tahlil to'xtatildi: analyse_id=%d",
                mismatch.detected, analyse_id,
            )
            return

        parsed = await asyncio.to_thread(_sync_lab_openai, content, fname, age, gender, lang)

        # Sxema bo'yicha `digital_measurements` — massiv (A-7). Qolgan
        # kod (bazaga yozish, frontend, PDF) lug'at kutadi, shuning
        # uchun shu yerda o'giriladi. Eski, sxemasiz javoblar lug'at
        # bo'lib kelishi mumkin — ular ham qo'llab-quvvatlanadi.
        digital_measurements = _measurements_to_dict(
            parsed.get("digital_measurements") if isinstance(parsed, dict) else None
        )
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
            # Ko'rsatkichlar ilgari faqat `lab_analyses` ustunlariga yozilardi
            # va natija sahifasida umuman ko'rinmasdi
            "digital_measurements": digital_measurements,
            "automatic_analysis": automatic_analysis_text,
            "AI_recommendations": (
                parsed.get("AI_recommendations", "") if isinstance(parsed, dict) else ""
            ),
            "final_summary": final_summary,
            "automatic_analysis_bool": automatic_analysis_bool
        }, ensure_ascii=False)

        # AI matnda "tahlil qilib bo'lmadi" desa ham jiddiylik
        # darajasiga 1 (= yashil "Normal") qo'yib yuborishi mumkin.
        # Guard shunday holatda darajani olib tashlaydi (T-092).
        ai_data_str = ai_result_guard.sanitize(ai_data_str, analyse_id, "lab")

        update_lab_analyse(
            session=db,
            analyse_id=analyse_id,
            status=STATUS_DONE,
            ai_answer_data=ai_data_str,
            **digital_values
        )
        logger.info("Lab AI muvaffaqiyatli: analyse_id=%d", analyse_id)

    except Exception as exc:
        logger.error("Lab AI fon xatolik analyse_id=%d [%s]: %s",
                     analyse_id, ai_errors.classify(exc), ai_errors.log_message(exc))
        try:
            update_lab_analyse(
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
    lab_category_id: list[int] | None = Form(None),
    created_doctor_id: int = Form(...),
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
    fname = prepare_upload_filename(first_file.filename or "upload", content, default_stem="lab_upload").lower()

    # Fayl turi tekshiruvi
    # Fayl turi, hajmi va (rasm bo'lsa) sifati tekshiriladi.
    # Yozuv yaratilishidan OLDIN — foydalanuvchi darhol aniq xabar oladi.
    try:
        validate_upload(fname, content, "lab", lang)
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
            lab_category_ids=lab_category_id,
        )
    except reference_validator.ReferenceError as ref_exc:
        raise HTTPException(status_code=400, detail=str(ref_exc))

    # Aynan shu mazmunli fayl shu bemorga allaqachon yuklanganmi?
    # Tekshiruv fayl diskka yozilishidan va yozuv yaratilishidan
    # OLDIN — takror bo'lsa hech narsa qoldirmasdan to'xtaydi.
    file_digest = duplicate_guard.check(
        db, "lab", patcient_id, content, force_duplicate
    )

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

    lab_analyse.file_hash = file_digest
    # Diskdagi nom UUID (T-099); asl nom saqlanadi va faylni
    # yuklab olishda foydalanuvchiga o'sha nom taklif qilinadi (T-101)
    lab_analyse.original_filename = (original_filename or first_file.filename or "")[:255] or None
    # AI qaysi tilda javob berishi shu yerda qayd etiladi: natija
    # boshqa tilli shifokorga ochilganda sababi tushunarli bo'lsin (T-059)
    lab_analyse.ai_lang = (lang or 'uz')[:5]
    db.commit()

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
    """Mavjud Laboratoriya tahlilining faylini almashtirib, qayta tahlil qilish.

    Foydalanuvchi noto'g'ri fayl yuklaganda (masalan boshqa turdagi hujjat)
    yangi tahlil yaratmasdan, o'sha yozuvning faylini almashtirish imkonini beradi.
    Bemor, shifokorlar va boshqa bog'lanishlar saqlanib qoladi.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    analyse = get_lab_analyse_by_id(db, id)
    if not analyse:
        raise HTTPException(status_code=404, detail="Tahlil topilmadi")

    content = await file.read()
    fname = prepare_upload_filename(
        file.filename or "upload", content, default_stem="lab_upload"
    ).lower()

    # Fayl turi, hajmi va (rasm bo'lsa) sifati tekshiriladi.
    # Yozuv yaratilishidan OLDIN — foydalanuvchi darhol aniq xabar oladi.
    try:
        validate_upload(fname, content, "lab", lang)
    except FileValidationError as file_exc:
        raise HTTPException(status_code=400, detail=file_exc.message)

    if not content:
        raise HTTPException(status_code=400, detail="Yuklangan fayl bo'sh")

    analyse_file_path = save_analyse_file(content, fname)

    # Yozuvni qayta tahlilga tayyorlash: eski AI natijasi tozalanadi
    update_lab_analyse(
        session=db,
        analyse_id=id,
        status=0,
        analyse_file_link=analyse_file_path,
        clear_ai_answer=True,
    )

    task = asyncio.create_task(
        _lab_ai_background(id, content, fname, age, gender, lang)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    logger.info("Laboratoriya: fayl almashtirildi va qayta tahlilga yuborildi: analyse_id=%d", id)

    return JSONResponse(content={
        "lab_id": id,
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

    analyse = get_lab_analyse_by_id(db, id)
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
    update_lab_analyse(
        session=db,
        analyse_id=id,
        status=0,
        clear_ai_answer=True,
    )

    task = asyncio.create_task(
        _lab_ai_background(id, content, fname, age, gender, lang)
    )
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    logger.info("Laboratoriya: qayta tahlilga yuborildi: analyse_id=%d", id)

    return JSONResponse(content={"lab_id": id, "status": "processing"})
