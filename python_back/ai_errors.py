"""AI tahlil xatoliklarini foydalanuvchiga tushunarli ko'rinishga keltirish.

Nima uchun kerak:
    Ilgari istisno matni to'g'ridan-to'g'ri `ai_answer_data` ustuniga yozilardi.
    Natijada shifokor ekranda quyidagi kabi matnlarni ko'rardi:

        Error code: 401 - {'error': {'message': 'Incorrect API key provided:
        sk-proj-****...G34A. You can find your API key at ...'}}

        unsupported operand type(s) for *: 'NoneType' and 'int'

    Bu ikki jihatdan yomon:
      1. API kalitining prefiksi va provayder nomi oshkor bo'ladi;
      2. `ai_answer_data` — AI natijasi uchun mo'ljallangan maydon, u yerga
         xatolik matnini yozish ma'lumotlar modelini buzadi (frontend uni
         JSON deb parse qilishga urinib yana xato beradi).

    Endi: xom matn faqat serverdagi log'ga yoziladi, bazaga esa turkumlangan
    xatolik kodi va foydalanuvchi tiliga tarjima qilingan xabar tushadi.
"""
import json
import re

# Xatolik turkumlari
ERR_PROVIDER_AUTH = "provider_auth_failed"     # kalit noto'g'ri/muddati o'tgan — ADMIN muammosi
ERR_PROVIDER_QUOTA = "provider_quota_exceeded"  # hisob tugagan — ADMIN muammosi
ERR_PROVIDER_TIMEOUT = "provider_timeout"       # xizmat javob bermadi
ERR_PROVIDER_UNAVAILABLE = "provider_unavailable"
ERR_INVALID_FILE = "invalid_file"               # fayl o'qilmadi — FOYDALANUVCHI muammosi
ERR_INTERNAL = "internal_error"

# Foydalanuvchiga ko'rsatiladigan xabarlar
_MESSAGES = {
    ERR_PROVIDER_AUTH: {
        "uz": "AI xizmatiga ulanib bo'lmadi. Iltimos, administratorga murojaat qiling.",
        "ru": "Не удалось подключиться к AI-сервису. Обратитесь к администратору.",
        "en": "Could not connect to the AI service. Please contact your administrator.",
    },
    ERR_PROVIDER_QUOTA: {
        "uz": "AI xizmati limiti tugagan. Iltimos, administratorga murojaat qiling.",
        "ru": "Лимит AI-сервиса исчерпан. Обратитесь к администратору.",
        "en": "The AI service quota has been exhausted. Please contact your administrator.",
    },
    ERR_PROVIDER_TIMEOUT: {
        "uz": "AI xizmati javob bermadi. Biroz kutib, qayta urinib ko'ring.",
        "ru": "AI-сервис не ответил. Подождите немного и попробуйте снова.",
        "en": "The AI service did not respond. Please wait a moment and try again.",
    },
    ERR_PROVIDER_UNAVAILABLE: {
        "uz": "AI xizmati vaqtincha ishlamayapti. Biroz kutib, qayta urinib ko'ring.",
        "ru": "AI-сервис временно недоступен. Подождите и попробуйте снова.",
        "en": "The AI service is temporarily unavailable. Please try again shortly.",
    },
    ERR_INVALID_FILE: {
        "uz": "Faylni o'qib bo'lmadi. Boshqa fayl yuklab ko'ring.",
        "ru": "Не удалось прочитать файл. Попробуйте загрузить другой файл.",
        "en": "The file could not be read. Please try uploading a different file.",
    },
    ERR_INTERNAL: {
        "uz": "Tahlil qilishda xatolik yuz berdi. Qayta urinib ko'ring yoki administratorga murojaat qiling.",
        "ru": "При анализе произошла ошибка. Попробуйте снова или обратитесь к администратору.",
        "en": "An error occurred during analysis. Please try again or contact your administrator.",
    },
}

# Maxfiy ma'lumot bo'lishi mumkin bo'lgan naqshlar — log'ga ham tushmasligi uchun
_SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"Bearer\s+[A-Za-z0-9._\-]{8,}"),
    re.compile(r"api[_-]?key\s*[:=]\s*\S+", re.I),
]


def classify(exc: BaseException) -> str:
    """Istisnoni turkumga ajratadi."""
    text = f"{type(exc).__name__}: {exc}".lower()

    if "401" in text or "invalid_api_key" in text or "incorrect api key" in text or "unauthorized" in text:
        return ERR_PROVIDER_AUTH
    if "429" in text or "quota" in text or "rate limit" in text or "insufficient_quota" in text:
        return ERR_PROVIDER_QUOTA
    if "timeout" in text or "timed out" in text:
        return ERR_PROVIDER_TIMEOUT
    if "connection" in text or "503" in text or "502" in text or "unavailable" in text:
        return ERR_PROVIDER_UNAVAILABLE
    if isinstance(exc, (TypeError, ValueError, AttributeError, IndexError, KeyError)):
        # Signal/fayl qayta ishlash bosqichidagi xatoliklar
        return ERR_INVALID_FILE
    return ERR_INTERNAL


def sanitize(text: str) -> str:
    """Matndan maxfiy bo'lishi mumkin bo'lgan qismlarni olib tashlaydi."""
    result = str(text)
    for pattern in _SECRET_PATTERNS:
        result = pattern.sub("[YASHIRILGAN]", result)
    return result[:1000]


def to_ai_answer(exc: BaseException, lang: str = "uz") -> str:
    """`ai_answer_data` ustuniga yoziladigan xavfsiz JSON.

    Diqqat: `automatic_analysis_bool` ATAYLAB yo'q — natija baholanmagan,
    shuning uchun ro'yxatda yashil "Normal" belgisi chiqmasligi kerak.
    """
    # Xatolik turkumi provayder holatini kuzatuvchiga ham beriladi:
    # ketma-ket kelgan 'kalit'/'kvota' xatoliklari xizmat buzilganini
    # bildiradi va CRITICAL log yoziladi (T-028).
    import provider_health  # aylanma importni oldini olish uchun shu yerda
    provider_health.record_failure(classify(exc))

    lang = lang if lang in ("uz", "ru", "en") else "uz"
    code = classify(exc)
    return json.dumps({
        "xato": "ai_tahlil_xatosi",
        "xato_kodi": code,
        "xabar": _MESSAGES[code][lang],
        # Foydalanuvchi qayta urinib ko'rishi mantiqli bo'lgan holatlar
        "qayta_urinish_mumkin": code in (ERR_PROVIDER_TIMEOUT, ERR_PROVIDER_UNAVAILABLE),
    }, ensure_ascii=False)


def log_message(exc: BaseException) -> str:
    """Server log'i uchun — maxfiy qismlari tozalangan xom matn."""
    return sanitize(f"{type(exc).__name__}: {exc}")
