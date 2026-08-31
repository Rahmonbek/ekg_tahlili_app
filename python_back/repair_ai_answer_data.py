"""`ai_answer_data` ustunidagi buzilgan yozuvlarni tuzatadi (T-033, T-031).

Bazada ikki xil buzilgan yozuv topildi.

**1. Xom istisno matni.** Eski kod xatolikni to'g'ridan-to'g'ri shu ustunga
yozardi::

    unsupported operand type(s) for *: 'NoneType' and 'int'
    Error code: 401 - {'error': {'message': 'Incorrect API key provided: sk-proj-...

Bu ikki jihatdan yomon: shifokor ekranda texnik matnni ko'radi va
provayder haqidagi ma'lumot (kalit prefiksi, xizmat nomi) tibbiy yozuvga
tushib qoladi. `ai_errors.py` bu muammoni yangi yozuvlar uchun hal qilgan;
bu skript eskilarini ham tozalaydi.

**2. Ortiqcha yopuvchi qavs.** `ecg_analyses#92` da JSON ichida bitta
ortiqcha `}` bor va u obyektni erta yopadi. Oqibati ko'rinmas, lekin
jiddiy edi:

* ko'rsatishda JSON parse qilinmay `null` qaytardi — qator "Baholanmadi";
* ro'yxat filtri esa matn qidiruvi bilan ishlagani uchun o'sha qatorni
  "O'rtacha" filtriga qo'shardi.

Ya'ni foydalanuvchi "O'rtacha" ni tanlaganda ro'yxatda "Baholanmadi"
qator chiqardi.

Ishlatish::

    python repair_ai_answer_data.py            # faqat ko'rsatadi
    python repair_ai_answer_data.py --apply    # tuzatadi
"""

import json
import sys

from sqlalchemy import text

import ai_errors
from database import engine

APPLY = "--apply" in sys.argv

TABLES = ("ecg_analyses", "lab_analyses", "holter_analyses", "smad_analyses")


def repair_stray_brace(raw: str):
    """Ortiqcha `}` sababli erta yopilgan JSON ni tiklaydi.

    `json.JSONDecoder.raw_decode` birinchi to'liq qiymatni o'qiydi va
    qayerda tugaganini aytadi. Agar undan keyin `, "kalit": ...` ko'rinishida
    davom etsa, demak yopuvchi qavs ortiqcha: uni olib tashlab, qolganini
    obyekt ichiga qaytaramiz.
    """
    decoder = json.JSONDecoder()
    stripped = raw.lstrip()
    offset = len(raw) - len(stripped)

    try:
        _, end = decoder.raw_decode(stripped)
    except ValueError:
        return None

    tail = raw[offset + end:].strip()
    if not tail.startswith(","):
        return None

    # Birinchi obyektning yopuvchi qavsini olib tashlaymiz
    head = raw[: offset + end].rstrip()
    if not head.endswith("}"):
        return None
    head = head[:-1].rstrip()

    candidate = head + tail
    try:
        json.loads(candidate)
    except ValueError:
        return None
    return candidate


def repair_error_text(raw: str) -> str:
    """Xom istisno matnini turkumlangan, tarjima qilingan JSON ga aylantiradi."""
    code = ai_errors.ERR_INTERNAL
    lowered = raw.lower()
    if "401" in raw or "api key" in lowered or "authentication" in lowered:
        code = ai_errors.ERR_PROVIDER_AUTH
    elif "429" in raw or "quota" in lowered or "rate limit" in lowered:
        code = ai_errors.ERR_PROVIDER_QUOTA
    elif "timeout" in lowered or "timed out" in lowered:
        code = ai_errors.ERR_PROVIDER_TIMEOUT

    return json.dumps({
        "xato": "ai_tahlil_xatosi",
        "xato_kodi": code,
        "xabar": ai_errors._MESSAGES[code]["uz"],
        "qayta_urinish_mumkin": code in (
            ai_errors.ERR_PROVIDER_TIMEOUT, ai_errors.ERR_PROVIDER_UNAVAILABLE),
        # Yozuv tuzatilgani ko'rinib tursin
        "tiklandi": True,
    }, ensure_ascii=False)


def main() -> None:
    fixed = {"brace": 0, "error_text": 0}
    skipped = []

    with engine.connect() as conn:
        for table in TABLES:
            rows = conn.execute(text(
                f"SELECT id, ai_answer_data FROM {table} "
                f"WHERE ai_answer_data IS NOT NULL AND ai_answer_data <> ''"
            )).fetchall()

            for row_id, raw in rows:
                try:
                    json.loads(raw)
                    continue                      # yaroqli JSON — tegilmaydi
                except ValueError:
                    pass

                repaired = repair_stray_brace(raw)
                kind = "brace"
                if repaired is None:
                    repaired = repair_error_text(raw)
                    kind = "error_text"

                if repaired is None:
                    skipped.append(f"{table}#{row_id}")
                    continue

                fixed[kind] += 1
                print(f"  {table}#{row_id}: {kind}")
                print(f"      -> {repaired[:110]}")

                if APPLY:
                    conn.execute(
                        text(f"UPDATE {table} SET ai_answer_data = :v WHERE id = :i"),
                        {"v": repaired, "i": row_id},
                    )

        if APPLY:
            conn.commit()

    print("\n  Ortiqcha qavs tuzatildi: {} | xom xatolik matni almashtirildi: {}"
          .format(fixed["brace"], fixed["error_text"]))
    if skipped:
        print("  Tuzatib bo'lmadi:", ", ".join(skipped))
    if not APPLY:
        print("\n  (hech narsa o'zgartirilmadi — `--apply` bilan ishga tushiring)")


if __name__ == "__main__":
    main()
