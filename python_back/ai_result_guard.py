"""AI javobini saqlashdan oldin xavfsizlik tekshiruvidan o'tkazish.

Nima uchun kerak (T-092 — bemor xavfsizligi):

Auditda bo'sh oq rasm va 40x30 px mayda rasm EKG sifatida yuklandi. AI ning
MATNI mutlaqo to'g'ri edi:

    "Ushbu tasvir asosida EKG tahlilini aniqlash imkoni yo'q, chunki EKG
     signali ko'rinmaydi yoki rasm noto'g'ri yuklangan."

Ammo o'sha javobda `"automatic_analysis_bool": 1` — ya'ni **1 = normal =
YASHIL "Normal"**. Ro'yxatda bu yozuvlar haqiqiy patologiyali EKG dan
"sog'lomroq" ko'rinardi.

Shifokor kunlik ishda yashil belgili yozuvlarni ochmaydi — bu tabiiy va
to'g'ri xatti-harakat. Natijada tahlil qilinmagan EKG "tayyor va normal"
bo'lib qolar, hech kim xatoni sezmasdi.

Bu modul ikki qatlamli himoya beradi:

1. **Aniq maydon** — promptga `analiz_mumkinmi` qo'shildi; model uni
   `false` qilsa, jiddiylik darajasi olib tashlanadi.
2. **Matn bo'yicha zaxira tekshiruv** — model ko'rsatmani e'tiborsiz
   qoldirsa ham, xulosa matnida "aniqlash imkoni yo'q" turidagi iboralar
   bo'lsa daraja baribir olib tashlanadi.

Daraja olib tashlanganda interfeys kulrang "Baholanmadi" ko'rsatadi —
bu ATAYLAB shunday: noaniq holatda yashil "Normal" ko'rsatish xavfli.
"""

import json
import logging
import re

_logger = logging.getLogger(__name__)

#: Javobda "tahlil qilib bo'lmadi" degan ma'noni bildiruvchi iboralar.
#: Uch tilda, chunki AI javobi foydalanuvchi tanlagan tilda keladi.
_IMPOSSIBLE_PATTERNS = [
    # ── Bevosita "tahlil qilib bo'lmadi" iboralari ───────────────────────
    # O'zbekcha
    r"tahlil(?:ini|ni)?\s+(?:aniqlash|qilish)\w*\s+imkoni\s+yo['`’]?q",
    r"tahlil\s+qilib\s+bo['`’]?lmadi",
    r"xulosa(?:sini)?\s+ber(?:ib|ish)\s+bo['`’]?lmaydi",
    r"o['`’]?qib\s+bo['`’]?lmadi",
    r"qayta\s+yuborish\s+(?:zarur|kerak|lozim)",
    # Ruscha
    r"невозможно\s+(?:определить|провести|выполнить|оценить|проанализировать)",
    r"не\s+удалось\s+(?:определить|проанализировать|распознать)",
    r"требуется\s+повтор",
    # Inglizcha
    r"cannot\s+be\s+(?:determined|analyz|assess)",
    r"not\s+possible\s+to\s+(?:analyz|determin|assess)",
    r"unable\s+to\s+(?:analyz|determin|read)",
]

#: Sifat/ko'rinish haqidagi iboralar FAQAT fayl yoki tasvir konteksti bilan
#: birga kelganda hisobga olinadi.
#:
#: Busiz `yetarli emas` naqshi haqiqiy klinik topilmani ham ushlab olardi:
#: "sutkalik pasayish YETARLI EMAS (non-dipper)" — bu patologiya tavsifi,
#: tahlil qilib bo'lmagani emas. Bunday yozuvning darajasini olib tashlash
#: teskari xavf tug'diradi: haqiqiy patologiya "Baholanmadi" bo'lib qoladi.
_SUBJECT = r"(?:rasm\w*|tasvir\w*|fayl\w*|surat\w*|yozuv\w*|sifat\w*|" \
           r"изображени\w*|снимок|файл\w*|качеств\w*|" \
           r"image|file|photo|scan|quality|trace)"

_QUALITY_PATTERNS = [
    # O'zbekcha: "rasm sifati ... yetarli emas", "EKG yozuvi ko'rinmaydi"
    r"{s}[^.]{{0,60}}\b(?:yetarli\s+(?:darajada\s+)?emas|past|xira|ko['`’]?rinmaydi|noto['`’]?g['`’]?ri\s+yuklangan)",
    r"\b(?:yetarli\s+emas|past\s+sifatli|xira)\b[^.]{{0,60}}{s}",
    # Ruscha
    r"{s}[^.]{{0,60}}\b(?:недостаточн\w*|низк\w*\s+качеств\w*|не\s+вид\w*|не\s+содержит)",
    r"\b(?:недостаточн\w*|низк\w*\s+качеств\w*)\b[^.]{{0,60}}{s}",
    # Inglizcha
    r"{s}[^.]{{0,60}}\b(?:is\s+not\s+visible|insufficient|too\s+low|does\s+not\s+contain)",
    r"\bno\s+(?:ecg|ekg|signal|trace)\b[^.]{{0,40}}\bvisible\b",
]

_IMPOSSIBLE_PATTERNS += [pat.format(s=_SUBJECT) for pat in _QUALITY_PATTERNS]


_IMPOSSIBLE_RE = re.compile("|".join(_IMPOSSIBLE_PATTERNS), re.IGNORECASE)

#: Interfeys shu bayroqni ko'rib ogohlantirish bannerini chiqaradi.
FLAG_NOT_ANALYZABLE = "tahlil_imkonsiz"


