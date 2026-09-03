"""Kompleks (ko'p tahlilli) AI xulosasi.

Nima qiladi
-----------
Bemorning bir nechta tahlilini (masalan ikkita EKG, bitta laboratoriya,
bitta SMAD va bitta Holter) BIRGALIKDA tahlil qiladi va yagona yakuniy
xulosa beradi. Alohida tahlillar allaqachon o'z AI natijasiga ega —
bu bosqichning vazifasi ularni bir-biriga bog'lash: dinamikani ko'rish
va modullar orasidagi klinik aloqalarni topish.

Rejim
-----
Kompleks tahlil DOIM ``deep`` rejimda bajariladi (loyiha egasining
qarori — interfeysda tanlov yo'q): AI ga har bir tahlilning tayyor
natijasi (raqamli o'lchovlar + xulosa matni) VA EKG rasm fayllari
yuboriladi (``ai_config.COMBINED_MAX_IMAGES`` tagacha, eng yangilari).

``summary`` qiymati faqat ESKI yozuvlarda uchraydi; kod yo'li ular
uchun saqlangan.

Nima uchun faqat EKG rasmlari qo'shiladi: Holter/SMAD/Lab PDF laridagi
foydali raqamlar allaqachon `digital_measurements` ga ajratib olingan
va ular baribir yuboriladi. 20 betlik PDF ni qayta yuborish o'nlab ming
token sarflaydi, ammo yangi ma'lumot bermaydi.

Yozuvni .NET yaratadi (`CombinedAnalysisController`), bu modul faqat
AI chaqiruvini bajaradi va natijani `combined_analyses` ga yozadi.
"""

import asyncio
import datetime
import io
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from openai import OpenAI

import ai_config
import ai_errors
import ai_result_guard
import ai_schema
import storage
from auth_middleware import verify_token
from config import OPENAI_API_KEY
from database import get_db, SessionLocal
from models import (
    CombinedAnalyses,
    CombinedAnalysisItems,
    ECGAnalyse,
    HolterAnalyses,
    LabAnalyses,
    SmadAnalyses,
)

logger = logging.getLogger(__name__)
_bg_tasks: set = set()

router = APIRouter(prefix="/combined", tags=["Combined Analyses"])

#: Tahlil turi -> (SQLAlchemy modeli, ko'rinadigan nomi)
_SOURCES = {
    "ecg": (ECGAnalyse, "EKG"),
    "holter": (HolterAnalyses, "Holter monitoring"),
    "smad": (SmadAnalyses, "SMAD (sutkalik arterial bosim)"),
    "lab": (LabAnalyses, "Laboratoriya"),
}

#: Bitta matn maydonining chegarasi. Alohida tahlil xulosalari odatda
#: bundan ancha qisqa; chegara faqat g'ayrioddiy uzun javoblardan
#: himoya qiladi (token byudjeti oldindan bashorat qilinadigan bo'lsin).
_MAX_FIELD_CHARS = 2000

#: Rasm fayllarining ruxsat etilgan kengaytmalari (`deep` rejim uchun)
_IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg", ".webp")


class CombinedAnalyzeRequest(BaseModel):
    combined_id: int
    lang: str = "uz"
    #: Standart `deep` — .NET har doim shuni yuboradi (rejim tanlovi
    #: interfeysdan olib tashlangan). `summary` faqat eski yozuvlarda
    #: uchraydi va kod yo'li moslik uchun saqlangan.
    mode: str = "deep"


# ─── Yordamchilar ────────────────────────────────────────────────────────────

def _clip(value, limit: int = _MAX_FIELD_CHARS):
    """Matnni chegaralaydi. Matn bo'lmasa qiymatni o'zgarishsiz qaytaradi."""
    if isinstance(value, str) and len(value) > limit:
        return value[:limit] + "…"
    return value


