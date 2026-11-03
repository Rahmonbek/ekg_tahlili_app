import asyncio
import datetime
import ai_config
import ai_schema
import logging
import os
import io
import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from lab_analyse_categories import create_lab_analyse_category
from lab_analyse import (
    get_lab_analyse_by_id,
    lock_lab_analyse,
    create_lab_analyse,
    update_lab_analyse,
    set_lab_analysis_files,
    get_lab_analysis_file_links,
    replace_lab_values,
    clear_lab_values,
)
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
import lab_units
import lab_catalog
import excel_to_text
import lab_dates
import lab_split
from document_classifier import (
    DocumentMismatch,
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

# Bitta laboratoriya tahliliga biriktiriladigan fayllar chegarasi.
# Klinikalar bitta topshiriq natijasini bir necha varaqda berishi mumkin
# (qon, siydik, biokimyo alohida). Har bir fayl `validate_upload` da
# alohida (25 MB gacha) tekshiriladi; jami hajm ham cheklanadi — .NET
# proksisi 60 MB dan katta so'rovni qabul qilmaydi.
MAX_LAB_FILES = 10
MAX_LAB_TOTAL_BYTES = 50 * 1024 * 1024

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

def compose_prompt_for_openai(age, gender, lang, indicators: str) -> str:
    """Laboratoriya prompti (statik qism + bemor ma'lumoti va til)."""
    return lab_prompt_static(indicators) + lab_prompt_tail(age, gender, lang)


def lab_prompt_tail(age, gender, lang) -> str:
    """Promptning o'zgaruvchan qismi: bemor ma'lumotlari va javob tili."""
    language = (
    "O'ZBEK" if lang == 'uz'
    else "RUS" if lang == 'ru'
    else "INGLIZ" if lang == 'en'
    else "O'ZBEK"
    )
    tail = ""
    if age is not None or gender is not None:
        tail += "\nBemor ma'lumotlari:"
        if age is not None:
            tail += f"\n - Yoshi {age}"
        if gender is not None:
            tail += f"\n - Jinsi {gender}"
    return tail + f"\nJavob tili: {language}."


def lab_prompt_static(indicators: str) -> str:
    """Promptning O'ZGARMAS qismi — so'rovda `instructions` bo'lib boradi.

    `indicators` — `lab_catalog.prompt_lines(db)`: ko'rsatkichlar ro'yxati
    `lab_value_types` katalogidan (ilgari bu yerda 137 qator qo'lda yozilgan
    edi va har yangi ko'rsatkichda kodni o'zgartirish kerak edi).

    Bemor ma'lumoti va til bu yerda YO'Q (2026-11-03): OpenAI takrorlanuvchi
    `instructions` ni keshlaydi va ~90% arzon hisoblaydi (o'lchov: 4512/4527
    token keshdan). Foydalanuvchi xabari ichidagi matn esa gpt-5.6-terra da
    keshlanmadi.
    """
    prompt_header = f"""
    Sizga laboratoriya natijasi fayli (yoki Excel jadvalining matnli
    ko'rinishi) va bemor ma'lumotlari berildi. 
    
❗️JAVOB QOIDALARI:
- Javob FAQAT quyida berilgan JSON formatida bo'lsin
- JSON dan tashqarida hech qanday izoh, sharh yoki qo'shimcha matn YOZILMASIN
- Javobni oxirida ko'rsatilgan tilda taqdim et
- Laboratoriya natijasini tahlil qiling va quyidagi bo'limlarni to'ldiring:
- Laboratoriya faylidagi quyidagi parametrlardan qaysi birlarini qiymatini aniqlash mumkin bo'lsa, ularni aniqlang va qiymatlarini yozing. Parametrlar:
{indicators}

---

### MAYDONLAR

Javob shakli qat'iy JSON sxema bilan belgilangan (A-7) — shablon
yozishning hojati yo'q. Har bir maydonga nima yozilishi:

- **digital_measurements** — fayldan o'qib olingan ko'rsatkichlar
  ro'yxati. Har bir element: `column_name` (yuqoridagi ro'yxatdan),
  `value` (raqam) va `unit` (birlik).
  ❗️`value` va `unit` ni FAYLDA QANDAY YOZILGAN BO'LSA SHUNDAY yoz.
  Birlikni boshqa birlikka O'GIRMA va qiymatni QAYTA HISOBLAMA (masalan
  faylda "5.5 mg/dL" bo'lsa — 5.5 va "mg/dL"). Yuqoridagi qavs ichidagi
  birlik — faqat ma'lumot uchun; aylantirishni tizim o'zi bajaradi.
  `unit` ni hech qachon taxmin qilib yozma — faylda birlik bo'lmasa `null`.
  ❗️FAQAT faylda haqiqatan bor ko'rsatkichlarni yoz. Yo'q
  ko'rsatkichni ro'yxatga QO'SHMA — qiymatini taxmin qilish tibbiy
  xato demakdir. Raqamni o'qib bo'lmasa `value` ni `null` qoldir.
  ❗️Norma (referens) ustunidagi sonlar NATIJA EMAS — `value` ga faqat
  "Результат"/"Natija" ustunidagi qiymat yoziladi.
  ❗️SIFAT natijalari (HBsAg, Anti-HCV, RW, OIV, H. pylori): holatini
  `result_kind` ga yoz — NEGATIVE (manfiy), POSITIVE (musbat), EQUIVOCAL
  (shubhali, "±", "+-"), INVALID (yaroqsiz). Shubhalini musbatga
  QO'SHMA. `value` — faqat laboratoriya son (indeks, COI, S/CO) bergan
  bo'lsa, aks holda null. Qon guruhi va rezus — ro'yxatdagi kod. Har
  qanday sifat yozuvini (masalan "Отрицательный(-)", "A(II)") `text` ga
  AYNAN ko'chir; oddiy raqamli ko'rsatkichlarda `text` va `result_kind` = null.
  ❗️ME'YOR: fayldagi norma (referens) ustunini `ref_low` / `ref_high` ga
  yoz — `value` bilan BIR XIL birlikda, aylantirmasdan. Bemor jinsiga mos
  qatorni tanla (masalan "Креатинин (М) 53–115", "(Ж) 44–80"). Natija
  "(М)" qatorida tursa-yu bemor ayol bo'lsa — me'yorni "(Ж)" qatoridan
  ol ("faqat me'yor" deb belgilangan qatorlar). "до 10" →
  ref_high = 10; "0–30" → 0 va 30; ">1,54" → ref_low = 1.54. Me'yor faza,
  yosh yoki xavf darajasiga qarab bir nechta bo'lsa yoki umuman yo'q bo'lsa —
  ikkalasi null. Asl me'yor matnini har doim `ref_text` ga ko'chir.
  ❗️Natija ">50", "<0,5" ko'rinishida bo'lsa — `value` ga chegara soni
  (50; 0.5), `text` ga asl yozuv.
  ❗️Foiz (NEU%) va mutlaq son (NEU#) — ikki xil ko'rsatkich: foiz
  `neutrophils` ga, mutlaq son `neutrophils_abs` ga (qolgan
  leykotsitlar ham shunday).
  ❗️Klinika blankalarida birlik ko'pincha XATO yozilgan. Qiymat blankadagi
  birlikda fiziologik imkonsiz bo'lsa, uni haqiqiy birlikda baholang va
  "keskin past/yuqori" deb xulosa QILMANG:
  insulin 2–60 "нг/мл" — aslida µIU/mL; erkin T4 0.3–3 "нг/мл" —
  aslida ng/dL (×12.9 = pmol/L);
  D-dimer 0.1–10 "нг/мл" — aslida mg/L; FSG/LG "мМЕ/л" — aslida mIU/mL;
  mochevina 2–40 "мкмоль/л" — aslida mmol/L; siydik kislotasi 100–700
  "ммоль/л" — aslida µmol/L.
  ❗️Kortizol "нмоль/л" da 40 dan past yoki prolaktin "мМЕ/л" ("мкМЕ/мл",
  "mIU/L") da 40 dan past bo'lsa — birlik SHUBHALI: bu blankadagi birlik
  xatosi ham, HAQIQIY past qiymat ham (buyrak usti bezi yetishmovchiligi,
  deksametazon testi; kabergolin, gipopituitarizm) bo'lishi mumkin.
  Qiymatni boshqa birlikka O'GIRMA, "aslida µg/dL" yoki "aslida ng/mL"
  deb AYTMA, normal ham, past ham deb xulosa QILMA — matnda "birligi
  shubhali, laboratoriya blankasini tekshirish kerak" deb yoz.
  `unit` ga baribir fayldagi yozuvni yozing (aylantirishni tizim bajaradi).

- **analysis_date** — hujjatdagi tahlil sanasi YYYY-MM-DD: namuna olingan
  kun ("Дата забора", "Дата взятия"), u bo'lmasa natija berilgan kun
  ("Дата выдачи", "Дата", "Sana"). Tug'ilgan sana EMAS. Sana yo'q yoki
  o'qilmasa — null (taxmin qilma). "05.09.2025" → "2025-09-05" (kun.oy.yil).

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

❗️Matnli maydonlar oxirida ko'rsatilgan tilda bo'lsin
    """
    return prompt_header

# ─── Sinxron OpenAI chaqiruvi (thread pool da ishlaydi) ──────────────────────
def _multi_file_note(count: int) -> str:
    """Bir nechta fayl yuborilganda promptga qo'shiladigan izoh."""
    return (
        f"\n\n❗️DIQQAT: {count} ta fayl biriktirilgan. Ularning HAMMASI bitta "
        "bemorning bitta laboratoriya topshirig'i natijalari — klinika ularni "
        "bir necha varaqqa (faylga) bo'lib bergan. Barcha fayllardagi "
        "ko'rsatkichlarni BIRGALIKDA o'qing va yagona xulosa bering. Bitta "
        "ko'rsatkich bir necha faylda takrorlansa, uni bir marta yozing. "
        "Biror fayl o'qilmasa, qolganlari bo'yicha tahlil qiling va buni "
        "`automatic_analysis` da qisqa ayting."
    )


def _sync_lab_openai(
    files: list[tuple[bytes, str]],
    age: int,
    gender: str,
    lang: str,
    indicators: str,
    columns: list[str],
    analysis_id: int | None = None,
    bulk: bool = False,
) -> dict:
    """OpenAI ga sinxron so'rov — asyncio.to_thread() orqali chaqiriladi.

    `files` — `(baytlar, fayl nomi)` ro'yxati, yuklangan tartibda. Barcha
    fayllar BITTA so'rovda yuboriladi: AI natijalarni alohida emas,
    bitta topshiriq sifatida ko'rishi kerak.
    """
    client = OpenAI(api_key=OPENAI_API_KEY)

    # Statik qism — `instructions` (keshlanadi); bemor, til, fayllar — xabarda
    prompt = lab_prompt_tail(age, gender, lang).lstrip()
    if len(files) > 1:
        prompt += _multi_file_note(len(files))

    content_parts = [{"type": "input_text", "text": prompt}]
    # Provayderga yuklangan fayllar — javobdan keyin o'chiriladi (L-14)
    uploaded_ids: list[str] = []
    try:
        for index, (content, fname) in enumerate(files, start=1):
            fname = prepare_upload_filename(fname, content, default_stem="lab_upload").lower()

            # Excel — matnli jadval sifatida (model xlsx faylni o'qiy olmaydi).
            # Bemor F.I.O. va shifokor imzosi matnga kirmaydi (`excel_to_text`).
            if excel_to_text.is_xlsx(fname):
                table = excel_to_text.xlsx_to_text(content)
                label = f"Fayl {index}/{len(files)} — " if len(files) > 1 else ""
                content_parts.append({
                    "type": "input_text",
                    "text": f"{label}Excel jadvali (faqat to'ldirilgan natija qatorlari):\n{table}",
                })
                continue

            # 1. Faylni OpenAI ga yuklash
            fobj = io.BytesIO(content)
            fobj.name = fname
            uploaded = client.files.create(file=fobj, purpose="user_data")
            uploaded_ids.append(uploaded.id)

            is_image = fname.endswith(('.png', '.jpg', '.jpeg'))
            if len(files) > 1:
                content_parts.append({"type": "input_text", "text": f"Fayl {index}/{len(files)}:"})
            content_parts.append({
                "type": "input_image" if is_image else "input_file",
                "file_id": uploaded.id,
            })

        # 2. AI tahlil
        resp = ai_config.create_response(
            client, module="lab", analysis_id=analysis_id, step="legacy", bulk=bulk,
            # Model va fikrlash chuqurligi bitta joyda (A-11). Token byudjeti
            # laboratoriya uchun kengroq — ko'p faylli javob kesilmasin (L-05)
            **ai_config.holter_smad_lab_request(
                max_output_tokens=ai_config.LAB_MAX_OUTPUT_TOKENS,
                reasoning={"effort": ai_config.LAB_REASONING_EFFORT}),
            instructions=lab_prompt_static(indicators),
            input=[{"role": "user", "content": content_parts}],
            # Qat'iy JSON sxema (A-7). Ko'rsatkichlar massiv sifatida
            # qaytadi va `column_name` `enum` bilan cheklangan — model
            # mavjud bo'lmagan ustun nomini o'ylab topa olmaydi. Tasniflash
            # o'chiq bo'lsa hujjat turi ham shu javobda (`document_kind`)
            text=ai_schema.response_format("lab", lab_columns=columns,
                                           document_kind=not ai_config.LAB_CLASSIFY),
        )
    finally:
        # Bemor fayllari provayderda qolmasin — xato bo'lsa ham (L-14)
        ai_config.delete_uploaded_files(client, uploaded_ids, "lab")
    return _parse_lab_response(resp)


def _parse_lab_response(resp) -> dict:
    """AI javobini lug'atga o'giradi; to'liq bo'lmasa — istisno (L-05).

    Ilgari `json.loads` xatosida `{"raw": matn}` qaytardi: keyingi kod
    barcha maydonlarni bo'sh olib, natijani "tayyor" (status 2) deb
    saqlardi — kulrang bo'sh kartochka, xato ham, "qayta urinish" ham
    yo'q. Endi istisno `_lab_ai_background` dagi `except` ga tushadi:
    status -1 va tarjima qilingan xabar.
    """
    output = getattr(resp, "output_text", None)
    incomplete = getattr(resp, "status", None) == "incomplete"
    if incomplete:
        reason = getattr(getattr(resp, "incomplete_details", None), "reason", None)
        raise ai_errors.AIOutputIncomplete(
            f"AI javobi to'liq emas (token chegarasi; reason={reason})")
    if not output or not str(output).strip():
        raise ai_errors.AIOutputIncomplete("AI bo'sh natija qaytardi")
    try:
        parsed = json.loads(output)
    except (TypeError, ValueError) as exc:
        # Matn o'rtada uzilgan (yopilmagan satr/massiv) — bu ham kesilish
        text_out = str(output).rstrip()
        pos = getattr(exc, "pos", None)
        if "Unterminated" in str(exc) or (pos is not None and pos >= len(text_out) - 1):
            raise ai_errors.AIOutputIncomplete(
                f"AI javobi to'liq emas (JSON uzilgan, uzunligi {len(text_out)})") from exc
        raise ai_errors.AIInvalidOutput(
            f"AI javobi JSON emas (uzunligi {len(text_out)})") from exc
    if not isinstance(parsed, dict):
        raise ai_errors.AIInvalidOutput(
            f"AI javobi kutilgan tuzilmada emas ({type(parsed).__name__})")
    return parsed


def _is_inverted_ref(low, high) -> bool:
    """Me'yor teskari yozilganmi (min > max) — `lab_analyse.replace_lab_values`
    dagi shart bilan bir xil (L-38)."""
    def num(x):
        return x if isinstance(x, (int, float)) and not isinstance(x, bool) else None
    low, high = num(low), num(high)
    return low is not None and high is not None and low > high


def _measurements_to_dict(raw, columns: set[str]) -> dict:
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
    ekranda ko'rsatish shifokorni chalg'itadi. Istisno — sifat natijasi
    (holati yoki asl yozuvi bor, son esa yo'q).
    """
    if isinstance(raw, dict):
        # Sxemasiz eski javob: ham katalog bo'yicha filtrlanadi
        out = {}
        for k, v in raw.items():
            if k not in columns:
                continue
            if isinstance(v, dict) and _is_inverted_ref(v.get("ref_low"), v.get("ref_high")):
                v = {key: val for key, val in v.items() if key not in ("ref_low", "ref_high")}
            out[k] = v
        return out
    if not isinstance(raw, list):
        return {}

    out = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = item.get("column_name")
        value = item.get("value")
        # Sifat natijasida son bo'lmasligi mumkin — holat va matn yetarli
        has_quality = item.get("result_kind") or (isinstance(item.get("text"), str) and item["text"].strip())
        if not name or (value is None and not has_quality):
            continue
        # Sxemadagi `enum` buni kafolatlaydi, lekin sxemasiz zaxira
        # yo'lda ham xavfsiz bo'lishi kerak
        if name not in columns:
            logger.warning("Lab: noma'lum ko'rsatkich o'tkazib yuborildi: %s", name)
            continue
        cell = {"value": value, "unit": item.get("unit")}
        # Sifat natijasining asl yozuvi ("Отрицательный(-)") — ekranda
        # shu ko'rsatiladi; holati — `result_kind`
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            cell["text"] = text.strip()[:120]
        kind = item.get("result_kind")
        if kind in ("NEGATIVE", "POSITIVE", "EQUIVOCAL", "INVALID"):
            cell["result_kind"] = kind
        # Laboratoriyaning o'z me'yori — baho shu bilan qilinadi
        for key in ("ref_low", "ref_high"):
            ref = item.get(key)
            if isinstance(ref, (int, float)) and not isinstance(ref, bool):
                cell[key] = ref
        # Teskari yozilgan me'yor (masalan 40–20) ishonchsiz — JSON ga ham
        # tushmaydi (L-38). `replace_lab_values` bazaga yozishda ham xuddi
        # shunday tashlaydi; ilgari ekran uni ishlatardi, PDF/statistika esa
        # katalog me'yorini — bitta tahlil ikki xil baholanardi.
        if _is_inverted_ref(cell.get("ref_low"), cell.get("ref_high")):
            logger.info("Lab: teskari me'yor tashlab yuborildi: %s (%s > %s)",
                        name, cell["ref_low"], cell["ref_high"])
            del cell["ref_low"], cell["ref_high"]
        ref_text = item.get("ref_text")
        if isinstance(ref_text, str) and ref_text.strip():
            cell["ref_text"] = ref_text.strip()[:300]
        out[name] = cell
    return out


def document_date(files: list[tuple[bytes, str]], parsed=None, birthdate=None):
    """Fayldagi tahlil sanasi: Excel «Дата:» katagi (aniq, AI siz), bo'lmasa
    AI hujjatdan o'qigan `analysis_date`. Bir nechta fayl — eng kechi."""
    excel = [
        lab_dates.validate(excel_to_text.xlsx_date(content), birthdate)
        for content, fname in files if excel_to_text.is_xlsx(fname)
    ]
    found = lab_dates.pick_latest(excel)
    if found:
        return found
    ai_value = parsed.get("analysis_date") if isinstance(parsed, dict) else None
    return lab_dates.validate(lab_dates.parse(ai_value), birthdate)


def _apply_document_date(db, analyse_id: int, files, parsed) -> None:
    """Formada sana kiritilmagan bo'lsa (`analysis_date_source != 'user'`)
    `analysis_date` fayldagi sana bilan yangilanadi. Fayl almashtirilsa va
    yangisida sana bo'lmasa — eski fayldan qolgan sana o'chiriladi."""
    lab = get_lab_analyse_by_id(db, analyse_id)
    if lab is None or lab.analysis_date_source == lab_dates.SOURCE_USER:
        return
    birthdate = db.execute(
        text("SELECT birthdate FROM patients WHERE id = :id"), {"id": lab.patcient_id}
    ).scalar()
    found = document_date(files, parsed, birthdate)
    if found:
        lab.analysis_date = lab_dates.to_storage(found)
        lab.analysis_date_source = lab_dates.SOURCE_DOCUMENT
    elif lab.analysis_date_source == lab_dates.SOURCE_DOCUMENT:
        lab.analysis_date = None
        lab.analysis_date_source = None
    db.commit()
    logger.info("Lab: tahlil sanasi analyse_id=%d → %s", analyse_id, found or "aniqlanmadi")


# ─── Fon rejimidagi AI tahlil ─────────────────────────────────────────────────
async def _lab_ai_background(
    analyse_id: int,
    files: list[tuple[bytes, str]],
    age: int,
    gender: str,
    lang: str,
    bulk: bool = False,
    extraction: dict | None = None,
) -> None:
    """Browser yopilsa ham davom etadigan AI tahlil — mustaqil DB sessiyasi.

    `files` — `(baytlar, fayl nomi)` ro'yxati (bitta yoki bir nechta).
    """
    db = SessionLocal()
    try:
        # Oldingi natijaning qiymatlari (qayta tahlil / fayl almashtirish)
        # darhol o'chiriladi: yangi natija faqat TOPILGAN ko'rsatkichlarni
        # yozadi va eski fayldagi qiymat qolib ketmasligi kerak
        clear_lab_values(db, analyse_id)
        db.commit()

        columns = lab_catalog.columns(db)
        parsed = None
        digital_measurements = None

        # ── Ikki bosqichli yo'l (arzonroq): o'qish → bog'lash → xulosa ──
        if ai_config.LAB_PIPELINE == "split":
            try:
                if extraction is None:
                    extraction = await asyncio.to_thread(
                        lab_split.extract, files, gender, analysis_id=analyse_id, bulk=bulk)
                kind = extraction.get("document_kind")
                if kind != "laboratoriya" and not any(lab_split._usable(r) for r in extraction.get("rows", [])):
                    # Hujjat turi o'qish bosqichida aniqlanadi — alohida tasniflash so'rovi yo'q
                    detected = kind if kind in ("ekg", "holter", "smad", "boshqa") else "aniqlanmadi"
                    mismatch = DocumentMismatch(expected="laboratoriya", detected=detected,
                                                confidence=0.9, note="")
                    update_lab_analyse(session=db, analyse_id=analyse_id,
                                       status=STATUS_FILE_MISMATCH, ai_answer_data=mismatch.to_ai_answer(lang))
                    logger.info("Lab: fayl turi mos emas (aniqlangan=%s): analyse_id=%d", detected, analyse_id)
                    return
                items, stats = await asyncio.to_thread(
                    lab_split.map_rows, extraction["rows"], analysis_id=analyse_id, bulk=bulk)
                digital_measurements = lab_units.harmonize_all(
                    db, _measurements_to_dict(items, set(columns)))
                parsed = await asyncio.to_thread(
                    lab_split.conclude, digital_measurements, age, gender, lang,
                    analysis_id=analyse_id, bulk=bulk)
                parsed["analysis_date"] = extraction.get("analysis_date")
                logger.info("Lab (ikki bosqich): analyse_id=%d, qatorlar=%d, bog'landi=%d, yangi nom=%d",
                            analyse_id, stats["rows"], stats["mapped"], stats["new_names"])
            except lab_split.NeedLegacy as why:
                logger.info("Lab: ikki bosqichli yo'l ishonchsiz (%s) — eski yo'l: analyse_id=%d", why, analyse_id)
                parsed, digital_measurements = None, None

        # ── Bitta so'rovli yo'l (standart; `split` ning zaxirasi) ──
        if parsed is None:
            # `AI_LAB_CLASSIFY=true` bo'lsa har bir fayl asosiy tahlildan oldin
            # (parallel) tekshiriladi. Standart holatda hujjat turi asosiy
            # javobning o'zida (`document_kind`) — alohida so'rov pul turardi.
            # `split` dan qaytilganda fayl allaqachon laboratoriya deb o'qilgan.
            classify = ai_config.LAB_CLASSIFY and extraction is None
            mismatches = await asyncio.gather(*(
                asyncio.to_thread(classify_document, content, fname, "laboratoriya")
                for content, fname in files
            )) if classify else []
            for index, mismatch in enumerate(mismatches):
                if not mismatch:
                    continue
                answer = mismatch.to_ai_answer(lang)
                if len(files) > 1:
                    # Qaysi fayl mos kelmagani — banner buni ko'rsatadi
                    data = json.loads(answer)
                    data["fayl_raqami"] = index + 1
                    data["fayllar_soni"] = len(files)
                    answer = json.dumps(data, ensure_ascii=False)
                update_lab_analyse(
                    session=db,
                    analyse_id=analyse_id,
                    status=STATUS_FILE_MISMATCH,
                    ai_answer_data=answer,
                )
                logger.info(
                    "Lab: %d/%d-fayl turi mos emas (aniqlangan=%s), tahlil to'xtatildi: analyse_id=%d",
                    index + 1, len(files), mismatch.detected, analyse_id,
                )
                return

            # Ko'rsatkichlar ro'yxati va AI sxemasidagi `enum` — katalogdan
            indicators = lab_catalog.prompt_lines(db)
            parsed = await asyncio.to_thread(
                _sync_lab_openai, files, age, gender, lang, indicators, columns, analyse_id, bulk
            )
            kind = parsed.get("document_kind") if isinstance(parsed, dict) else None
            if (kind and kind != "laboratoriya" and extraction is None
                    and not (parsed.get("digital_measurements") or [])):
                detected = kind if kind in ("ekg", "holter", "smad", "boshqa") else "aniqlanmadi"
                mismatch = DocumentMismatch(expected="laboratoriya", detected=detected,
                                            confidence=0.9, note="")
                update_lab_analyse(session=db, analyse_id=analyse_id,
                                   status=STATUS_FILE_MISMATCH, ai_answer_data=mismatch.to_ai_answer(lang))
                logger.info("Lab: fayl turi mos emas (aniqlangan=%s): analyse_id=%d", detected, analyse_id)
                return

            # Sxema bo'yicha `digital_measurements` — massiv (A-7). Qolgan
            # kod (bazaga yozish, frontend, PDF) lug'at kutadi, shuning
            # uchun shu yerda o'giriladi. Eski, sxemasiz javoblar lug'at
            # bo'lib kelishi mumkin — ular ham qo'llab-quvvatlanadi.
            digital_measurements = _measurements_to_dict(
                parsed.get("digital_measurements") if isinstance(parsed, dict) else None,
                set(columns),
            )
            # Fayldagi birlik (mg/dL, g/dL, …) me'yor birligiga keltiriladi —
            # aks holda solishtirish, PDF va dinamika noto'g'ri bo'ladi
            digital_measurements = lab_units.harmonize_all(db, digital_measurements)
        automatic_analysis_text = parsed.get("automatic_analysis", "") if isinstance(parsed, dict) else ""
        final_summary = parsed.get("final_summary", "") if isinstance(parsed, dict) else ""
        try:
            automatic_analysis_bool = int(parsed.get("automatic_analysis_bool", 0)) if isinstance(parsed, dict) else 0
        except (ValueError, TypeError):
            automatic_analysis_bool = 0

        ai_data_str = json.dumps({
            # Ekrandagi kartochkalar shu JSON dan chiziladi; statistika,
            # dinamika va PDF esa `lab_analysis_values` jadvalidan o'qiydi
            "digital_measurements": digital_measurements,
            "automatic_analysis": automatic_analysis_text,
            "AI_recommendations": (
                parsed.get("AI_recommendations", "") if isinstance(parsed, dict) else ""
            ),
            "final_summary": final_summary,
            "automatic_analysis_bool": automatic_analysis_bool,
            # Sxema talab qiladi, lekin ilgari saqlanmasdi — `ai_result_guard`
            # matndan taxmin qilishga majbur edi
            "analiz_mumkinmi": parsed.get("analiz_mumkinmi") if isinstance(parsed, dict) else None,
            "analiz_mumkin_emas_sababi": (
                parsed.get("analiz_mumkin_emas_sababi") if isinstance(parsed, dict) else None
            ),
        }, ensure_ascii=False)

        # AI matnda "tahlil qilib bo'lmadi" desa ham jiddiylik
        # darajasiga 1 (= yashil "Normal") qo'yib yuborishi mumkin.
        # Guard shunday holatda darajani olib tashlaydi (T-092).
        ai_data_str = ai_result_guard.sanitize(ai_data_str, analyse_id, "lab")

        # Tahlilning O'Z sanasi (yuklangan kun emas) — qiymatlarning
        # `measured_at` i shundan olinadi, shuning uchun ulardan OLDIN
        _apply_document_date(db, analyse_id, files, parsed)

        # Har bir ko'rsatkich — `lab_analysis_values` da alohida qator
        # (statistika va kasallik dinamikasi uchun). Holat "tayyor" bo'lishidan
        # OLDIN yoziladi: interfeys natijani ochganda qiymatlar allaqachon bor.
        written = replace_lab_values(db, analyse_id, digital_measurements)

        update_lab_analyse(
            session=db,
            analyse_id=analyse_id,
            status=STATUS_DONE,
            ai_answer_data=ai_data_str,
        )
        logger.info("Lab AI muvaffaqiyatli: analyse_id=%d, ko'rsatkichlar=%d", analyse_id, written)

    except Exception as exc:
        # DB xatosidan (IntegrityError, uzilish) keyin sessiya "pending
        # rollback" holatida — rollback qilinmasa quyidagi yozuv ham xato
        # berib, tahlil watchdog gacha status 0 da qolardi (L-29)
        try:
            db.rollback()
        except Exception:
            logger.exception("Lab AI: sessiyani rollback qilib bo'lmadi analyse_id=%d", analyse_id)
        logger.error("Lab AI fon xatolik analyse_id=%d [%s]: %s",
                     analyse_id, ai_errors.classify(exc), ai_errors.log_message(exc))
        try:
            # Xom istisno matni EMAS — turkumlangan, tarjima qilingan xabar.
            # Xom matn faqat yuqoridagi logger.error() ga tushadi.
            answer = ai_errors.to_ai_answer(exc, lang)
            if extraction is not None:
                # Fayl allaqachon o'qilgan (xato keyingi bosqichda) — «qayta
                # urinish» faylni qayta o'qitmaydi, shu qatorlardan davom etadi
                data = json.loads(answer)
                data["_extraction"] = extraction
                answer = json.dumps(data, ensure_ascii=False)
            update_lab_analyse(
                session=db,
                analyse_id=analyse_id,
                status=STATUS_ERROR,
                ai_answer_data=answer,
            )
        except Exception:
            logger.exception("Lab AI: xatolik holatini yozib bo'lmadi analyse_id=%d", analyse_id)
    finally:
        db.close()


class _LabUpload:
    """Tekshirilgan bitta yuklangan fayl."""
    __slots__ = ("content", "fname", "original_filename")

    def __init__(self, content: bytes, fname: str, original_filename: str | None):
        self.content = content
        self.fname = fname
        self.original_filename = original_filename


async def _read_lab_uploads(
    uploads: list[UploadFile],
    original_names: list[str] | None,
    lang: str,
) -> list[_LabUpload]:
    """Yuklangan fayllarni o'qiydi va tekshiradi (yozuv yaratilishidan OLDIN).

    * soni: 1..`MAX_LAB_FILES`, jami hajm `MAX_LAB_TOTAL_BYTES` gacha;
    * har biri turi, hajmi va (rasm bo'lsa) sifati bo'yicha;
    * bir so'rovda AYNAN bir xil fayl ikki marta tanlangan bo'lsa,
      takrori jimgina tashlab yuboriladi (xodim xatosi, xato emas).

    Asl nomlar .NET proksisidan `original_filenames` maydonida fayllar
    bilan bir xil tartibda keladi (T-101).
    """
    uploads = [u for u in (uploads or []) if u is not None]
    if not uploads:
        raise HTTPException(status_code=400, detail="Fayl yuklanmadi")
    if len(uploads) > MAX_LAB_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Bitta tahlilga ko'pi bilan {MAX_LAB_FILES} ta fayl biriktirish mumkin.",
        )

    result: list[_LabUpload] = []
    seen_hashes: set[str] = set()
    total = 0
    for index, upload in enumerate(uploads):
        content = await upload.read()
        total += len(content)
        if total > MAX_LAB_TOTAL_BYTES:
            mb = MAX_LAB_TOTAL_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"Fayllarning umumiy hajmi {mb} MB dan oshmasligi kerak.",
            )
        if not content:
            raise HTTPException(status_code=400, detail="Yuklangan fayl bo'sh")

        original = None
        if original_names and index < len(original_names):
            original = (original_names[index] or "").strip() or None
        original = (original or upload.filename or "")[:255] or None

        fname = prepare_upload_filename(
            upload.filename or "upload", content, default_stem="lab_upload"
        ).lower()
        try:
            validate_upload(fname, content, "lab", lang)
        except FileValidationError as file_exc:
            # Bir nechta fayl bo'lsa qaysi biri ekani aytiladi
            prefix = f"«{original}»: " if len(uploads) > 1 and original else ""
            raise HTTPException(status_code=400, detail=prefix + file_exc.message)

        digest = duplicate_guard.file_hash(content)
        if digest in seen_hashes:
            logger.info("Lab: bir so'rovdagi takroriy fayl tashlab yuborildi (%s)", digest[:12])
            continue
        seen_hashes.add(digest)
        result.append(_LabUpload(content, fname, original))
    return result


