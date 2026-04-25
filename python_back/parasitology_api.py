import base64
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from openai import OpenAI

from auth_middleware import verify_token
from config import OPENAI_API_KEY, OPENAI_MODEL

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="",
    tags=["Parasitology Analyses"]
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def _build_prompt(magnification: str, gender: str, age: int,
                  complaints: List[str], lang: str) -> str:
    language = (
        "O'ZBEK" if lang == "uz"
        else "РУССКИЙ" if lang == "ru"
        else "ENGLISH"
    )
    complaints_text = ", ".join(complaints) if complaints else "ko'rsatilmagan"

    return f"""Sen NMED tibbiy laboratoriya platformasining TAJRIBALI parazitolog-laborant mutaxassisisan.
Quyidagi MIKROSKOPIK TASVIR najas (koprologik) preparatidan olingan.

═══ TAHLIL KONTEKSTI ═══
- Kattalashtirish: {magnification}
- Bemor: {age} yosh, {gender}
- Shikoyatlar: {complaints_text}
- Metod: Yorug'lik mikroskopiyasi, koprologik tekshiruv

═══ QADAMMA-QADAM TAHLIL TARTIBI ═══
QADAM 1 — RASM SIFATINI BAHOLASHTIR:
  • Fokus aniqligini tekshir (tuxum konturlari ko'rinyaptimi?)
  • Fon ifloslanish darajasini baholashtir
  • Yorug'lik va zichlik mos keladimi?

QADAM 2 — PARAZIT ELEMENTLARNI QIDIR:
  Quyidagi MORFOLOGIK BELGILARGA QARAB qidirish:
  A) NEMATODA tuxumlari:
     • Ascaris lumbricoides: 45-75µm oval, burchakli/silliq qobiq, ichida blastomer
     • Trichuris trichiura: 50-55µm "limon" shakl, ikkala uchida zich tiqin
     • Enterobius vermicularis: 50-60µm bir tomoni yassi, o'txonli ichki tuzilish
     • Toxocara spp: 85-95µm qalin g'adir-budir qobiq, qorong'i ichki massa
  B) CESTODA tuxumlari/proglottidlari:
     • Taenia spp: 30-35µm, qalin radial tarvaqaylangan qobiq, ichida hexakant
     • Hymenolepis nana: 40-50µm oval, ichki zar, 6 ilmoq
  C) TREMATODA tuxumlari:
     • Opisthorchis/Clonorchis: 25-35µm "qovoq urug'i" shakl, qopqoqli
     • Fasciola hepatica: 130-150µm KATTA oval, sariq-jigarrang
  D) PROTOZOA (agar ko'rinsa):
     • Kista yoki trofozoit shaklida

QADAM 3 — ARTEFAKTDAN FARQLASHTIR:
  ❌ Artefaktlar (PARAZIT EMAS): o'simlik tolalari, yog' tomchilari,
     havo pufakchalari, iplar, fermentlanmagan qoldiqlar, hujayralar

QADAM 4 — HAR BIR TOPILGAN TUR UCHUN:
  • Tuxumlar SONINI sanash (juda ko'p → -1)
  • Morfologiya tasvirini tayyorlash
  • Ishonch darajasini FAQAT rasmda ko'ringan belgilarga asoslab belgilash

═══ MUHIM QOIDALAR ═══
⚠ Ishonch darajasi 0.7 dan past bo'lsa — "qoshimcha_izoh"da SABAB ko'rsat
⚠ Rasm sifati "past" bo'lsa — "qoshimcha_izoh"da tushuntir
⚠ Bir xil morfologiyaga ega tuxumlar bor bo'lsa — eng yuqori ishonch darajasinikini tanlash
⚠ Noaniqlik bo'lsa — ishonch_darajasi 0.4 dan past, izoh yoz

JAVOB QAT'IY FAQAT JSON FORMATIDA, {language} TILIDA:

{{
  "gijja_topildimi": true,
  "aniqlangan_turlar": [
    {{
      "lotin_nomi": "Gijja lotincha ilmiy nomi",
      "uz_nomi": "Gijja nomi va turi (tibbiyot tilida) O'zbek tilida",
      "ru_nomi": "Гельминт на русском языке",
      "en_nomi": "Helminth name in English",
      "ishonch_darajasi": 0.0_dan_1.0_gacha_son,
      "voyaga_yetgan_bor": true_yoki_false,
      "tuxum_soni": butun_son_yo_-1_yo_0,
      "tuxum_morfologiyasi": "Tuxumning batafsil vizual tavsifi: shakl, o'lcham, qobiq, ichki tuzilish",
      "infektsiya_darajasi": "light",
      "infektsiya_uz": "Yengil"
    }}
  ],
  "jami_tuxum_soni": 0,
  "jami_jiddiylik": 1,
  "davolash_tavsiyasi": "Davolash bo'yicha tavsiyalar",
  "shifokorga_tavsiya": "Shifokorga maxsus tavsiyalar",
  "rasm_sifati": "yaxshi",
  "qoshimcha_izoh": "Qo'shimcha izohlar, noaniqliklar, cheklovlar",
  "yakuniy_xulosa": "Tahlil natijalari asosida yakuniy tibbiy xulosa"
}}

MAJBURIY QOIDALAR:
- "gijja_topildimi": faqat true yoki false
- "ishonch_darajasi": 0.0 — 1.0 (faqat ko'rinadigan morfologik belgilarga asosla, taxmin emas)
- "voyaga_yetgan_bor": rasmda voyaga yetgan parazit tanasi ko'rinsa true
- "tuxum_soni": sanab chiqilgan tuxumlar soni; juda ko'p bo'lsa -1; yo'q bo'lsa 0
- "infektsiya_darajasi": FAQAT "light" YOKI "moderate" YOKI "heavy"
- "infektsiya_uz": FAQAT "Yengil" YOKI "O'rtacha" YOKI "Og'ir"
- "jami_jiddiylik": FAQAT 1 (engil) YOKI 2 (o'rta) YOKI 3 (og'ir)
- "rasm_sifati": FAQAT "yaxshi" YOKI "qoniqarli" YOKI "past"
- Gijja topilmasa: "gijja_topildimi": false, "aniqlangan_turlar": [], "jami_tuxum_soni": 0, "jami_jiddiylik": 1
- JSON dan tashqarida HECH QANDAY matn yozilmasin — na ```json, na izoh, na tushuntirish"""