def _looks_impossible(result: dict) -> bool:
    """Xulosa matni "tahlil qilib bo'lmadi" degan ma'noni bildiradimi?"""
    for field in ("automatic_analysis", "final_summary"):
        text = result.get(field)
        if isinstance(text, str) and _IMPOSSIBLE_RE.search(text):
            return True
    return False


def _wrap_non_json(content_out: str, analysis_id, kind: str) -> str:
    """JSON bo'lmagan javobni saqlanadigan JSON obyektiga o'raydi.

    `ai_answer_data` ustuni endi `jsonb` (T-036), ya'ni baza yaroqsiz
    JSON ni **rad etadi**. Ilgari bunday matn shundayligicha saqlanardi;
    hozir esa uni o'ramasdan yozish `DataError` beradi va butun tahlil
    natijasi yo'qoladi — model haqiqatan foydali matn qaytargan bo'lsa
    ham.

    Shuning uchun matn yo'qotilmaydi: u `xom_matn` maydonida qoladi va
    kerak bo'lsa qo'lda tiklash mumkin.
    """
    _logger.warning("AI javobi JSON emas, o'ralib saqlanadi: %s#%s", kind, analysis_id)
    return json.dumps({
        "xato": "javob_json_emas",
        "xabar": "Sun'iy intellekt javobni kutilgan formatda qaytarmadi.",
        "xom_matn": content_out,
    }, ensure_ascii=False)


def sanitize(content_out: str, analysis_id=None, kind: str = "") -> str | None:
    """AI javobini tekshiradi va zarur bo'lsa jiddiylik darajasini olib tashlaydi.

    :param content_out: AI qaytargan xom matn (JSON bo'lishi kutiladi)
    :param analysis_id: log uchun tahlil identifikatori
    :param kind: log uchun tahlil turi ("ecg", "holter" …)
    :returns: saqlash uchun tayyor JSON matn. Parse qilib bo'lmasa
              matn `xom_matn` maydoni ichiga o'raladi — ustun `jsonb`
              bo'lgani uchun yaroqsiz JSON ni saqlab bo'lmaydi, lekin
              javobni yo'qotish ham mumkin emas (T-036).
    """
    # Natija kelgan bo'lsa provayder ishlayapti — ketma-ket
    # xatoliklar hisobi nolga tushadi (T-028)
    import provider_health
    provider_health.record_success()

    if not content_out or not content_out.strip():
        # Bo'sh javob `jsonb` ustuni uchun yaroqsiz. `None` qaytariladi:
        # yangilash yordamchilari uni "bu maydonga tegma" deb qabul
        # qiladi, ya'ni bor natija bo'sh qiymat bilan almashtirilmaydi
        # (T-036).
        return None

    try:
        result = json.loads(content_out)
    except (json.JSONDecodeError, TypeError):
        # Model ba'zan JSON ni matn ichida qaytaradi — ajratib ko'ramiz
        match = re.search(r"\{.*\}", content_out, re.DOTALL)
        if not match:
            return _wrap_non_json(content_out, analysis_id, kind)
        try:
            result = json.loads(match.group(0))
        except json.JSONDecodeError:
            return _wrap_non_json(content_out, analysis_id, kind)

    # Ro'yxat yoki oddiy qiymat ham `jsonb` uchun yaroqli, lekin
    # keyingi tekshiruvlar lug'atni kutadi
    if not isinstance(result, dict):
        return content_out

    # Model aniq aytgan bo'lsa — unga ishonamiz
    explicit = result.get("analiz_mumkinmi")
    declared_impossible = explicit is False or explicit == "false"
    declared_possible = explicit is True or explicit == "true"

    # Matn evristikasi — FAQAT model aniq javob bermagan holatlar uchun.
    #
    # Nima uchun shunday. Model qat'iy sxema bilan ishlaydi va
    # `analiz_mumkinmi` maydonini har doim to'ldiradi. U `true` desa,
    # ya'ni "tahlil qildim" desa, matn ichidagi ibora bo'yicha uni rad
    # etish xato bo'ladi. Jonli misol (ecg#109):
    #
    #     "Sinus ritm (79/min). Yakka ekstrasistola qayd etilgan.
    #      RASM SIFATI PAST bo'lgani uchun ST segmentni aniq baholash
    #      imkoni cheklangan."
    #
    # Bu — qisman cheklov, "tahlil qilib bo'lmadi" emas. Evristika esa
    # `rasm sifati past` iborasini ushlab, darajani (2) olib tashlardi
    # va HAQIQIY patologiya ekranda "Baholanmadi" bo'lib qolardi. Bu
    # aynan shu modul oldini olishi kerak bo'lgan xavfning teskarisi.
    #
    # Sxemasiz eski javoblarda `analiz_mumkinmi` yo'q — o'shanda
    # evristika avvalgidek ishlaydi.
    text_impossible = _looks_impossible(result) if not declared_possible else False

    if not (declared_impossible or text_impossible):
        return content_out

    previous = result.get("automatic_analysis_bool")

    # ENG MUHIM QATOR: daraja olib tashlanadi.
    # `None` -> interfeysda kulrang "Baholanmadi", yashil "Normal" emas.
    result["automatic_analysis_bool"] = None
    result[FLAG_NOT_ANALYZABLE] = True

    if not result.get("analiz_mumkin_emas_sababi"):
        result["analiz_mumkin_emas_sababi"] = (
            result.get("final_summary")
            or result.get("automatic_analysis")
            or ""
        )

    _logger.warning(
        "AI tahlil qilib bo'lmadi deb hisoblandi, daraja olib tashlandi: "
        "%s#%s (avvalgi daraja=%r, aniq maydon=%r, matn bo'yicha=%s)",
        kind, analysis_id, previous, explicit, text_impossible,
    )

    return json.dumps(result, ensure_ascii=False)