def _tr(lang: str, uz: str, ru: str, en: str) -> str:
    """So'rov tilidagi xabar (uz | ru | en; noma'lum til — uz)."""
    return {"ru": ru, "en": en}.get((lang or "uz")[:2], uz)


# ─── Retry / replace-file parallel himoyasi (L-16) ───────────────────────────
#: Status 0/1 dagi yozuv shu daqiqadan yangi bo'lsa — AI hali ishlayapti
#: deb hisoblanadi. .NET `StuckAnalysisWatchdog` chegarasi bilan bir xil:
#: undan eski 0/1 yozuv muzlagan, uni qayta ishga tushirish mumkin.
IN_PROGRESS_MINUTES = 30


def _is_in_progress(status, updated_at, created_at=None, now=None) -> bool:
    """Tahlil hali ishlanmoqdami (status 0/1 va oxirgi o'zgarish yangi)."""
    if status not in (0, 1):
        return False
    stamp = updated_at or created_at
    if stamp is None:
        return False
    if stamp.tzinfo is None:
        # Python naive UTC yozadi; `timestamptz` drayverdan aware keladi
        stamp = stamp.replace(tzinfo=datetime.timezone.utc)
    now = now or datetime.datetime.now(datetime.timezone.utc)
    return now - stamp < datetime.timedelta(minutes=IN_PROGRESS_MINUTES)


