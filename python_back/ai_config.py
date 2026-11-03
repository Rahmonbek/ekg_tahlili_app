"""Sun'iy intellekt chaqiruvlarining markazlashgan sozlamalari (A-11).

Nima uchun kerak
----------------
Model nomi **oltita joyda qotirilgan** edi va ular bir xil emasdi:

    main.py:1272                 model="gpt-5.2"
    main.py:1822                 model="gpt-5.2"
    holter_analyses_api.py:149   model="gpt-5.2"
    smad_analyses_api.py:149     model="gpt-5.2"
    lab_analyses_api.py:197      model="gpt-5.2"
    parasitology_api.py:45       model="gpt-4o"      <- boshqacha
    ai_translate.py:93           model="gpt-5-mini"

`config.py` da `OPENAI_MODEL` o'zgaruvchisi bor edi, lekin **hech
qayerda ishlatilmasdi**.

Buning oqibati:

* modelni almashtirish uchun olti faylni tahrirlash kerak, va bittasi
  esdan chiqsa modullar turli modellarda ishlaydi — buni sezish qiyin;
* provayder model nomini yangilaganda (masalan `gpt-5.2` ortidagi
  vazn o'zgarsa) natijalar sababsiz o'zgaradi va buni hech kim
  kuzatmaydi.

So'rov parametrlari
-------------------
Tibbiy tashxis — aniqlik muhim bo'lgan vazifa, shuning uchun
fikrlash chuqurligi standart emas, ataylab yuqoriroq belgilanadi.

`temperature` ATAYLAB berilmaydi: fikrlash (reasoning) modellari uni
qo'llab-quvvatlamaydi va berilsa so'rov xatolik bilan qaytadi.
Barqarorlikni `reasoning.effort` va qat'iy JSON sxema ta'minlaydi.
"""

import os

# ─── Modellar ────────────────────────────────────────────────────────
#: Tashxis qo'yuvchi asosiy model (EKG, Holter, SMAD, Lab, Parazitologiya).
#: Aniq versiyani `.env` orqali qotirish mumkin va **tavsiya etiladi**:
#: shunda provayder yangilanishi natijalarni jimgina o'zgartirmaydi.
DIAGNOSIS_MODEL: str = os.getenv("AI_DIAGNOSIS_MODEL", "gpt-5.2")

#: Tarjima — tayyor matnni boshqa tilga o'girish. Bu yerda tashxis
#: qo'yilmaydi, shuning uchun kichikroq va arzonroq model yetarli.
TRANSLATION_MODEL: str = os.getenv("AI_TRANSLATION_MODEL", "gpt-5-mini")

# ─── Fikrlash chuqurligi ─────────────────────────────────────────────
#: `low` | `medium` | `high`. Tibbiy xulosa uchun standart darajadan
#: yuqoriroq: bu javob sifatini oshiradi, evaziga so'rov sekinlashadi.
REASONING_EFFORT: str = os.getenv("AI_REASONING_EFFORT", "high")

#: Javob uzunligi chegarasi. Cheklanmasa model juda uzun matn yozib,
#: vaqt va pul sarflashi mumkin.
MAX_OUTPUT_TOKENS: int = int(os.getenv("AI_MAX_OUTPUT_TOKENS", "8000"))

# ─── Chaqiruv vaqti chegarasi (hang oldini olish) ────────────────────
#: OpenAI chaqiruvi shu soniyadan oshsa uziladi. Reasoning modeli
#: (effort high/xhigh) juda uzoq "o'ylab", so'rovni minutlab osib qo'yishi
#: mumkin — bu esa Python thread va DB ulanishini band qilib, boshqa
#: so'rovlarni (masalan file-types) ham to'xtatadi. Timeout bunday osilib
#: qolishning oldini oladi: chaqiruv uzilsa, tahlil xatolik bo'ladi (retry mumkin).
AI_REQUEST_TIMEOUT: float = float(os.getenv("AI_REQUEST_TIMEOUT", "180"))
#: Muvaffaqiyatsiz chaqiruvda takrorlar soni (standart SDK 2 — uzoq kutish beradi).
AI_MAX_RETRIES: int = int(os.getenv("AI_MAX_RETRIES", "1"))