@router.post("/analyze-parasitology")
async def analyze_parasitology(
    user: dict = Depends(verify_token),
    file: UploadFile = File(...),
    magnification: str = Form(...),
    gender: str = Form(...),
    age: int = Form(...),
    complaints: Optional[List[str]] = Form(None),
    lang: str = Form("uz"),
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    fname = (file.filename or "upload").lower()
    ext = "." + fname.rsplit(".", 1)[-1] if "." in fname else ""
    if ext not in ALLOWED_EXTENSIONS:
        return JSONResponse(content={
            "xato": "noto'g'ri_fayl_turi",
            "xabar": f"Faqat JPG/PNG rasmlari qabul qilinadi. Yuborilgan: {ext}"
        }, status_code=400)

    content = await file.read()

    img_b64 = base64.b64encode(content).decode("utf-8")
    mime = "image/png" if ext == ".png" else "image/jpeg"
    data_url = f"data:{mime};base64,{img_b64}"

    prompt = _build_prompt(magnification, gender, age, complaints or [], lang)

    parsed = {}
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model=OPENAI_MODEL or "gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sen tajribali parazitolog-laborant mutaxassisisan. "
                        "Berilgan mikroskopik tasvirdagi ANIQ ko'rinadigan morfologik belgilarga asoslanib, "
                        "koprologik tekshiruv natijasini aniqlash. "
                        "FAQAT sof JSON formatida javob ber. Markdown, ```, izoh, boshqa matn YOZILMASIN. "
                        "Har safar bir xil rasm uchun bir xil natija ber — taxmin emas, faqat ko'ringan belgilar."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url, "detail": "high"}}
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=2500,
            temperature=0,
            seed=42,
        )

        # Model refusal yoki bo'sh content ni tekshirish
        raw = resp.choices[0].message.content
        if not raw or not raw.strip():
            logger.warning("Parasitology AI: model bo'sh javob qaytardi (refusal yoki xatolik)")
            return JSONResponse(content={
                "xato": "model_rad_etdi",
                "xabar": "AI model rasm tahlilini rad etdi yoki bo'sh javob qaytardi. Rasmni tekshirib qayta yuboring."
            }, status_code=422)

        # JSON parse qilish — markdown wrapper ni ham olib tashlash
        raw = raw.strip()
        if raw.startswith("```"):
            # Markdown code block ni olib tashlash
            lines = raw.split("\n")
            raw = "\n".join(
                line for line in lines
                if not line.strip().startswith("```")
            ).strip()

        try:
            parsed = json.loads(raw)
        except Exception as parse_err:
            logger.error("Parasitology AI JSON parse xatolik: %s | Raw: %.200s", str(parse_err), raw)
            return JSONResponse(content={
                "xato": "json_parse_xatolik",
                "xabar": "AI javobini JSON ko'rinishiga o'girib bo'lmadi. Qayta urinib ko'ring."
            }, status_code=500)

        if isinstance(parsed, dict):
            rasm_sifati = parsed.get("rasm_sifati", "")
            if rasm_sifati == "past":
                return JSONResponse(content={
                    "xato": "rasm_sifati_past",
                    "xabar": "Rasm sifati past — aniqroq rasm bilan qayta yuklang"
                }, status_code=422)

        logger.info("Parasitology AI tahlil muvaffaqiyatli, gijja_topildimi=%s",
                    parsed.get("gijja_topildimi", "?"))

    except Exception as e:
        logger.error("Parasitology AI xatolik: %s", str(e))
        return JSONResponse(content={
            "xato": "ai_xatolik",
            "xabar": str(e)
        }, status_code=500)

    return JSONResponse(content={"ai_response": parsed})