def _ensure_not_running(db: Session, analyse, lang: str) -> None:
    """Tahlil hali ishlanayotgan bo'lsa 409 (ikkinchi pullik AI chaqiruv va
    `lab_analysis_values` dagi IntegrityError oldini olish uchun)."""
    if not _is_in_progress(analyse.status, analyse.updated_at, analyse.created_at):
        return
    db.rollback()  # `FOR UPDATE` qulfi darhol bo'shasin
    logger.info("Lab: tahlil hali davom etmoqda, so'rov rad etildi: analyse_id=%d", analyse.id)
    raise HTTPException(status_code=409, detail=_tr(
        lang,
        "Tahlil hali davom etmoqda. Natija tayyor bo'lishini kuting.",
        "Анализ ещё выполняется. Дождитесь результата.",
        "The analysis is still in progress. Please wait for the result.",
    ))


def _patient_birthdate(db: Session, patcient_id: int):
    return db.execute(
        text("SELECT birthdate FROM patients WHERE id = :id"), {"id": patcient_id}
    ).scalar()


def _parse_form_date(value: str | None, lang: str, birthdate=None) -> datetime.datetime | None:
    """Formadagi tahlil sanasi (L-30): ISO matn → datetime, `lab_dates.validate`
    bilan tekshirilgan (2000..bugun+1, tug'ilgan kundan keyin). Xato — 400."""
    if value is None or not str(value).strip():
        return None
    try:
        parsed = datetime.datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=_tr(
            lang,
            "Tahlil sanasi noto'g'ri formatda.",
            "Неверный формат даты анализа.",
            "The analysis date has an invalid format.",
        ))
    # Taqqoslash mahalliy kun bo'yicha (forma mahalliy yarim tunni UTC da yuboradi)
    local_day = (parsed.astimezone(lab_dates.TZ) if parsed.tzinfo else parsed).date()
    if lab_dates.validate(local_day, birthdate) is None:
        raise HTTPException(status_code=400, detail=_tr(
            lang,
            "Tahlil sanasi noto'g'ri: u 2000-yildan keyin, bugundan kech emas "
            "va bemorning tug'ilgan kunidan keyin bo'lishi kerak.",
            "Неверная дата анализа: она должна быть после 2000 года, не позже "
            "сегодняшнего дня и после даты рождения пациента.",
            "Invalid analysis date: it must be after 2000, not later than today "
            "and after the patient's date of birth.",
        ))
    return parsed