# ─── EKG rasm tahlili — maxsus sozlama ───────────────────────────────
#: EKG SURATINI (foto/rasm) tahlil qilishda kuchliroq vizual model va
#: chuqurroq fikrlash ishlatiladi. Barchasi `.env` orqali o'zgartiriladi.
ECG_IMAGE_MODEL: str = os.getenv("AI_ECG_IMAGE_MODEL", "gpt-5.6-sol")
#: `high` | `xhigh` — EKG rasmda ingichka intervallarni o'qish uchun.
ECG_IMAGE_REASONING_EFFORT: str = os.getenv("AI_ECG_IMAGE_REASONING_EFFORT", "high")
#: OpenAI `input_image.detail` — to'liq (original) tafsilot uchun `high`.
ECG_IMAGE_DETAIL: str = os.getenv("AI_ECG_IMAGE_DETAIL", "original")

#: EKG rasm uchun token byudjeti CHEGARASI. Reasoning modeli fikrlashga
#: ko'p token sarflaydi; byudjet BO'LMASA (cheksiz) model juda uzoq
#: "o'ylab", so'rov minutlab osilib qoladi. Saxiy, lekin CHEKLANGAN qiymat:
#: fikrlash va yakuniy JSON javobga joy qoladi, ammo cheksiz emas.
ECG_IMAGE_MAX_OUTPUT_TOKENS: int = int(os.getenv("AI_ECG_IMAGE_MAX_OUTPUT_TOKENS", "20000"))


def ecg_image_request(**overrides) -> dict:
    """EKG rasm tahlili uchun so'rov parametrlari.

    Oddiy `diagnosis_request` dan farqi — kuchliroq vizual model,
    (ixtiyoriy) yuqoriroq `reasoning.effort` va cheklangan token byudjeti.
    """
    params = {
        "model": ECG_IMAGE_MODEL,
        "reasoning": {"effort": ECG_IMAGE_REASONING_EFFORT},
        "max_output_tokens": ECG_IMAGE_MAX_OUTPUT_TOKENS,
    }
    params.update(overrides)
    return params


# ─── Holter / SMAD / Laboratoriya — maxsus model ─────────────────────
#: Holter, SMAD va laboratoriya tahlillari uchun model. EKG (gpt-5.6-sol)
#: va parazitologiyadan ALOHIDA sozlanadi (foydalanuvchi so'rovi).
HOLTER_SMAD_LAB_MODEL: str = os.getenv("AI_HOLTER_SMAD_LAB_MODEL", "gpt-5.6-terra")


#: Laboratoriya javobi uchun token byudjeti (L-05). Umumiy 8000 ga reasoning
#: ham kiradi; 10 ta fayl yoki ko'p listli Excel'da 100+ ko'rsatkich (har
#: biri me'yor va asl yozuvi bilan) shu chegaraga yetib, JSON kesilib
#: qolardi. Byudjet — yuqori CHEGARA, sarflanmagan tokenga haq olinmaydi.
LAB_MAX_OUTPUT_TOKENS: int = int(os.getenv("AI_LAB_MAX_OUTPUT_TOKENS", "16000"))


# ─── Laboratoriya: xarajatni kamaytirish (2026-11-03) ──────────────────────
#: `single` (standart) — bitta so'rov: katalog bilan statik prompt BOSHIDA
#: (keshlanadi, ~90% arzon), bemor ma'lumoti oxirida; hujjat turi shu
#: javobning o'zida (`document_kind`) — alohida tasniflash so'rovi yo'q.
#: `split` — ikki bosqich: 1) O'QISH (fayldagi nomlar bilan, katalogsiz; kod
#: nomni `lab_value_aliases` orqali bog'laydi), 2) XULOSA faqat qiymatlardan.
#: Shubhali natijada (`lab_split.NeedLegacy`) avtomatik `single` ga o'tiladi.
#: 2026-11-03 o'lchovi (4 ta klinika fayli, natijalar bir xil): eski yo'lga
#: nisbatan `single` ≈ −37%, `split` ≈ −18% — asosiy narx chiqish tokenlari,
#: `split` esa katalogda yo'q qatorlarni ham ko'chiradi. `legacy` = `single`.
LAB_PIPELINE: str = os.getenv("AI_LAB_PIPELINE", "single").strip().lower()
#: Laboratoriya tahlilining fikrlash chuqurligi (boshqa modullar
#: `REASONING_EFFORT` da). "medium" da 4 ta faylda qiymatlar "high" bilan bir xil
LAB_REASONING_EFFORT: str = os.getenv("AI_LAB_REASONING_EFFORT", "medium")
#: true — har fayl oldin alohida so'rovda tasniflanadi (eski xatti-harakat)
LAB_CLASSIFY: bool = os.getenv("AI_LAB_CLASSIFY", "false").strip().lower() in ("1", "true", "yes")
#: O'qish — ko'chirish vazifasi, chuqur fikrlash kerak emas
LAB_EXTRACT_MODEL: str = os.getenv("AI_LAB_EXTRACT_MODEL", HOLTER_SMAD_LAB_MODEL)
LAB_EXTRACT_EFFORT: str = os.getenv("AI_LAB_EXTRACT_EFFORT", "low")
LAB_EXTRACT_MAX_OUTPUT_TOKENS: int = int(os.getenv("AI_LAB_EXTRACT_MAX_OUTPUT_TOKENS", "16000"))
#: Xulosa — tibbiy mulohaza; kirish kichik (faqat qiymatlar ro'yxati)
LAB_CONCLUDE_MODEL: str = os.getenv("AI_LAB_CONCLUDE_MODEL", HOLTER_SMAD_LAB_MODEL)
LAB_CONCLUDE_EFFORT: str = os.getenv("AI_LAB_CONCLUDE_EFFORT", "medium")
LAB_CONCLUDE_MAX_OUTPUT_TOKENS: int = int(os.getenv("AI_LAB_CONCLUDE_MAX_OUTPUT_TOKENS", "8000"))
#: Noma'lum ko'rsatkich nomini katalogga bog'lash — kam uchraydi, arzon model
LAB_ALIAS_MODEL: str = os.getenv("AI_LAB_ALIAS_MODEL", "gpt-5-mini")
LAB_ALIAS_EFFORT: str = os.getenv("AI_LAB_ALIAS_EFFORT", "low")