def _parse_ai(raw) -> dict:
    """`ai_answer_data` ustunini lug'atga aylantiradi.

    Ustun `jsonb` — drayver uni lug'at qilib qaytarishi ham, matn
    qoldirishi ham mumkin. Ikkala holat ham qo'llab-quvvatlanadi.
    """
    if isinstance(raw, dict):
        return raw
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _age_from(birth_date) -> int | None:
    if not birth_date:
        return None
    today = datetime.date.today()
    born = birth_date if isinstance(birth_date, datetime.date) else None
    if born is None:
        return None
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def _load_patient(db: Session, patient_id: int) -> dict:
    """Bemorning jinsi va tug'ilgan sanasi.

    Xom SQL: `patients` jadvali uchun Python tomonda model yo'q va uni
    qo'shish sxema mas'uliyatini ikkiga bo'lardi (loyiha qoidasi bo'yicha
    sxema manbasi — EF Core migratsiyalari).
    """
    row = db.execute(
        text("SELECT gender, birthdate FROM patients WHERE id = :id"),
        {"id": patient_id},
    ).fetchone()
    if not row:
        return {}

    gender, birth_date = row[0], row[1]
    return {
        "gender": "erkak" if gender else "ayol",
        "birth_date": birth_date.isoformat() if birth_date else None,
        "age": _age_from(birth_date),
    }


def _load_doctor_notes(db: Session, items) -> dict[tuple[str, int], str]:
    """Tanlangan tahlillarga shifokor(lar) yozgan xulosalar.

    Xom SQL: `analysis_diagnoses` .NET tomonida boshqariladi va Python
    tomonda modeli yo'q (sxema manbasi — EF Core migratsiyalari).

    Bitta so'rov: tahlil boshiga alohida so'rov yuborilsa, 10 ta tahlil
    uchun 10 ta borish-kelish bo'lardi.

    Kompleks xulosaning O'ZIGA yozilgan izohlar (`analysis_type =
    'combined'`) ATAYLAB olinmaydi — ular AI natijasidan KEYIN yoziladi
    va ularni kirishga qo'shish aylanma bog'liqlik yaratardi.
    """
    keys = [(i.analysis_type, i.analysis_id) for i in items
            if i.analysis_type in _SOURCES]
    if not keys:
        return {}

    rows = db.execute(
        text(
            "SELECT d.analysis_type, d.analysis_id, d.diagnosis_text, "
            "       coalesce(doc.lastname, '') AS last_name, "
            "       coalesce(doc.firstname, '') AS first_name "
            "FROM analysis_diagnoses d "
            "LEFT JOIN doctors doc ON doc.id = d.doctor_id "
            "WHERE (d.analysis_type, d.analysis_id) IN "
            "      (SELECT * FROM unnest(:types, :ids) AS x(t, i)) "
            "ORDER BY d.created_at"
        ),
        {"types": [k[0] for k in keys], "ids": [k[1] for k in keys]},
    ).fetchall()

    notes: dict[tuple[str, int], list[str]] = {}
    for a_type, a_id, note_text, last_name, first_name in rows:
        if not note_text or not note_text.strip():
            continue
        author = f"{last_name} {first_name}".strip() or "shifokor"
        notes.setdefault((a_type, a_id), []).append(f"{author}: {note_text.strip()}")

    return {key: " | ".join(value) for key, value in notes.items()}