def _lock_patient_uploads(db: Session, patcient_id: int) -> None:
    """Bemorning laboratoriya yuklashlari uchun tranzaksiya qulfi (L-39).

    `pg_advisory_xact_lock` — sxema o'zgarishisiz; tranzaksiya commit yoki
    rollback bo'lganda o'zi bo'shaydi. Parallel so'rov shu yerda kutadi va
    takror tekshiruvida birinchi so'rov yozgan fayllarni ko'radi.
    """
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"lab:{patcient_id}"},
    )


def _start_lab_ai(analyse_id: int, uploads: list[_LabUpload], age: int, gender: str, lang: str,
                  bulk: bool = False, extraction: dict | None = None) -> None:
    """Fon rejimida AI tahlilni ishga tushiradi (browser yopilsa ham davom etadi)."""
    task = asyncio.create_task(_lab_ai_background(
        analyse_id, [(u.content, u.fname) for u in uploads], age, gender, lang, bulk, extraction
    ))
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)


@router.post("/analyze")
async def analyze(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    doctor_id: list[int] | None = Form(None),
    # Bir yoki bir nechta fayl (1..MAX_LAB_FILES) — bitta topshiriq natijalari
    file: list[UploadFile] = File(...),
    lab_category_id: list[int] | None = Form(None),
    created_doctor_id: int = Form(...),
    clinic_id: int = Form(...),
    patcient_id: int = Form(...),
    gender: Optional[str] = Form(None),
    lang: str = Form(...),
    age: Optional[int] = Form(None),
    analysis_date: str | None = Form(None),
    # Foydalanuvchi takror haqidagi ogohlantirishni ko'rib, ataylab davom
    # etishni tanlaganda frontend buni `true` qilib yuboradi (T-096)
    force_duplicate: bool = Form(False),
    # Asl fayl nomlari. .NET proksisi ularni alohida yuboradi, chunki
    # multipart dagi nom ASCII ga tozalanadi va kirill nomlar
    # butunlay yo'qolib ketardi (T-101). `original_filename` — eski
    # mijozlar uchun (faqat birinchi fayl).
    original_filename: str | None = Form(None),
    original_filenames: list[str] | None = Form(None),
    # Ommaviy yuklash (arxiv importi): AI arzon tarifda (flex), natija sekinroq
    bulk: bool = Form(False),
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    names = original_filenames or ([original_filename] if original_filename else None)

    # Fayllar soni, turi, hajmi va (rasm bo'lsa) sifati tekshiriladi.
    # Yozuv yaratilishidan OLDIN — foydalanuvchi darhol aniq xabar oladi.
    uploads = await _read_lab_uploads(file, names, lang)

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

    # Formadagi sana — fayllar diskka yozilishidan OLDIN tekshiriladi (L-30):
    # ilgari noto'g'ri format `fromisoformat` da 500 berib, yetim fayllar
    # qolardi; 1926 kabi xato yil esa qabul qilinib, manba `user` bo'lgani
    # uchun AI uni hech qachon tuzatmasdi.
    parsed_date = _parse_form_date(analysis_date, lang, _patient_birthdate(db, patcient_id))

    # Takror tekshiruvi va yozuv yaratish bitta qulf ostida (L-39): bir
    # vaqtda kelgan ikkita bir xil yuklash ikkalasi ham tekshiruvdan o'tib
    # ketardi. Qulf tranzaksiya oxirida (quyidagi commit) bo'shaydi — shuning
    # uchun yozuv va fayllar ro'yxati oraliq commit siz yoziladi.
    _lock_patient_uploads(db, patcient_id)

    # Fayllardan biri shu bemorga allaqachon yuklanganmi? Tekshiruv
    # fayllar diskka yozilishidan va yozuv yaratilishidan OLDIN — takror
    # bo'lsa hech narsa qoldirmasdan to'xtaydi.
    digests = duplicate_guard.check_many(
        db, "lab", patcient_id, [u.content for u in uploads], force_duplicate
    )

    saved = [
        {
            "file_link": save_analyse_file(u.content, u.fname),
            "original_filename": u.original_filename,
            "file_hash": digest,
        }
        for u, digest in zip(uploads, digests)
    ]

    # Lab analyse yozuvini yaratish (status=0 — kutmoqda)
    lab_analyse = create_lab_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=saved[0]["file_link"],
        analysis_date=parsed_date,
        commit=False,
    )

    # AI qaysi tilda javob berishi shu yerda qayd etiladi: natija
    # boshqa tilli shifokorga ochilganda sababi tushunarli bo'lsin (T-059)
    lab_analyse.ai_lang = (lang or 'uz')[:5]
    # Formada kiritilgan sana — AI fayldagi sana bilan almashtirmaydi.
    # Kiritilmagan bo'lsa u fayldan olinadi (`_apply_document_date`).
    if parsed_date:
        lab_analyse.analysis_date_source = lab_dates.SOURCE_USER

    # Fayllar ro'yxati; birinchisi `analyse_file_link`, `original_filename`
    # va `file_hash` ustunlariga ham yoziladi (eski kod uchun)
    set_lab_analysis_files(db, lab_analyse.id, saved, commit=False)
    db.commit()  # takror tekshiruvi qulfi shu yerda bo'shaydi

    # Shifokorlarni bog'lash
    if doctor_id:
        for d_id in doctor_id:
            await create_lab_analyse_doctor(session=db, lab_analyse_id=lab_analyse.id, doctor_id=d_id)

    # Kategoriyalarni bog'lash (yangi interfeys yubormaydi; eski mijozlar uchun)
    if lab_category_id:
        for c_id in lab_category_id:
            await create_lab_analyse_category(session=db, lab_analyse_id=lab_analyse.id, category_id=c_id)

    _start_lab_ai(lab_analyse.id, uploads, age, gender, lang, bulk=bulk)
    logger.info("Lab: tahlil yaratildi: analyse_id=%d, fayllar=%d", lab_analyse.id, len(saved))

    # Darhol javob qaytarish — frontend formani tozalaydi, list sahifasidan natija ko'rinadi
    return JSONResponse(content={
        "lab_id": lab_analyse.id,
        "status": "processing",
        "analyse_file_path": saved[0]["file_link"],
        "files_count": len(saved),
    })


