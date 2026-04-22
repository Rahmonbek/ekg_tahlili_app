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


def _build_prompt(microscopy_method: str, magnification: str, gender: str,
                  age: int, egg_count: int, complaints: List[str], lang: str) -> str:
    language = (
        "O'ZBEK" if lang == "uz"
        else "RUS" if lang == "ru"
        else "INGLIZ"
    )
    egg_text = str(egg_count) if egg_count and egg_count > 0 else "aniqlanmagan"
    complaints_text = ", ".join(complaints) if complaints else "ko'rsatilmagan"

    return f"""Mikroskopik tasvir tahlili:
- Buyatkovka usuli: {microscopy_method}
- Kattalashtirish: {magnification}
- Bemor: {age} yosh, {gender}
- Ko'rish maydonidagi tuxum soni: {egg_text}
- Shikoyatlar: {complaints_text}

❗️ JAVOB QOIDALARI:
- Javob FAQAT quyidagi JSON formatida bo'lsin
- JSON dan tashqarida hech qanday matn yozilmasin
- Javob {language} tilida bo'lsin
- Faqat mikroskopik tekshiruvga asoslangan, klinik tashxis qo'yma

### JSON SHABLONI (QAT'IY SAQLANSIN):

{{
  "gijja_topildimi": true,
  "aniqlangan_turlar": [
    {{
      "lotin_nomi": "Ascaris lumbricoides",
      "uz_nomi": "Oddiy gijja",
      "ru_nomi": "Аскарида",
      "en_nomi": "Common roundworm",
      "ishonch_darajasi": 0.92,
      "infektsiya_darajasi": "light",
      "infektsiya_uz": "Yengil"
    }}
  ],
  "jami_jiddiylik": 1,
  "davolash_tavsiyasi": "Davolash rejasi...",
  "shifokorga_tavsiya": "Shifokorga tavsiya...",
  "rasm_sifati": "yaxshi",
  "qoshimcha_izoh": "...",
  "yakuniy_xulosa": "..."
}}

### QO'SHIMCHA TALABLAR:
- "gijja_topildimi" faqat true yoki false
- "ishonch_darajasi" 0.0 dan 1.0 gacha
- "infektsiya_darajasi" faqat: "light", "moderate", "heavy"
- "jami_jiddiylik" faqat 1, 2 yoki 3
- "rasm_sifati" faqat: "yaxshi", "qoniqarli", "past"
- Gijja topilmasa: "gijja_topildimi": false, "aniqlangan_turlar": []

❗️ Javob FAQAT JSON bo'lsin va {language} tilida bo'lsin"""


@router.post("/analyze-parasitology")
async def analyze_parasitology(
    user: dict = Depends(verify_token),
    file: UploadFile = File(...),
    microscopy_method: str = Form(...),
    magnification: str = Form(...),
    gender: str = Form(...),
    age: int = Form(...),
    egg_count_per_field: int = Form(0),
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

    prompt = _build_prompt(
        microscopy_method, magnification, gender,
        age, egg_count_per_field, complaints or [], lang
    )

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