#: Ommaviy (shoshilinch bo'lmagan) yuklash — masalan arxiv importi — uchun
#: OpenAI tarifi. `flex` ~50% arzon, javob sekinroq. Bo'sh — o'chiq. Model
#: qo'llamasa yoki resurs band bo'lsa so'rov oddiy tarifda qayta yuboriladi.
BULK_SERVICE_TIER: str = os.getenv("AI_BULK_SERVICE_TIER", "flex").strip()


def _tier_unavailable(exc: Exception) -> bool:
    """Tarif (flex) tufayli rad etildimi — oddiy tarifda qayta urinish kerak."""
    status = getattr(exc, "status_code", None)
    msg = str(exc).lower()
    if status == 429:
        return True
    return status == 400 and ("service_tier" in msg or "flex" in msg)


def _sdk_has_cache_key(client) -> bool:
    """O'rnatilgan `openai` paketi `prompt_cache_key` ni qo'llaydimi (eski serverlar)."""
    import inspect
    try:
        return "prompt_cache_key" in inspect.signature(client.responses.create).parameters
    except (TypeError, ValueError, AttributeError):
        return False


def create_response(client, *, module: str, analysis_id, step: str, bulk: bool = False, **params):
    """`client.responses.create` + xarajat logi (`ai_usage`) + ommaviy tarif.

    `bulk=True` bo'lsa `BULK_SERVICE_TIER` (flex) bilan yuboriladi; tarif rad
    etilsa (model qo'llamaydi, resurs band) oddiy tarifda qaytariladi.
    """
    import logging
    import ai_usage
    tier = BULK_SERVICE_TIER if bulk and BULK_SERVICE_TIER else None
    # Bir xil bosqich so'rovlari bitta kesh serveriga tushsin — statik prompt
    # boshi keshdan olinadi (kalitsiz so'rovlar turli serverga tushib, kesh
    # ko'pincha ishlamasdi)
    params.setdefault("prompt_cache_key", f"nmed-{module}-{step}")
    if not _sdk_has_cache_key(client):
        # Eski `openai` paketi bu parametrni bilmaydi — so'rov sinmasin
        params.pop("prompt_cache_key", None)
    if tier:
        try:
            resp = client.responses.create(service_tier=tier, **params)
        except Exception as exc:  # noqa: BLE001 — faqat tarif xatosi qayta uriniladi
            if not _tier_unavailable(exc):
                raise
            logging.getLogger(__name__).info(
                "AI: '%s' tarifi rad etildi (%s) — oddiy tarifda qayta yuborilmoqda",
                tier, type(exc).__name__)
            tier = None
            resp = client.responses.create(**params)
    else:
        resp = client.responses.create(**params)
    ai_usage.record(module, analysis_id, step, params.get("model"), resp, tier)
    return resp


def holter_smad_lab_request(**overrides) -> dict:
    """Holter, SMAD va laboratoriya tahlili uchun so'rov parametrlari.

    `diagnosis_request` bilan bir xil (fikrlash chuqurligi, token byudjeti),
    faqat model boshqacha — `gpt-5.6-terra`.
    """
    params = {
        "model": HOLTER_SMAD_LAB_MODEL,
        "reasoning": {"effort": REASONING_EFFORT},
        "max_output_tokens": MAX_OUTPUT_TOKENS,
    }
    params.update(overrides)
    return params