def _build_dossier(db: Session, items) -> tuple[list[dict], list[tuple[str, bytes]]]:
    """Tanlangan tahlillardan AI uchun "dossier" quradi.

    Qaytaradi: (tahlillar ro'yxati, `deep` rejim uchun rasm fayllari).
    """
    entries: list[dict] = []
    # (bazadagi havola, tahlil sanasi) — sana bo'yicha saralab, eng
    # yangilari chegaraga tushadi; fayl mazmuni keyinroq o'qiladi
    images: list[tuple[str, datetime.datetime | None]] = []

    doctor_notes = _load_doctor_notes(db, items)

    for item in items:
        source = _SOURCES.get(item.analysis_type)
        if not source:
            continue
        model, label = source

        row = db.query(model).filter(model.id == item.analysis_id).first()
        if row is None:
            # Tahlil o'chirilgan — snapshot bor, lekin mazmun yo'q.
            # Uni AI ga yubormaymiz, xulosa qolgan tahlillar bo'yicha chiqadi.
            logger.warning(
                "Kompleks tahlil: manba topilmadi, o'tkazib yuborildi %s#%s",
                item.analysis_type, item.analysis_id,
            )
            continue

        ai = _parse_ai(row.ai_answer_data)
        when = row.analysis_date or row.created_at

        entry = {
            "no": len(entries) + 1,
            "type": item.analysis_type,
            "type_name": label,
            "date": when.date().isoformat() if when else None,
            "measurements": ai.get("digital_measurements"),
            "findings": _clip(ai.get("automatic_analysis")),
            "severity": ai.get("automatic_analysis_bool"),
            "recommendations": _clip(ai.get("AI_recommendations")),
            "summary": _clip(ai.get("final_summary")),
        }

        # Shifokorning SHU tahlilga yozgan xulosasi — AI ko'rmaydigan
        # klinik kontekst (bemor shikoyatlari, dorilar, kasallik tarixi).
        # Promptda u "tasdiqlangan tashxis emas" deb belgilangan —
        # anchoring effektining oldini olish uchun.
        #
        # Xulosa YO'Q bo'lsa kalit umuman qo'shilmaydi: `"doctor_note": null`
        # promptni behuda uzaytiradi va modelni chalg'itadi.
        note = doctor_notes.get((item.analysis_type, item.analysis_id))
        if note:
            entry["doctor_note"] = _clip(note)

        entries.append(entry)

        if item.analysis_type == "ecg":
            link = getattr(row, "analyse_file_link", None)
            if link and str(link).lower().endswith(_IMAGE_SUFFIXES):
                images.append((str(link), when))

    # Eng yangi rasmlar oldinda — chegaraga tushadiganlari aynan shular
    images.sort(key=lambda pair: pair[1] or datetime.datetime.min, reverse=True)
    limited = images[: ai_config.COMBINED_MAX_IMAGES]

    loaded_images: list[tuple[str, bytes]] = []
    for link, _ in limited:
        path = storage.resolve_existing(link)
        if path is None:
            logger.warning("Kompleks tahlil: EKG rasm fayli topilmadi: %s", link)
            continue
        try:
            loaded_images.append((path.name, path.read_bytes()))
        except OSError as exc:
            logger.warning("Kompleks tahlil: rasmni o'qib bo'lmadi %s: %s", link, exc)

    return entries, loaded_images