@router.post("/replace-file")
async def replace_file(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    id: int = Form(...),
    file: list[UploadFile] = File(...),
    gender: Optional[str] = Form(None),
    lang: str = Form(...),
    age: Optional[int] = Form(None),
    original_filename: str | None = Form(None),
    original_filenames: list[str] | None = Form(None),
):
    """Mavjud Laboratoriya tahlilining fayllarini almashtirib, qayta tahlil qilish.

    Foydalanuvchi noto'g'ri fayl yuklaganda (masalan boshqa turdagi hujjat)
    yangi tahlil yaratmasdan, o'sha yozuvning fayllarini almashtirish imkonini
    beradi. Yuborilgan fayllar ESKILARINING HAMMASINI almashtiradi (1..10 ta).
    Bemor, shifokorlar va boshqa bog'lanishlar saqlanib qoladi.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    analyse = get_lab_analyse_by_id(db, id)
    if not analyse:
        raise HTTPException(status_code=404, detail="Tahlil topilmadi")
    # Tahlil hali ishlanayotgan bo'lsa — fayllarni o'qimasdan 409 (L-16)
    _ensure_not_running(db, analyse, lang)

    names = original_filenames or ([original_filename] if original_filename else None)
    uploads = await _read_lab_uploads(file, names, lang)

    # Tekshiruv va status 0 ga o'tkazish orasida parallel so'rov o'tmasin:
    # yozuv qulflanadi va holat qayta tekshiriladi (qulf commit gacha)
    analyse = lock_lab_analyse(db, id)
    if not analyse:
        raise HTTPException(status_code=404, detail="Tahlil topilmadi")
    _ensure_not_running(db, analyse, lang)

    saved = [
        {
            "file_link": save_analyse_file(u.content, u.fname),
            "original_filename": u.original_filename,
            "file_hash": duplicate_guard.file_hash(u.content),
        }
        for u in uploads
    ]
    set_lab_analysis_files(db, id, saved, commit=False)

    # Yozuvni qayta tahlilga tayyorlash: eski AI natijasi va uning tarjima
    # keshi tozalanadi; yangi natija so'rov tilida bo'ladi (L-13)
    update_lab_analyse(
        session=db,
        analyse_id=id,
        status=0,
        clear_ai_answer=True,
        ai_lang=(lang or 'uz')[:5],
    )

    _start_lab_ai(id, uploads, age, gender, lang)
    logger.info(
        "Laboratoriya: fayllar almashtirildi (%d ta) va qayta tahlilga yuborildi: analyse_id=%d",
        len(saved), id,
    )

    return JSONResponse(content={
        "lab_id": id,
        "status": "processing",
        "analyse_file_path": saved[0]["file_link"],
        "files_count": len(saved),
    })


def _stored_extraction(analyse) -> dict | None:
    """Xato bilan tugagan tahlilning saqlangan o'qish natijasi (bo'lsa)."""
    if analyse.status != STATUS_ERROR or not analyse.ai_answer_data:
        return None
    data = analyse.ai_answer_data
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except ValueError:
            return None
    ex = data.get("_extraction") if isinstance(data, dict) else None
    return ex if isinstance(ex, dict) and isinstance(ex.get("rows"), list) else None


@router.post("/retry")
async def retry_analyse(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    id: int = Form(...),
    gender: Optional[str] = Form(None),
    lang: str = Form("uz"),
    age: Optional[int] = Form(None),
    # Arxiv importining qayta urinishi — arzon (flex) tarifda
    bulk: bool = Form(False),
):
    """Xatolik bilan tugagan tahlilni MAVJUD fayl(lar) bilan qayta ishga tushirish.

    Nima uchun kerak (T-044): ilgari `status = -1` yozuvida foydalanuvchida
    hech qanday harakat imkoniyati yo'q edi — yozuv ro'yxatda abadiy
    "Xatolik" bo'lib turardi va yagona yechim uni o'chirib, bemor,
    shifokorlar va shikoyatlarni qaytadan kiritish edi.

    Fayllar almashtirilmaydi — tahlilning BARCHA fayllari qayta yuboriladi.
    Fayl noto'g'ri bo'lsa `/replace-file` ishlatiladi.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    analyse = get_lab_analyse_by_id(db, id)
    if not analyse:
        raise HTTPException(status_code=404, detail="Tahlil topilmadi")
    # Tahlil hali ishlanayotgan bo'lsa — ikkinchi pullik AI chaqiruv yo'q (L-16)
    _ensure_not_running(db, analyse, lang)

    uploads: list[_LabUpload] = []
    for link in get_lab_analysis_file_links(db, analyse):
        path = storage.resolve_existing(link)
        if path is None:
            raise HTTPException(
                status_code=400,
                detail="Tahlil fayli topilmadi. Faylni qaytadan yuklang.",
            )
        uploads.append(_LabUpload(path.read_bytes(), path.name, None))
    if not uploads:
        raise HTTPException(
            status_code=400,
            detail="Tahlil fayli topilmadi. Faylni qaytadan yuklang.",
        )

    # Qulf ostida holat qayta tekshiriladi — parallel retry o'tib ketmasin
    analyse = lock_lab_analyse(db, id)
    if not analyse:
        raise HTTPException(status_code=404, detail="Tahlil topilmadi")
    _ensure_not_running(db, analyse, lang)

    # Xato o'qishdan KEYINGI bosqichda bo'lgan bo'lsa — fayl qayta o'qilmaydi
    extraction = _stored_extraction(analyse)

    # Yozuvni qayta tahlilga tayyorlash: eski natija/xatolik matni va uning
    # tarjima keshi tozalanadi; retry UI tilida yuboriladi (L-13)
    update_lab_analyse(
        session=db,
        analyse_id=id,
        status=0,
        clear_ai_answer=True,
        ai_lang=(lang or 'uz')[:5],
    )

    _start_lab_ai(id, uploads, age, gender, lang, bulk=bulk, extraction=extraction)
    logger.info("Laboratoriya: qayta tahlilga yuborildi: analyse_id=%d, fayllar=%d, o'qilgan qatorlar=%s",
                id, len(uploads), "bor" if extraction else "yo'q")

    return JSONResponse(content={"lab_id": id, "status": "processing"})
