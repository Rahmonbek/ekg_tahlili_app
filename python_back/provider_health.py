"""Sun'iy intellekt provayderining holatini kuzatadi (T-028).

Muammo nima edi
---------------
Auditda `OPENAI_API_KEY` yaroqsiz ekani aniqlandi va yuborilgan to'rt
tahlilning to'rttasi ham muvaffaqiyatsiz tugadi. Tizim bu haqda **hech
qanday signal bermasdi**:

* `config.py` faqat kalit bo'sh emasligini tekshirardi, haqiqiyligini emas;
* har bir tahlil jimgina `status = -1` ga o'tardi;
* `/api/health` "kalit bor" deb `ok` qaytaraverardi.

Klinika bir necha kun davomida hech narsa ishlamayotganini bilmasligi
mumkin edi — chunki tashqaridan hamma narsa "sog'lom" ko'rinardi.

Bu modul nima qiladi
--------------------
1. **Ishga tushishda** kalitni haqiqiy so'rov bilan tekshiradi va yaroqsiz
   bo'lsa `CRITICAL` yozadi.
2. **`/api/health`** uchun kalitning haqiqiy holatini beradi — natija
   keshlanadi, chunki har bir salomatlik so'rovida provayderga murojaat
   qilish ham sekin, ham keraksiz.
3. **Ketma-ket xatoliklarni** sanaydi. Ular administrator muammosi
   (kalit yoki kvota) bo'lsa, chegaradan oshganda `CRITICAL` yoziladi va
   salomatlik javobi `degraded` ga o'tadi — monitoring shu orqali xabar
   oladi.

Muvaffaqiyat foizini bu yerda saqlash SHART EMAS: u bazadagi tahlil
holatlaridan hisoblanadi (`SystemStatusController`), ya'ni xizmat qayta
ishga tushsa ham yo'qolmaydi.
"""

import logging
import os
import threading
import time

import ai_errors

logger = logging.getLogger(__name__)

#: Kalit holatini shuncha soniya keshlaymiz. Salomatlik so'rovi tez-tez
#: keladi (monitoring har daqiqada so'rashi mumkin) — har safar
#: provayderga murojaat qilish kechikish va ortiqcha yuk beradi.
_CACHE_TTL_SECONDS = 300

#: Shuncha ketma-ket "administrator muammosi" xatoligidan keyin xizmat
#: buzilgan deb hisoblanadi. Bittasi tasodif bo'lishi mumkin (tarmoq),
#: uchtasi ketma-ket esa deyarli har doim kalit yoki kvota.
_FAILURE_STREAK_THRESHOLD = 3

#: Administrator aralashuvini talab qiladigan xatoliklar
_ADMIN_FAULT = frozenset({
    ai_errors.ERR_PROVIDER_AUTH,
    ai_errors.ERR_PROVIDER_QUOTA,
})

_lock = threading.Lock()
_cached = {"ok": None, "detail": None, "at": 0.0}
_streak = {"count": 0, "category": None}


def _probe() -> tuple[bool, str]:
    """Provayderga eng arzon so'rovni yuboradi: modellar ro'yxati."""
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return False, "key_missing"

    try:
        from openai import OpenAI

        # Qisqa taymaut: salomatlik tekshiruvi hech qachon osilib
        # qolmasligi kerak
        OpenAI(api_key=key, timeout=8.0, max_retries=0).models.list()
        return True, "ok"
    except Exception as exc:  # noqa: BLE001 — turkumlash `ai_errors` da
        category = ai_errors.classify(exc)
        logger.error("AI provayder tekshiruvi muvaffaqiyatsiz (%s): %s",
                     category, ai_errors.log_message(exc))
        return False, category


def key_status(force: bool = False) -> dict:
    """Kalitning holati. Natija `_CACHE_TTL_SECONDS` davomida keshlanadi."""
    now = time.monotonic()
    with _lock:
        fresh = (not force
                 and _cached["ok"] is not None
                 and now - _cached["at"] < _CACHE_TTL_SECONDS)
        if fresh:
            return {"ok": _cached["ok"], "detail": _cached["detail"],
                    "cached": True}

    ok, detail = _probe()

    with _lock:
        _cached.update({"ok": ok, "detail": detail, "at": now})

    return {"ok": ok, "detail": detail, "cached": False}


def record_failure(category: str) -> None:
    """Bitta tahlil xatolik bilan tugadi."""
    if category not in _ADMIN_FAULT:
        # Fayl xatosi yoki vaqtinchalik uzilish — bu xizmat buzilgani
        # degani emas, shuning uchun ketma-ketlik uzilmaydi
        return

    with _lock:
        if _streak["category"] != category:
            _streak["category"] = category
            _streak["count"] = 0
        _streak["count"] += 1
        count = _streak["count"]

        # Kalit yoki kvota o'zgargan bo'lishi mumkin — keshni bekor qilamiz
        _cached["ok"] = None

    if count == _FAILURE_STREAK_THRESHOLD:
        logger.critical(
            "AI xizmati ishlamayapti: ketma-ket %d ta tahlil '%s' sababli "
            "muvaffaqiyatsiz tugadi. Bu administrator aralashuvini talab "
            "qiladi (API kaliti yoki hisob balansi).",
            count, category,
        )
    elif count > _FAILURE_STREAK_THRESHOLD:
        logger.critical("AI xizmati hamon ishlamayapti: ketma-ket %d ta xatolik (%s)",
                        count, category)


def record_success() -> None:
    """Tahlil muvaffaqiyatli tugadi — ketma-ketlik uziladi."""
    with _lock:
        if _streak["count"]:
            logger.info("AI xizmati tiklandi (%d ta ketma-ket xatolikdan keyin)",
                        _streak["count"])
        _streak["count"] = 0
        _streak["category"] = None


def failure_streak() -> dict:
    with _lock:
        return {"count": _streak["count"], "category": _streak["category"]}


def health() -> dict:
    """`/api/health` uchun bo'lim."""
    status = key_status()
    streak = failure_streak()
    degraded = streak["count"] >= _FAILURE_STREAK_THRESHOLD

    section = {
        "ok": bool(status["ok"]) and not degraded,
        "key": "valid" if status["ok"] else (status["detail"] or "invalid"),
    }
    if streak["count"]:
        section["consecutive_failures"] = streak["count"]
        section["failure_category"] = streak["category"]
    return section


def startup_check() -> None:
    """Ilova ko'tarilganda bir marta chaqiriladi."""
    status = key_status(force=True)
    if status["ok"]:
        logger.info("AI provayder kaliti tekshirildi — yaroqli")
        return

    logger.critical(
        "AI provayder kaliti YAROQSIZ (%s). Barcha tahlillar xatolik bilan "
        "tugaydi. OPENAI_API_KEY ni tekshiring.",
        status["detail"],
    )