def _compose_prompt(lang: str) -> str:
    """O'ZGARMAS ko'rsatma bloki.

    Ataylab bemor ma'lumotlaridan ALOHIDA va so'rovda BIRINCHI turadi:
    provayder uzun o'zgarmas prefiksni keshlaydi, ya'ni takroriy
    chaqiruvlarda shu qism arzonlashadi.
    """
    language = {"uz": "O'ZBEK", "ru": "RUS", "en": "INGLIZ"}.get(lang, "O'ZBEK")

    return f"""Siz — ko'p yillik tajribaga ega klinik shifokor-konsultantsiz.

Sizga BITTA bemorning bir nechta tahlili beriladi. Har bir tahlil
allaqachon alohida tahlil qilingan: uning raqamli ko'rsatkichlari va
xulosasi tayyor holda beriladi.

SIZNING VAZIFANGIZ — ularni ALOHIDA takrorlash EMAS, balki BIRGALIKDA
ko'rib chiqib, MUAMMONI aniqlash: turli tahlillardagi patologik
topilmalar bir-biri bilan qanday bog'liqligini ko'rsatish va yagona
yakuniy xulosa berish.

NIMA HAQIDA YOZISH KERAK:
- FAQAT patologiya va sog'liq muammosi bo'lgan qismlar haqida.
- NORMAL ko'rsatkichlarni va topilmagan holatlarni sanab o'tirmang:
  "QTc normal", "ritm sinusli", "elektrolitlar me'yorida" kabi
  jumlalar KERAK EMAS.
- Hech qanday patologiya topilmasa, buni qisqa aytib, maydonlarni
  sun'iy ravishda to'ldirmang.

QANDAY YOZISH KERAK:
- `automatic_analysis` — ENG MAZMUNLI maydon: topilgan har bir
  patologiyani BATAFSIL yozing (aniq raqamlar, manbasi va klinik
  ma'nosi bilan). Bu yerda qisqartirmang.
- Qolgan maydonlar QISQA: har biri uchun berilgan gap soni
  chegarasiga qat'iy rioya qiling.
- Bir fikrni bir necha maydonda takrorlamang.
- Kirish so'zlari, umumiy mulohazalar va suv gaplarsiz — faqat mohiyat.

SHIFOKOR XULOSASI (agar berilgan bo'lsa, `doctor_note` maydonida):
- Bu KLINIK KONTEKST, tasdiqlangan tashxis EMAS. Shifokor bemorni
  ko'rgan: shikoyatlar, dorilar, kasallik tarixi unda bo'lishi mumkin —
  bu sizda yo'q ma'lumot, uni hisobga oling.
- Lekin shifokor xulosasini AVTOMATIK TASDIQLAMANG va uni aynan
  takrorlamang. Sizning vazifangiz — MUSTAQIL ikkinchi fikr.
- Tahlil ma'lumotlari shifokor xulosasiga ZID bo'lsa, buni
  `automatic_analysis` da ochiq ayting.

BOSHQA QOIDALAR:
- Javob FAQAT valid JSON va {language} tilida bo'lsin.
- FAQAT berilgan ma'lumotlarga tayaning. Yangi raqam o'ylab topmang.
- Har bir topilma qaysi tahlildan olinganini qavs ichida ko'rsating
  (masalan "EKG, 14.08").
- Umumiy jiddiylik darajasi alohida tahlillarning eng yuqorisidan
  PAST bo'la olmaydi.
- Aniq dori va dozasini yozmang.
- Xavfli topilmani yumshatmang.

Javob FAQAT JSON bo'lsin."""


def _sync_openai(patient: dict, entries: list[dict], images, lang: str) -> tuple[dict, dict]:
    """Sinxron OpenAI chaqiruvi. Qaytaradi: (javob lug'ati, token hisobi)."""
    client = OpenAI(
        api_key=OPENAI_API_KEY,
        timeout=ai_config.AI_REQUEST_TIMEOUT,
        max_retries=ai_config.AI_MAX_RETRIES,
    )

    dossier = json.dumps(
        {"patient": patient, "analyses": entries},
        ensure_ascii=False,
        default=str,
    )

    # O'zgarmas ko'rsatma BIRINCHI, o'zgaruvchan dossier KEYIN — prefiks
    # keshlanishi uchun tartib muhim
    content = [
        {"type": "input_text", "text": _compose_prompt(lang)},
        {"type": "input_text", "text": "BEMOR VA TAHLILLAR (JSON):\n" + dossier},
    ]

    # Rasmlar loyihada allaqachon ishlatilayotgan yo'l bilan yuboriladi:
    # avval provayderga fayl sifatida yuklanadi, keyin `file_id` beriladi
    # (main.py dagi EKG tahlili bilan bir xil naqsh)
    for name, blob in images:
        fobj = io.BytesIO(blob)
        fobj.name = name
        uploaded = client.files.create(file=fobj, purpose="user_data")
        content.append({
            "type": "input_image",
            "file_id": uploaded.id,
            "detail": ai_config.ECG_IMAGE_DETAIL,
        })

    resp = client.responses.create(
        **ai_config.combined_request(),
        input=[{"role": "user", "content": content}],
        text=ai_schema.response_format("combined"),
    )

    usage = {}
    if getattr(resp, "usage", None) is not None:
        usage = {
            "input_tokens": getattr(resp.usage, "input_tokens", None),
            "output_tokens": getattr(resp.usage, "output_tokens", None),
        }

    try:
        return json.loads(resp.output_text), usage
    except (json.JSONDecodeError, TypeError):
        logger.warning("Kompleks tahlil: javobni JSON sifatida o'qib bo'lmadi")
        return {"raw": resp.output_text}, usage


