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

    return f"""Sen NMED tibbiy laboratoriya platformasining tajribali parazitolog mutaxassisisan.
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

{{
  "gijja_topildimi": true,
  "aniqlangan_turlar": [
    {{
      "lotin_nomi": "Ascaris lumbricoides",
      "uz_nomi": "Oddiy gijja",
      "ru_nomi": "Аскарида",
      "en_nomi": "Common roundworm",
      "ishonch_darajasi": 0.92,
      "voyaga_yetgan_bor": false,
      "tuxum_soni": 14,
      "tuxum_morfologiyasi": "Oval shaklda, qalin burchakli qobiqli, 45-70 mkm, ichida blastomer ko'rinmoqda",
      "infektsiya_darajasi": "moderate",
      "infektsiya_uz": "O'rtacha"
    }}
  ],
  "jami_tuxum_soni": 14,
  "jami_jiddiylik": 2,
  "davolash_tavsiyasi": "...",
  "shifokorga_tavsiya": "...",
  "rasm_sifati": "yaxshi",
  "qoshimcha_izoh": "...",
  "yakuniy_xulosa": "..."
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
- JSON dan tashqarida HECH QANDAY matn yozilmasin"""


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
                        "Sen tajribali parazitolog laboratoriya mutaxassisisan. "
                        "Berilgan mikroskopik tasvir asosida parazitologik tekshiruv natijasini aniqlashtir. "
                        "Faqat JSON formatida javob ber, boshqa matn yozma."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}}
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=2000,
        )
        raw = resp.choices[0].message.content or ""
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw}

        if isinstance(parsed, dict):
            rasm_sifati = parsed.get("rasm_sifati", "")
            if rasm_sifati == "past":
                return JSONResponse(content={
                    "xato": "rasm_sifati_past",
                    "xabar": "Rasm sifati past — qayta yuklang"
                }, status_code=422)

        logger.info("Parasitology AI tahlil muvaffaqiyatli")

    except Exception as e:
        logger.error("Parasitology AI xatolik: %s", str(e))
        return JSONResponse(content={
            "xato": "ai_xatolik",
            "xabar": str(e)
        }, status_code=500)

    return JSONResponse(content={"ai_response": parsed})
