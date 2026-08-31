"""
NMED - Fayl turi tekshiruvi moduli.
Faqat kengaytmaga emas, haqiqiy fayl content (magic bytes) ga qarab tekshiradi.
"""
import os
import re
import unicodedata
from email.header import decode_header

# Ruxsat etilgan fayl turlari va ularning magic bytes (imzo) lari
ALLOWED_FILE_SIGNATURES = {
    '.png': [b'\x89PNG\r\n\x1a\n'],
    '.jpg': [b'\xff\xd8\xff'],
    '.jpeg': [b'\xff\xd8\xff'],
    '.pdf': [b'%PDF'],
    '.xml': [b'<?xml', b'\xef\xbb\xbf<?xml'],
    '.csv': None,
    '.txt': None,
    '.tsv': None,
}

ENCODED_WORD_PATTERN = re.compile(r"=\?[^?]+\?[bBqQ]\?[^?]+\?=")


def normalize_filename(filename: str) -> str:
    """
    RFC 2047/MIME encoded fayl nomlarini oddiy UTF-8 ko'rinishga keltiradi.
    Masalan:
    =?utf-8?b?...?=
    """
    if not filename:
        return ""

    try:
        parts = decode_header(filename)
        decoded_parts = []
        for value, encoding in parts:
            if isinstance(value, bytes):
                decoded_parts.append(value.decode(encoding or "utf-8", errors="ignore"))
            else:
                decoded_parts.append(value)
        normalized = "".join(decoded_parts).strip()
        return normalized or filename.strip()
    except Exception:
        return filename.strip()


def sanitize_filename(filename: str, default_stem: str = "upload") -> str:
    normalized = normalize_filename(filename)
    base_name = os.path.basename(normalized).strip().replace("\\", "/").split("/")[-1]
    stem, ext = os.path.splitext(base_name)
    original_has_encoded_word = bool(ENCODED_WORD_PATTERN.search(filename or ""))
    normalized_has_encoded_word = bool(ENCODED_WORD_PATTERN.search(normalized))

    if original_has_encoded_word and (normalized == (filename or "").strip() or normalized_has_encoded_word):
        stem = default_stem
        ext = ""

    ascii_stem = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
    ascii_stem = re.sub(r"[^A-Za-z0-9._ -]+", "_", ascii_stem)
    ascii_stem = re.sub(r"\s+", "_", ascii_stem).strip("._- ")
    ascii_stem = ascii_stem or default_stem

    safe_ext = re.sub(r"[^A-Za-z0-9.]+", "", ext.lower())
    if safe_ext and not safe_ext.startswith("."):
        safe_ext = f".{safe_ext}"

    return f"{ascii_stem}{safe_ext}"


def detect_extension_by_signature(content: bytes) -> str | None:
    for ext, signatures in ALLOWED_FILE_SIGNATURES.items():
        if signatures is None:
            continue
        for sig in signatures:
            if content[:len(sig)] == sig:
                return ext
    return None


def prepare_upload_filename(filename: str, content: bytes, default_stem: str = "upload") -> str:
    safe_filename = sanitize_filename(filename, default_stem=default_stem)
    stem, ext = os.path.splitext(safe_filename)

    if ext in ALLOWED_FILE_SIGNATURES:
        return safe_filename

    detected_ext = detect_extension_by_signature(content)
    if detected_ext:
        return f"{stem or default_stem}{detected_ext}"

    return safe_filename if ext else f"{stem or default_stem}.bin"


def validate_file_type(filename: str, content: bytes) -> bool:
    """
    Fayl nomi va content asosida fayl turini tekshiradi.
    """
    normalized_filename = normalize_filename(filename)
    _, ext = os.path.splitext(normalized_filename.lower())

    if ext not in ALLOWED_FILE_SIGNATURES:
        return detect_extension_by_signature(content) is not None

    signatures = ALLOWED_FILE_SIGNATURES[ext]

    if signatures is None:
        return True

    for sig in signatures:
        if content[:len(sig)] == sig:
            return True

    return False