def _update(db: Session, combined_id: int, **fields) -> None:
    row = db.query(CombinedAnalyses).filter(CombinedAnalyses.id == combined_id).first()
    if row is None:
        return
    for key, value in fields.items():
        setattr(row, key, value)
    row.updated_at = datetime.datetime.utcnow()
    db.commit()


# ─── Fon rejimidagi AI tahlil ────────────────────────────────────────────────

async def _combined_ai_background(combined_id: int, lang: str, mode: str) -> None:
    db = SessionLocal()
    try:
        combined = db.query(CombinedAnalyses).filter(
            CombinedAnalyses.id == combined_id
        ).first()
        if combined is None:
            logger.error("Kompleks tahlil topilmadi: id=%d", combined_id)
            return

        items = db.query(CombinedAnalysisItems).filter(
            CombinedAnalysisItems.combined_analysis_id == combined_id
        ).all()

        patient = _load_patient(db, combined.patient_id)
        entries, images = _build_dossier(db, items)

        if len(entries) < 2:
            _update(
                db, combined_id,
                status=-1,
                ai_answer_data=json.dumps({
                    "xato": "manba_yetarli_emas",
                    "xabar": "Kompleks xulosa uchun kamida ikkita mavjud tahlil kerak.",
                    "qayta_urinish_mumkin": False,
                }, ensure_ascii=False),
            )
            return

        # `summary` rejimda rasmlar umuman yuborilmaydi
        if mode != "deep":
            images = []

        parsed, usage = await asyncio.to_thread(
            _sync_openai, patient, entries, images, lang
        )

        ai_data_str = json.dumps(
            ai_schema.normalize_combined(parsed), ensure_ascii=False
        )
        # Model "xulosa chiqarib bo'lmaydi" desa ham jiddiylik darajasiga
        # 1 (yashil "Normal") qo'yib yuborishi mumkin — guard uni olib tashlaydi
        ai_data_str = ai_result_guard.sanitize(ai_data_str, combined_id, "combined")

        _update(
            db, combined_id,
            status=2,
            ai_answer_data=ai_data_str,
            model_used=ai_config.COMBINED_MODEL[:50],
            input_tokens=usage.get("input_tokens"),
            output_tokens=usage.get("output_tokens"),
        )
        logger.info(
            "Kompleks AI muvaffaqiyatli: id=%d tahlillar=%d rasmlar=%d",
            combined_id, len(entries), len(images),
        )

    except Exception as exc:
        logger.error(
            "Kompleks AI fon xatolik id=%d [%s]: %s",
            combined_id, ai_errors.classify(exc), ai_errors.log_message(exc),
        )
        try:
            _update(
                db, combined_id,
                status=-1,
                ai_answer_data=ai_errors.to_ai_answer(exc, lang),
            )
        except Exception:
            logger.exception("Kompleks AI: xatolik holatini yozib bo'lmadi id=%d", combined_id)
    finally:
        db.close()


# ─── Endpoint ────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze(
    payload: CombinedAnalyzeRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
):
    """Tayyorlangan kompleks tahlil yozuvini AI ga yuboradi.

    Yozuvni .NET oldindan yaratadi va tekshiradi — bu yerda faqat
    holat va takroriy ishga tushirishdan himoya tekshiriladi.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    combined = db.query(CombinedAnalyses).filter(
        CombinedAnalyses.id == payload.combined_id
    ).first()
    if combined is None:
        raise HTTPException(status_code=404, detail="Kompleks tahlil topilmadi")

    # Allaqachon ishlayapti yoki tayyor — ikkinchi marta AI ga yubormaymiz
    if combined.status in (1, 2):
        return JSONResponse(content={
            "combined_id": combined.id,
            "status": "processing" if combined.status == 1 else "done",
        })

    lang = payload.lang if payload.lang in ("uz", "ru", "en") else "uz"
    mode = "summary" if payload.mode == "summary" else "deep"

    combined.status = 1
    combined.ai_lang = lang
    combined.updated_at = datetime.datetime.utcnow()
    db.commit()

    task = asyncio.create_task(_combined_ai_background(combined.id, lang, mode))
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)

    return JSONResponse(content={"combined_id": combined.id, "status": "processing"})
