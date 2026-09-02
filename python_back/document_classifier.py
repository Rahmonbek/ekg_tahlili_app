"""
Hujjat turini aniqlash moduli.

Maqsad: foydalanuvchi yuklagan fayl tanlangan tahlil turiga mos kelishini
asosiy (qimmat) AI tahlilidan OLDIN tekshirish.

Nima uchun kerak:
    Laboratoriya bo'limiga Holter hisoboti yuklansa, AI uni o'qib kardiologik
    xulosa yozadi va u laboratoriya tahlili sifatida saqlanadi. Shifokor
    ro'yxatda yashil "Normal" belgisini ko'rib tahlilni ochmaydi.
    Bu modul shunday holatlarni tahlil boshlanishidan oldin to'xtatadi.

Foydalanish:
    from document_classifier import classify_document, DocumentMismatch

    mismatch = classify_document(content, fname, expected="laboratoriya")
    if mismatch:
        # tahlil qilinmaydi, status=3 bilan saqlanadi
        ...
"""
import io
import json
import logging
import os
from dataclasses import dataclass, asdict
from typing import Optional

from openai import OpenAI

from config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

# Tahlil status kodlari (EKG / Lab / Holter / SMAD uchun umumiy)
STATUS_PENDING = 0        # yaratildi, navbatda
STATUS_PROCESSING = 1     # fayl qayta ishlandi, AI kutilmoqda
STATUS_DONE = 2           # AI natijasi tayyor
STATUS_FILE_MISMATCH = 3  # fayl tanlangan tahlil turiga mos emas — qayta yuklash kerak
STATUS_ERROR = -1         # texnik xatolik

# Tasniflash uchun arzon model — asosiy tahlil modelidan alohida sozlanadi
CLASSIFIER_MODEL: str = os.getenv("OPENAI_CLASSIFIER_MODEL", "gpt-5-mini")

# Tasniflash o'chirilgan bo'lsa (masalan tashqi xizmat ishlamayotganda)
CLASSIFIER_ENABLED: bool = os.getenv("DOCUMENT_CLASSIFIER_ENABLED", "true").lower() != "false"

# Tahlil turlari va ularning foydalanuvchiga ko'rinadigan nomlari
ANALYSIS_TYPES = {
    "ekg": {
        "uz": "EKG (elektrokardiogramma)",
        "ru": "ЭКГ (электрокардиограмма)",
        "en": "ECG (electrocardiogram)",
    },
    "holter": {
        "uz": "Holter monitoring (24 soatlik yurak monitoringi)",
        "ru": "Холтер мониторинг (суточное мониторирование ЭКГ)",
        "en": "Holter monitoring (24-hour cardiac monitoring)",
    },
    "smad": {
        "uz": "SMAD (sutkalik qon bosimi monitoringi)",
        "ru": "СМАД (суточное мониторирование АД)",
        "en": "ABPM (ambulatory blood pressure monitoring)",
    },
    "laboratoriya": {
        "uz": "Laboratoriya tahlili",
        "ru": "Лабораторный анализ",
        "en": "Laboratory test",
    },
}

# Tasnif natijasi sifatida qabul qilinadigan qiymatlar
_VALID_KINDS = set(ANALYSIS_TYPES) | {"boshqa", "aniqlanmadi"}

_SYSTEM_PROMPT = """Sen tibbiy hujjatlarni turkumlovchi yordamchisan.
Senga bitta fayl beriladi (rasm yoki PDF). Vazifang — u QANDAY turdagi tibbiy
tekshiruv natijasi ekanini aniqlash. Hujjatni tahlil qilma, faqat turini ayt.

Mumkin bo'lgan qiymatlar:
  "ekg"          — elektrokardiogramma: yurak elektr faoliyatining millimetrli
                   (pushti/qizil katakli) qog'ozga bosilgan egri chiziqli yozuvi.
                   BUNGA UZUN, UZLUKSIZ RITM LENTASI HAM TO'LIQ KIRADI — lenta
                   qancha uzun bo'lishidan qat'i nazar, agar u qog'ozdagi EKG
                   egri chizig'i bo'lsa, bu "ekg". EKG apparati bosib chiqargan
                   har qanday hisobot ham "ekg".
  "holter"       — FAQAT 24-48 soatlik Holter monitoringi HISOBOTI: kompyuterda
                   tayyorlangan, ko'p sahifali, ichida statistika, jadvallar,
                   gistogrammalar, soatlik yurak urishi trend grafiklari bo'lgan
                   HUJJAT. Oddiy qog'oz EKG lentasi — hatto juda uzun bo'lsa ham —
                   Holter EMAS. Statistik jadval/grafik ko'rinmasa, "holter" DEMA.
  "smad"         — sutkalik arterial bosim monitoringi (SMAD/ABPM) hisoboti
  "laboratoriya" — qon, siydik va boshqa laborator ko'rsatkichlar natijasi
  "boshqa"       — tibbiy hujjat, lekin yuqoridagilardan biri emas
                   (masalan UZI, rentgen, MRT, retsept, ma'lumotnoma)
  "aniqlanmadi"  — hujjat o'qilmaydi, bo'sh, juda xira yoki tibbiy hujjat emas

Faqat JSON qaytar, boshqa hech narsa yozma:
{"tur": "<qiymat>", "ishonch": <0.0-1.0>, "izoh": "<bir jumlada nima ko'rganing>"}"""


