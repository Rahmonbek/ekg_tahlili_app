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
from lab_analyse import (
    get_lab_analyse_by_id,
    create_lab_analyse,
    update_lab_analyse,
    set_lab_analysis_files,
    get_lab_analysis_file_links,
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
triglycerides - Triglitseridlar (mmol/L)
hdl - HDL (yuqori zichlikli) xolesterin (mmol/L)
ldl - LDL (past zichlikli) xolesterin (mmol/L)
vldl - VLDL (juda past zichlikli) xolesterin (mmol/L)
atherogenic_index - Aterogenlik koeffitsienti (nisbat)
hba1c - Glikirlangan gemoglobin HbA1c (%)
c_peptide - S-peptid (ng/mL)
crp - C-reaktiv oqsil CRP (mg/L)
ggt - Gamma-glutamiltransferaza GGT (U/L)
alp - Ishqoriy fosfataza ALP (U/L)
amylase - Amilaza (U/L)
lipase - Lipaza (U/L)
ldh - Laktatdegidrogenaza LDH (U/L)
ck - Kreatinkinaza KFK (U/L)
ck_mb - Kreatinkinaza-MB KFK-MB (U/L)
uric_acid - Siydik kislotasi (µmol/L)
magnesium - Magniy (mmol/L)
phosphorus - Fosfor (mmol/L)
chloride - Xlor (mmol/L)
ferritin - Ferritin (µg/L)
tibc - Umumiy temir bog'lash qobiliyati TIBC (µmol/L)
transferrin - Transferrin (g/L)
bilirubin_indirect - To'g'ri bo'lmagan (indirekt) bilirubin (µmol/L)
globulin - Globulinlar (g/L)
free_t3 - Erkin T3 FT3 (pmol/L)
t3_total - Umumiy T3 (nmol/L)
t4_total - Umumiy T4 (nmol/L)
vitamin_d - Vitamin D 25-OH (ng/mL)
vitamin_b12 - Vitamin B12 (pg/mL)
folate - Foliy kislotasi (ng/mL)
prothrombin_time - Protrombin vaqti PV (sekund)
prothrombin_index - Protrombin indeksi PTI (%)
inr - Xalqaro normallashgan nisbat INR (nisbat)
aptt - Faollashgan qisman tromboplastin vaqti aPTT (sekund)
fibrinogen - Fibrinogen (g/L)
thrombin_time - Trombin vaqti (sekund)
d_dimer - D-dimer (mg/L)
neutrophils - Neytrofillar (%)
lymphocytes - Limfotsitlar (%)
monocytes - Monotsitlar (%)
eosinophils - Eozinofillar (%)
basophils - Bazofillar (%)
rdw - Eritrositlar taqsimlanish kengligi RDW (%)
mpv - O'rtacha trombotsit hajmi MPV (fL)
pdw - Trombotsitlar taqsimlanish kengligi PDW (%)
pct - Trombokrit PCT (%)
reticulocytes - Retikulotsitlar (%)

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


def _sync_lab_openai(files: list[tuple[bytes, str]], age: int, gender: str, lang: str) -> dict:
    """OpenAI ga sinxron so'rov — asyncio.to_thread() orqali chaqiriladi.

    `files` — `(baytlar, fayl nomi)` ro'yxati, yuklangan tartibda. Barcha
    fayllar BITTA so'rovda yuboriladi: AI natijalarni alohida emas,
    bitta topshiriq sifatida ko'rishi kerak.
    """
    client = OpenAI(api_key=OPENAI_API_KEY)

    prompt = compose_prompt_for_openai(age, gender, lang)
    if len(files) > 1:
        prompt += _multi_file_note(len(files))

    content_parts = [{"type": "input_text", "text": prompt}]
    for index, (content, fname) in enumerate(files, start=1):
        fname = prepare_upload_filename(fname, content, default_stem="lab_upload").lower()

        # 1. Faylni OpenAI ga yuklash
        fobj = io.BytesIO(content)
        fobj.name = fname
        uploaded = client.files.create(file=fobj, purpose="user_data")

        is_image = fname.endswith(('.png', '.jpg', '.jpeg'))
        if len(files) > 1:
            content_parts.append({"type": "input_text", "text": f"Fayl {index}/{len(files)}:"})
        content_parts.append({
            "type": "input_image" if is_image else "input_file",
            "file_id": uploaded.id,
        })

    # 2. AI tahlil
    resp = client.responses.create(
        # Model va fikrlash chuqurligi bitta joyda (A-11)
        **ai_config.holter_smad_lab_request(),
        input=[{"role": "user", "content": content_parts}],
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
    files: list[tuple[bytes, str]],
    age: int,
    gender: str,
    lang: str
) -> None:
    """Browser yopilsa ham davom etadigan AI tahlil — mustaqil DB sessiyasi.

    `files` — `(baytlar, fayl nomi)` ro'yxati (bitta yoki bir nechta).
    """
    db = SessionLocal()
    try:
        # Har bir fayl laboratoriya tahliliga mos kelishi asosiy tahlildan
        # oldin (parallel) tekshiriladi. BIRORTASI mos kelmasa qimmat tahlil
        # yuborilmaydi: begona hujjat xulosani buzadi.
        mismatches = await asyncio.gather(*(
            asyncio.to_thread(classify_document, content, fname, "laboratoriya")
            for content, fname in files
        ))
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

        parsed = await asyncio.to_thread(_sync_lab_openai, files, age, gender, lang)

        # Sxema bo'yicha `digital_measurements` — massiv (A-7). Qolgan
        # kod (bazaga yozish, frontend, PDF) lug'at kutadi, shuning
        # uchun shu yerda o'giriladi. Eski, sxemasiz javoblar lug'at
        # bo'lib kelishi mumkin — ular ham qo'llab-quvvatlanadi.
        digital_measurements = _measurements_to_dict(
            parsed.get("digital_measurements") if isinstance(parsed, dict) else None
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

        # Birligi mos kelmagan (aylantirib bo'lmagan) ko'rsatkich ustunga yozilmaydi
        digital_values = lab_units.column_values(digital_measurements)
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


def _start_lab_ai(analyse_id: int, uploads: list[_LabUpload], age: int, gender: str, lang: str) -> None:
    """Fon rejimida AI tahlilni ishga tushiradi (browser yopilsa ham davom etadi)."""
    task = asyncio.create_task(_lab_ai_background(
        analyse_id, [(u.content, u.fname) for u in uploads], age, gender, lang
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
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...),
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
    import datetime
    lab_analyse = create_lab_analyse(
        session=db,
        patient_id=patcient_id,
        created_doctor_id=created_doctor_id,
        clinic_id=clinic_id,
        status=0,
        analyse_file_link=saved[0]["file_link"],
        analysis_date=datetime.datetime.fromisoformat(analysis_date.replace("Z", "+00:00")) if analysis_date else None
    )

    # AI qaysi tilda javob berishi shu yerda qayd etiladi: natija
    # boshqa tilli shifokorga ochilganda sababi tushunarli bo'lsin (T-059)
    lab_analyse.ai_lang = (lang or 'uz')[:5]
    db.commit()

    # Fayllar ro'yxati; birinchisi `analyse_file_link`, `original_filename`
    # va `file_hash` ustunlariga ham yoziladi (eski kod uchun)
    set_lab_analysis_files(db, lab_analyse.id, saved)

    # Shifokorlarni bog'lash
    if doctor_id:
        for d_id in doctor_id:
            await create_lab_analyse_doctor(session=db, lab_analyse_id=lab_analyse.id, doctor_id=d_id)

    # Kategoriyalarni bog'lash (yangi interfeys yubormaydi; eski mijozlar uchun)
    if lab_category_id:
        for c_id in lab_category_id:
            await create_lab_analyse_category(session=db, lab_analyse_id=lab_analyse.id, category_id=c_id)

    _start_lab_ai(lab_analyse.id, uploads, age, gender, lang)
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
    gender: str = Form(...),
    lang: str = Form(...),
    age: int = Form(...),
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

    names = original_filenames or ([original_filename] if original_filename else None)
    uploads = await _read_lab_uploads(file, names, lang)

    saved = [
        {
            "file_link": save_analyse_file(u.content, u.fname),
            "original_filename": u.original_filename,
            "file_hash": duplicate_guard.file_hash(u.content),
        }
        for u in uploads
    ]
    set_lab_analysis_files(db, id, saved)

    # Yozuvni qayta tahlilga tayyorlash: eski AI natijasi tozalanadi
    update_lab_analyse(
        session=db,
        analyse_id=id,
        status=0,
        clear_ai_answer=True,
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


@router.post("/retry")
async def retry_analyse(
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
    id: int = Form(...),
    gender: str = Form("erkak"),
    lang: str = Form("uz"),
    age: int = Form(0),
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

    # Yozuvni qayta tahlilga tayyorlash: eski xatolik matni tozalanadi
    update_lab_analyse(
        session=db,
        analyse_id=id,
        status=0,
        clear_ai_answer=True,
    )

    _start_lab_ai(id, uploads, age, gender, lang)
    logger.info("Laboratoriya: qayta tahlilga yuborildi: analyse_id=%d, fayllar=%d", id, len(uploads))

    return JSONResponse(content={"lab_id": id, "status": "processing"})