def diagnosis_request(**overrides) -> dict:
    """Tashxis so'rovi uchun umumiy parametrlar.

    Ishlatish::

        resp = client.responses.create(
            input=[...],
            text=ai_schema.response_format("ecg"),
            **ai_config.diagnosis_request(),
        )

    `overrides` orqali ayrim modul boshqacha qiymat berishi mumkin —
    lekin buni izoh bilan asoslash kerak.
    """
    params = {
        "model": DIAGNOSIS_MODEL,
        "reasoning": {"effort": REASONING_EFFORT},
        "max_output_tokens": MAX_OUTPUT_TOKENS,
    }
    params.update(overrides)
    return params


def translation_request(**overrides) -> dict:
    """Tarjima so'rovi uchun parametrlar.

    Tarjimada fikrlash chuqurligi kerak emas — vazifa mexanik.
    """
    params = {
        "model": TRANSLATION_MODEL,
        "reasoning": {"effort": "low"},
    }
    params.update(overrides)
    return params


# ─── Kompleks (ko'p tahlilli) xulosa ─────────────────────────────────────
#: Bemorning bir nechta tahlilini BIRGALIKDA tahlil qiluvchi model.
#:
#: Nima uchun eng kuchli model (`gpt-5.6-sol`):
#:  * bu bosqichda fayldan raqam o'qilmaydi — tayyor xulosalar
#:    bir-biriga bog'lanadi, ya'ni vazifa sof MULOHAZA;
#:  * chaqiruv kam bo'ladi (bemorga bir marta, har bir tahlilga emas),
#:    shuning uchun umumiy xarajatdagi ulushi kichik;
#:  * bu zanjirning OXIRGI bo'g'ini — bu yerdagi xato hech qayerda
#:    tuzatilmaydi, to'g'ridan-to'g'ri shifokor ko'radigan xulosaga tushadi;
#:  * `deep` rejimda EKG rasmlari ham yuboriladi, ya'ni vizual model shart.
COMBINED_MODEL: str = os.getenv("AI_COMBINED_MODEL", "gpt-5.6-sol")

#: Javob byudjeti. Chegara ATAYLAB tor: kompleks xulosa qisqa bo'lishi
#: kerak (faqat patologiya, maydonlar bo'yicha gap soni chegaralangan) —
#: byudjet keng bo'lsa model bo'sh joyni suv gaplar bilan to'ldiradi.
#: Fikrlash (reasoning) tokenlari ham shu byudjetdan olinadi, shuning
#: uchun uni haddan tashqari kichik qilib bo'lmaydi.
COMBINED_MAX_OUTPUT_TOKENS: int = int(os.getenv("AI_COMBINED_MAX_OUTPUT_TOKENS", "8000"))

#: `deep` rejimda AI ga yuboriladigan EKG rasmlari soni CHEGARASI.
#: Har bir rasm ~2-3k token — cheklanmasa narx bir necha barobar oshadi.
COMBINED_MAX_IMAGES: int = int(os.getenv("AI_COMBINED_MAX_IMAGES", "3"))


def combined_request(**overrides) -> dict:
    """Kompleks xulosa so'rovi uchun parametrlar."""
    params = {
        "model": COMBINED_MODEL,
        "reasoning": {"effort": REASONING_EFFORT},
        "max_output_tokens": COMBINED_MAX_OUTPUT_TOKENS,
    }
    params.update(overrides)
    return params


# ─── Provayderga yuklangan fayllarni tozalash (L-14) ──────────────────────
def delete_uploaded_files(client, file_ids, context: str = "") -> None:
    """`client.files.create` bilan yuklangan fayllarni provayderdan o'chiradi.

    Bemor fayllari (F.I.O., tug'ilgan sana bor) javob olingandan keyin
    provayder saqlash joyida muddatsiz qolardi — O'z DSt 2814:2014 (C4) va
    shaxsiy ma'lumotlar talablariga zid. Chaqiruvchi buni `finally` da
    chaqiradi: tahlil xato bilan tugasa ham fayl qolmaydi.

    Xatolik faqat logga yoziladi — tozalash asosiy oqimni (natijani
    saqlash yoki xatolik holatini yozish) HECH QACHON buzmaydi.
    """
    import logging
    log = logging.getLogger(__name__)
    for file_id in [f for f in (file_ids or []) if f]:
        try:
            client.files.delete(file_id)
        except Exception as exc:  # noqa: BLE001 — tozalash ixtiyoriy
            log.warning("OpenAI faylini o'chirib bo'lmadi (%s, %s): %s",
                        context or "-", file_id, type(exc).__name__)
