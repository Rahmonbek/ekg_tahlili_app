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