def get_allowed_extensions() -> list[str]:
    return list(ALLOWED_FILE_SIGNATURES.keys())


# ─────────────────────────────────────────────────────────────────────────────
# Tahlil turiga qarab ruxsat etilgan formatlar va fayl sifati tekshiruvi
# ─────────────────────────────────────────────────────────────────────────────

import io as _io
import logging as _logging

_logger = _logging.getLogger(__name__)

# Har bir tahlil turi uchun ruxsat etilgan kengaytmalar — YAGONA MANBA.
# Frontend ham shu ro'yxatga tayanishi kerak (`GET /api/meta/upload-rules`).
#
# Diqqat: `.txt` ATAYLAB yo'q. Ilgari u `.csv` bilan bir qatorda ruxsat etilgan
# edi va oddiy matn fayli EKG sifatida qabul qilinardi (auditda tasdiqlangan).
ALLOWED_BY_ANALYSIS_TYPE = {
    "ecg":    {".xml", ".csv", ".tsv", ".png", ".jpg", ".jpeg"},
    "holter": {".pdf", ".png", ".jpg", ".jpeg"},
    "smad":   {".pdf", ".png", ".jpg", ".jpeg"},
    "lab":    {".pdf", ".png", ".jpg", ".jpeg"},
    "diagnose": {".pdf", ".png", ".jpg", ".jpeg"},
}

# Fayl hajmi chegaralari (bayt)
MAX_FILE_SIZE = 25 * 1024 * 1024   # 25 MB
MIN_FILE_SIZE = 100                # bo'sh yoki buzilgan fayl

# Rasm sifati uchun minimal talablar
MIN_IMAGE_WIDTH = 800
MIN_IMAGE_HEIGHT = 600

#: Laplasian dispersiyasi — rasm o'tkirligi o'lchovi. Undan past qiymat
#: fokusdan chiqqan yoki qimirlagan suratni bildiradi. Chegara ataylab
#: past olingan: haqiqiy EKG lentasini rad etishdan ko'ra shubhali
#: suratni o'tkazib yuborish xavfsizroq — ikkinchi qatlam (AI tasniflagich)
#: baribir tekshiradi.
#: Haqiqiy EKG suratlarida o'lchangan qiymatlar: 2249-9937. Chegara
#: ataylab juda past (12) — haqiqiy tahlilni rad etishdan ko'ra shubhali
#: suratni o'tkazib yuborish xavfsizroq, ikkinchi qatlam (AI tasniflagich)
#: baribir tekshiradi.
MIN_SHARPNESS = 12.0

# Qiyshiqlik (skew) tekshiruvi ATAYLAB QO'SHILMADI.
#
# Urinib ko'rildi: loyihaviy profil usuli bilan burchakni o'lchash.
# Natija yaroqsiz chiqdi — o'lchagich barcha rasmlarga qidiruv
# chegarasidagi qiymatni (-30°) qaytardi va mavjud 13 ta haqiqiy
# rasmdan 11 tasini rad etgan bo'lardi. Sabab: siljish oshgani sari
# ustunlar kamroq qatorlarga to'planadi va dispersiya sun'iy o'sadi,
# ya'ni usul eng katta burchakni doim "eng yaxshi" deb tanlaydi.
#
# To'g'ri chegara belgilash uchun tasdiqlangan haqiqiy suratlar
# to'plami kerak: hozirgi yuklamalar asosan generatsiya qilingan EKG
# grafiklari (barchasida burchak 0°) va ular kichik burchaklarni
# baholashga yaramaydi.
#
# Noto'g'ri sozlangan tekshiruv haqiqiy tahlilni to'sib qo'yadi —
# bu tekshiruvsizlikdan ko'ra yomonroq.



