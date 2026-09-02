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
