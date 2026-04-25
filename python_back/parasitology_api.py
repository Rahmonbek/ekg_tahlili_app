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

    return f"""
Sen NMED tibbiy laboratoriya platformasining tajribali parazitolog mutaxassisisan.
Quyidagi mikroskopik tasvir najas (kal) preparatidan olingan.

TAHLIL MA'LUMOTLARI:
- Kattalashtirish: {magnification}
- Bemor: {age} yosh, {gender}
- Shikoyatlar: {complaints_text}

VAZIFANG — RASMNI DIQQAT BILAN KO'RIB CHIQ:
1. Rasmda ko'rinayotgan BARCHA gijja (parazit) turlari va ularning TUXUMLARINI aniqlash
2. Har bir topilgan tur uchun RASMDAN TO'G'RIDAN-TO'G'RI:
   - Ko'rinayotgan TUXUMLAR SONINI sanash (50 tadan ko'p bo'lsa: -1)
   - Voyaga yetgan parazit (gijja tanasi, segment, lichinka) bor-yo'qligini aniqlash
   - Tuxum morfologiyasini tasvirlash: shakl, qobiq qalinligi, o'lchami, ichki tuzilishi
3. Artefaktlarni (soch, tolalar, havo pufakchalari, qoldiqlar) parazit deb hisoblatma
4. Noaniq bo'lsa — ishonch_darajasini past qo'y va izoh qoldir

JAVOB QAT'IY FAQAT JSON FORMATIDA, {language} TILIDA:
MUHIM MORFOLOGIK AJRATISH:

- Agar tuxum ichida markaziy embrion va aniq ko‘rinadigan ilgakchalar (hooklets) bo‘lsa:
  -> bu Ascaris EMAS
  -> Hymenolepis yoki boshqa cestode ehtimoli yuqori

- Agar tuxum qobig‘i ikki qavatli (double contour) va ichida ipga o‘xshash strukturalar (polar filaments) bo‘lsa:
  -> Hymenolepis nana deb bahola

- Ascaris tuxumi uchun:
  -> tashqi qobiq notekis (mamillated)
  -> ichida hooklets bo‘lmaydi

- Agar hooklets mavjud bo‘lsa:
  -> Ascaris variantini butunlay chiqarib tashla
{{
  "gijja_topildimi": true,
  "aniqlangan_turlar": [
    {{
      "lotin_nomi": "Gijja lotincha nomi",
      "uz_nomi": "Gijja nomi va turi (tibbiyot tilida) O'zbek tilida",
      "ru_nomi": "Гельминт на русском языке",
      "en_nomi": "Helminth name in English",
      "ishonch_darajasi": Ishonch darajasi 0.0 dan 1.0 gacha,
      "voyaga_yetgan_bor": true yoki false,
      "tuxum_soni": ko'rinayotgan tuxumlar soni (butun son); juda ko'p bo'lsa -1; yo'q bo'lsa 0,
      "tuxum_morfologiyasi": "Tuxumning vizual tavsifi va morfologiyasi, yo'q bo'lsa ''",
      "infektsiya_darajasi": "light" | "moderate" | "heavy",
      "infektsiya_uz": "O'zbek tilida infektsiya darajasi: Yengil, O'rtacha yoki Og'ir"
    }}
  ],
  "jami_tuxum_soni": Jami tuxum soni barcha turlar bo'yicha,
  "jami_jiddiylik": Umumiy jiddiylik darajasi 1 (engil) | 2 (o'rta) | 3 (og'ir),
  "davolash_tavsiyasi": "Davolash bo'yicha tavsiyalar, agar mavjud bo'lsa",
  "shifokorga_tavsiya": "Shifokorga tavsiyalar, agar mavjud bo'lsa",
  "rasm_sifati": "yaxshi" | "qoniqarli" | "past",
  "qoshimcha_izoh": "Qo'shimcha izohlar yoki tavsiyalar, agar mavjud bo'lsa",
  "yakuniy_xulosa": "Rasm va tahlil asosida yakuniy xulosa va tavsiyalar"
}}

QOIDALAR (QAT'IY BAJAR):
- "gijja_topildimi": true yoki false
- "ishonch_darajasi": 0.0 — 1.0 (faqat ko'rinadigan belgilarga asosla)
- "voyaga_yetgan_bor": rasmda voyaga yetgan parazit ko'rinsa true, aks holda false
- "tuxum_soni": ko'rinayotgan tuxumlar soni (butun son); juda ko'p bo'lsa -1; yo'q bo'lsa 0
- "tuxum_morfologiyasi": tuxumning vizual tavsifi, yo'q bo'lsa ""
- "infektsiya_darajasi": "light" | "moderate" | "heavy"
- "infektsiya_uz": "Yengil" | "O'rtacha" | "Og'ir"
- "jami_tuxum_soni": barcha turlar bo'yicha umumiy tuxum soni
- "jami_jiddiylik": 1 (engil) | 2 (o'rta) | 3 (og'ir)
- "rasm_sifati": "yaxshi" | "qoniqarli" | "past"
- Gijja topilmasa: "gijja_topildimi": false, "aniqlangan_turlar": [], "jami_tuxum_soni": 0
- JSON dan tashqarida HECH QANDAY matn yozilmasin
"""


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
            temperature=0
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