#: O'rtacha yorqinlik chegaralari (0-255). Bulardan tashqarida rasm
#: deyarli qora yoki deyarli oq bo'ladi.
#
#: Chegaralar haqiqiy EKG suratlari o'lchanib tanlangan: mavjud namunalarda
#: o'rtacha yorqinlik 157-229 oralig'ida. Yuqori chegara ataylab baland
#: (250) — oq qog'ozdagi skanerlangan EKG ni rad etmaslik uchun; butunlay
#: oq varaqni esa kontrast tekshiruvi (std < 6) allaqachon ushlaydi.
MIN_BRIGHTNESS = 25
MAX_BRIGHTNESS = 250

#: PDF dan o'qilgan matn shu belgidan kam bo'lsa — skanerlangan
#: hujjat (matn qatlami yo'q) deb hisoblanadi.
MIN_PDF_TEXT_CHARS = 40


class FileValidationError(ValueError):
    """Fayl talablarga javob bermaydi — foydalanuvchiga 400 qaytariladi."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _msg(lang: str, uz: str, ru: str, en: str) -> str:
    return {"uz": uz, "ru": ru, "en": en}.get(lang, uz)


def validate_upload(
    filename: str,
    content: bytes,
    analysis_type: str,
    lang: str = "uz",
) -> None:
    """Yuklangan faylni tahlil turiga moslik va sifat bo'yicha tekshiradi.

    Talabga javob bermasa `FileValidationError` chiqaradi.
    Bu tekshiruv AI ga yuborishdan OLDIN, hatto yozuv yaratilishidan ham oldin
    bajariladi — shunda foydalanuvchi darhol aniq xabar oladi.
    """
    ext = os.path.splitext((filename or "").lower())[1]
    allowed = ALLOWED_BY_ANALYSIS_TYPE.get(analysis_type, set())

    # 1. Hajm
    if not content or len(content) < MIN_FILE_SIZE:
        raise FileValidationError("empty_file", _msg(
            lang,
            "Yuklangan fayl bo'sh yoki buzilgan. Boshqa fayl tanlang.",
            "Загруженный файл пуст или повреждён. Выберите другой файл.",
            "The uploaded file is empty or corrupted. Please choose another file.",
        ))

    if len(content) > MAX_FILE_SIZE:
        mb = MAX_FILE_SIZE // (1024 * 1024)
        raise FileValidationError("file_too_large", _msg(
            lang,
            f"Fayl hajmi juda katta. Maksimal ruxsat etilgan hajm — {mb} MB.",
            f"Файл слишком большой. Максимально допустимый размер — {mb} МБ.",
            f"The file is too large. The maximum allowed size is {mb} MB.",
        ))

    # 2. Kengaytma tahlil turiga mos kelishi
    if allowed and ext not in allowed:
        pretty = ", ".join(sorted(e.lstrip(".").upper() for e in allowed))
        raise FileValidationError("unsupported_type", _msg(
            lang,
            f"Bu fayl turi qabul qilinmaydi. Ruxsat etilgan formatlar: {pretty}.",
            f"Этот тип файла не поддерживается. Допустимые форматы: {pretty}.",
            f"This file type is not supported. Allowed formats: {pretty}.",
        ))

    # 3. Mazmun kengaytmaga mos kelishi (magic bytes)
    if not validate_file_type(filename, content):
        raise FileValidationError("content_mismatch", _msg(
            lang,
            "Fayl mazmuni uning kengaytmasiga mos kelmaydi. Faylni qayta saqlab, qaytadan yuklang.",
            "Содержимое файла не соответствует его расширению. Пересохраните файл и загрузите снова.",
            "The file content does not match its extension. Please re-save the file and upload again.",
        ))

    # 4. Rasm bo'lsa — o'lcham, yorqinlik va o'tkirlik
    if ext in (".png", ".jpg", ".jpeg"):
        _validate_image(content, lang)

    # 5. PDF bo'lsa — sahifalar va matn qatlami.
    #    Skanerlangan PDF da matn qatlami bo'lmaydi va AI dan foydali
    #    natija olib bo'lmaydi — buni oldindan aytish kerak.
    if ext == ".pdf":
        _validate_pdf(content, lang)


def _validate_image(content: bytes, lang: str) -> None:
    """Rasm o'lchami va sifatini tekshiradi.

    Auditda 40x30 piksellik rasm ham, butunlay bo'sh oq rasm ham EKG sifatida
    qabul qilingan edi. Bunday fayldan AI hech narsa o'qiy olmaydi.
    """
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        _logger.warning("Pillow/numpy mavjud emas — rasm sifati tekshirilmadi")
        return

    try:
        image = Image.open(_io.BytesIO(content))
        image.load()
    except Exception:
        raise FileValidationError("broken_image", _msg(
            lang,
            "Rasmni ochib bo'lmadi. Fayl buzilgan bo'lishi mumkin.",
            "Не удалось открыть изображение. Возможно, файл повреждён.",
            "The image could not be opened. The file may be corrupted.",
        ))

    width, height = image.size
    if width < MIN_IMAGE_WIDTH or height < MIN_IMAGE_HEIGHT:
        raise FileValidationError("image_too_small", _msg(
            lang,
            f"Rasm o'lchami juda kichik ({width}×{height}). Kamida "
            f"{MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT} piksel bo'lishi kerak. "
            "Tahlilni yaxshi yorug'likda, to'g'ridan-to'g'ri tepadan suratga oling.",
            f"Изображение слишком маленькое ({width}×{height}). Требуется минимум "
            f"{MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT} пикселей.",
            f"The image is too small ({width}×{height}). At least "
            f"{MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT} pixels are required.",
        ))

    # Deyarli bir tekis rasm (bo'sh varaq, qorong'i kadr) — mazmun yo'q
    try:
        gray = np.asarray(image.convert("L"), dtype="float64")
        if gray.std() < 6.0:
            raise FileValidationError("image_no_content", _msg(
                lang,
                "Rasmda tahlil qilinadigan mazmun topilmadi (bo'sh yoki juda past kontrastli). "
                "Yaxshiroq sifatli surat yuklang.",
                "На изображении не найдено содержимое для анализа (пустое или очень низкий контраст).",
                "No analyzable content was found in the image (blank or very low contrast).",
            ))
    except FileValidationError:
        raise
    except Exception as exc:
        _logger.warning("Rasm sifatini baholab bo'lmadi: %s", exc)
        return

    # ── Yorqinlik: deyarli qora yoki deyarli oq kadr ──────────────────
    mean = float(gray.mean())
    if mean < MIN_BRIGHTNESS or mean > MAX_BRIGHTNESS:
        raise FileValidationError("image_bad_exposure", _msg(
            lang,
            "Rasm juda qorong'i yoki juda yorug'. Tahlilni yaxshi yorug'likda, "
            "chaqnoqsiz va soyasiz suratga oling.",
            "Изображение слишком тёмное или слишком светлое. Сфотографируйте "
            "анализ при хорошем освещении, без вспышки и теней.",
            "The image is too dark or too bright. Photograph the analysis in "
            "good light, without flash or shadows.",
        ))

    # ── O'tkirlik: Laplasian dispersiyasi ────────────────────────────
    # OpenCV shart emas — 3x3 Laplasian yadrosini numpy bilan qo'llaymiz.
    try:
        sharpness = _laplacian_variance(gray, np)
    except Exception as exc:
        _logger.warning("O'tkirlikni o'lchab bo'lmadi: %s", exc)
        return

    if sharpness < MIN_SHARPNESS:
        raise FileValidationError("image_blurry", _msg(
            lang,
            f"Rasm xira yoki fokusdan chiqqan (o'tkirlik {sharpness:.1f}). "
            "EKG to'lqinlari o'qilmasligi mumkin — qaytadan, qimirlatmasdan "
            "suratga oling.",
            f"Изображение размытое или не в фокусе (резкость {sharpness:.1f}). "
            "Кривые ЭКГ могут быть нечитаемы — сфотографируйте заново, не двигая камеру.",
            f"The image is blurry or out of focus (sharpness {sharpness:.1f}). "
            "The ECG traces may be unreadable — take the photo again, holding the camera steady.",
        ))

def _laplacian_variance(gray, np) -> float:
    """Rasm o'tkirligi: Laplasian filtrining dispersiyasi.

    Xira rasmda qo'shni piksellar orasidagi farq kichik bo'ladi, shuning
    uchun ikkinchi tartibli hosila (Laplasian) ning dispersiyasi past
    chiqadi. Bu xiralikni aniqlashning standart usuli va OpenCV talab
    qilmaydi — 3x3 yadro numpy bilan ham qo'llanadi.
    """
    # Katta rasmni kichraytirib olamiz — o'tkirlik nisbiy o'lchov va
    # 1000 px kenglik baho uchun yetarli, hisoblash esa tezroq.
    h, w = gray.shape
    if w > 1000:
        step = max(1, w // 1000)
        gray = gray[::step, ::step]

    c = gray[1:-1, 1:-1]
    lap = (gray[:-2, 1:-1] + gray[2:, 1:-1] +
           gray[1:-1, :-2] + gray[1:-1, 2:] - 4.0 * c)
    return float(lap.var())


def _validate_pdf(content: bytes, lang: str) -> None:
    """PDF ning yaroqliligi va matn qatlamini tekshiradi.

    Skanerlangan PDF da matn qatlami bo'lmaydi va AI dan foydali natija
    olib bo'lmaydi — foydalanuvchi buni oldindan bilishi kerak.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        _logger.warning("pypdf mavjud emas — PDF mazmuni tekshirilmadi")
        return

    try:
        reader = PdfReader(_io.BytesIO(content))
        pages = len(reader.pages)
    except Exception:
        raise FileValidationError("broken_pdf", _msg(
            lang,
            "PDF faylni ochib bo'lmadi. Fayl buzilgan yoki parol bilan himoyalangan.",
            "Не удалось открыть PDF. Файл повреждён или защищён паролем.",
            "The PDF could not be opened. The file is corrupted or password-protected.",
        ))

    if pages == 0:
        raise FileValidationError("empty_pdf", _msg(
            lang,
            "PDF fayl bo'sh — birorta ham sahifa topilmadi.",
            "PDF-файл пуст — не найдено ни одной страницы.",
            "The PDF is empty — no pages were found.",
        ))

    # Matn qatlami bor-yo'qligi (birinchi 5 sahifa yetarli)
    try:
        text = ""
        for page in reader.pages[:5]:
            text += page.extract_text() or ""
    except Exception as exc:
        _logger.warning("PDF matnini o'qib bo'lmadi: %s", exc)
        return

    if len(text.strip()) < MIN_PDF_TEXT_CHARS:
        raise FileValidationError("pdf_no_text", _msg(
            lang,
            "PDF ichidan matn o'qib bo'lmadi — hujjat skanerlangan rasm ko'rinishida. "
            "Iltimos, laboratoriya tizimidan yuklab olingan asl PDF faylni yuboring.",
            "Не удалось извлечь текст из PDF — документ представляет собой скан. "
            "Пожалуйста, отправьте оригинальный PDF, выгруженный из лабораторной системы.",
            "No text could be extracted from the PDF — the document is a scanned image. "
            "Please send the original PDF exported from the laboratory system.",
        ))


def get_allowed_for(analysis_type: str) -> list[str]:
    """Tahlil turi uchun ruxsat etilgan kengaytmalar (frontend uchun)."""
    return sorted(ALLOWED_BY_ANALYSIS_TYPE.get(analysis_type, set()))