@dataclass
class DocumentMismatch:
    """Yuklangan fayl kutilgan tahlil turiga mos kelmaganda qaytariladi."""
    expected: str          # kutilgan tur kaliti, masalan "laboratoriya"
    detected: str          # aniqlangan tur kaliti, masalan "holter"
    confidence: float
    note: str              # modelning qisqa izohi

    def to_ai_answer(self, lang: str = "uz") -> str:
        """`ai_answer_data` ustuniga yoziladigan JSON.

        Diqqat: bu yerda `automatic_analysis_bool` ATAYLAB yo'q — natija
        baholanmagan, shuning uchun ro'yxatda yashil "Normal" chiqmasligi kerak.
        """
        lang = lang if lang in ("uz", "ru", "en") else "uz"
        expected_name = ANALYSIS_TYPES.get(self.expected, {}).get(lang, self.expected)
        detected_name = ANALYSIS_TYPES.get(self.detected, {}).get(lang, None)

        messages = {
            "uz": (
                f"Yuklangan fayl «{expected_name}» bo'limiga mos kelmaydi. "
                + (f"Fayl mazmuni «{detected_name}» hujjatiga o'xshaydi. " if detected_name
                   else "Faylda ushbu tahlil uchun kerakli ma'lumot topilmadi. ")
                + "Faylni almashtiring yoki to'g'ri bo'limga yuklang."
            ),
            "ru": (
                f"Загруженный файл не соответствует разделу «{expected_name}». "
                + (f"Содержимое файла похоже на документ «{detected_name}». " if detected_name
                   else "В файле не найдены данные для этого анализа. ")
                + "Замените файл или загрузите его в правильный раздел."
            ),
            "en": (
                f"The uploaded file does not match the «{expected_name}» section. "
                + (f"The file looks like a «{detected_name}» document. " if detected_name
                   else "No data for this analysis type was found in the file. ")
                + "Replace the file or upload it to the correct section."
            ),
        }

        return json.dumps({
            "xato": "fayl_turi_mos_emas",
            "kutilgan_tur": self.expected,
            "aniqlangan_tur": self.detected,
            "ishonch": round(self.confidence, 2),
            "xabar": messages[lang],
            "izoh": self.note,
        }, ensure_ascii=False)

    def as_dict(self) -> dict:
        return asdict(self)


def _extract_json(text: str) -> dict:
    """Model javobidan JSON ajratib olish (kod bloki bilan o'ralgan bo'lishi mumkin)."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.split("```")[1] if "```" in text[3:] else text.strip("`")
        text = text.lstrip("json").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("javobda JSON topilmadi")
    return json.loads(text[start:end + 1])


def classify_document(
    content: bytes,
    filename: str,
    expected: str,
    *,
    min_confidence: float = 0.6,
) -> Optional[DocumentMismatch]:
    """Fayl kutilgan tahlil turiga mos kelishini tekshiradi.

    Args:
        content:        fayl baytlari
        filename:       fayl nomi (kengaytmasi rasm/hujjat ekanini aniqlaydi)
        expected:       kutilgan tur — "ekg" | "holter" | "smad" | "laboratoriya"
        min_confidence: shu chegaradan past ishonchda mos kelmaslik e'lon qilinmaydi
                        (noto'g'ri rad etishning oldini olish uchun)

    Returns:
        DocumentMismatch — fayl mos kelmasa;
        None             — fayl mos kelsa, tasnif ishonchsiz bo'lsa yoki
                           tasniflash xizmati ishlamasa (tahlil to'xtatilmaydi).
    """
    if not CLASSIFIER_ENABLED:
        return None

    if expected not in ANALYSIS_TYPES:
        logger.warning("Noma'lum kutilgan tur: %s — tasniflash o'tkazib yuborildi", expected)
        return None

    if not OPENAI_API_KEY or not content:
        return None

    try:
        # Timeout: klassifikator osilib qolmasin (asosiy tahlildan oldingi qadam).
        client = OpenAI(
            api_key=OPENAI_API_KEY,
            timeout=float(os.getenv("AI_CLASSIFIER_TIMEOUT", "60")),
            max_retries=1,
        )

        fobj = io.BytesIO(content)
        fobj.name = filename
        uploaded = client.files.create(file=fobj, purpose="user_data")

        is_image = filename.lower().endswith((".png", ".jpg", ".jpeg"))
        part_type = "input_image" if is_image else "input_file"

        resp = client.responses.create(
            model=CLASSIFIER_MODEL,
            input=[{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": _SYSTEM_PROMPT},
                    {"type": part_type, "file_id": uploaded.id},
                ],
            }],
        )

        parsed = _extract_json(resp.output_text)
        detected = str(parsed.get("tur", "aniqlanmadi")).strip().lower()
        note = str(parsed.get("izoh", ""))[:300]
        try:
            confidence = float(parsed.get("ishonch", 0))
        except (TypeError, ValueError):
            confidence = 0.0

        if detected not in _VALID_KINDS:
            logger.warning("Tasniflagich kutilmagan qiymat qaytardi: %r", detected)
            return None

        # Fayl nomini log'ga yozmaymiz — u bemor ismini o'z ichiga olishi mumkin
        logger.info(
            "Hujjat tasnifi: kutilgan=%s aniqlangan=%s ishonch=%.2f",
            expected, detected, confidence,
        )

        if detected == expected:
            return None

        # Ishonch past bo'lsa tahlilni to'xtatmaymiz — noto'g'ri rad etish
        # foydalanuvchi uchun mos kelmagan natijadan ko'ra ko'proq zarar keltiradi
        if confidence < min_confidence:
            logger.info(
                "Mos kelmaslik aniqlandi, lekin ishonch past (%.2f < %.2f) — tahlil davom etadi",
                confidence, min_confidence,
            )
            return None

        return DocumentMismatch(
            expected=expected,
            detected=detected,
            confidence=confidence,
            note=note,
        )

    except Exception as exc:
        # Tasniflash xizmati ishlamasa asosiy tahlilni to'xtatmaymiz
        logger.warning("Hujjat tasniflashda xatolik, tahlil davom etadi: %s", exc)
        return None
