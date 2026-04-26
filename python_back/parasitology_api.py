import base64
import json
import logging
import re
from typing import List, Optional

from openai import OpenAI
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from auth_middleware import verify_token
from config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="",
    tags=["Parasitology Analyses"]
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

# ─────────────────────────────────────────────────────────────
# SYSTEM PROMPT — Professional parazitolog
# ─────────────────────────────────────────────────────────────
ANALYSIS_SYSTEM_PROMPT = """Sen professional parazitolog va tibbiy laboratoriya diagnostikistsan.
men yuborayotgan mikroskopdan olingan rasmda qanday turlardagi gijja tuxumlari yoki voyaga yetgan  gijjalar borligini aniqlab ber.
Sen beradigan natijani faqat shifokor mutaxasis ko'radi. Lekin mutaxassisni chalg'itmaslik uchun turlarni aniq aytishing kerak. Rasmni tahlil qilishda parazitalogiyaga oid barcha bilimlaringdan foydalan.
Vizual ko'rinishda gijja turlari bir biriga katta ehtimollik bilan o'xshash bo'ladi, ammo ularni bir birida ajratadigan kichik belgilari ham mavjud shu belgilarni aniqlash va tekshirish orqali gijja turlarini chalkashtirmaslikka harakat qil.
Mutaxassiga rasmda mavjud gijja turlarini va jsonda so'ralayotgan boshqa ma'lumotlarni taqdim etishing kerak. Maksimal tarzda sinchikovlik bilan tekshiruv o'tkaz.
Artefaktlarni gijja deb hisoblama. Rasm atrofi qora aylana bilan o'rab turgan bo'lsa bu mikroskopning devori bo'lishi mumkin. Erinmasdan rasmni har bir pixelini ko'rib chiq. Askarida deb aytishdan oldin aniq askaridami yoki yo'qligini tekshir oldin. 100% ishonching komil bo'lsa keyin askarida deb ayt."""

# double {{ }} — f-string ichida saqlanadi, .format() da { } ga aylanadi
JSON_SCHEMA = """{{
  "gijja_topildimi": true,
  "aniqlangan_turlar": [
    {{
      "lotin_nomi": "...",
      "uz_nomi": "...",
      "ru_nomi": "...",
      "en_nomi": "...",
      "ishonch_darajasi": 0.0,
      "voyaga_yetgan_bor": false,
      "tuxum_soni": 0,
      "tuxum_morfologiyasi": "...",
      "infektsiya_darajasi": "light | moderate | heavy",
      "infektsiya_uz": "Yengil | O'rtacha | Og'ir"
    }}
  ],
  "jami_tuxum_soni": 0,
  "jami_jiddiylik": 1,
  "davolash_tavsiyasi": "...",
  "shifokorga_tavsiya": "...",
  "rasm_sifati": "yaxshi | o'rtacha | yomon",
  "qoshimcha_izoh": "...",
  "yakuniy_xulosa": "..."
}}"""


def _build_prompt(magnification: str, gender: str, age: int,
                  complaints: List[str], lang: str) -> str:
    language = "O'ZBEK" if lang == "uz" else "RUSCHA" if lang == "ru" else "ENGLISH"
    complaints_text = ", ".join(complaints) if complaints else "ko'rsatilmagan"

    return f"""BEMOR MA'LUMOTLARI:
- Kattalashtirish: {magnification}
- Bemor: {age} yosh, {gender}
- Shikoyatlar: {complaints_text}

Rasmni tahlil qil va FAQAT JSON formatida ({language} tilida) javob ber:

{JSON_SCHEMA}
"""


def _analyze_image_direct(client: OpenAI, img_b64: str, mime: str,
                          magnification: str, gender: str,
                          age: int, complaints: list, lang: str) -> str:
    """GPT-4o — rasmni to'g'ridan-to'g'ri analiz qiladi, JSON qaytaradi."""
    prompt = _build_prompt(magnification, gender, age, complaints, lang)

    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{img_b64}",
                            "detail": "high"
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ],
        response_format={"type": "json_object"},
       temperature=0,
    top_p=1,
    max_tokens=3000,
    presence_penalty=0,
    frequency_penalty=0,
    seed=42

    )
    return resp.choices[0].message.content or ""


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
            "xabar": "Faqat JPG/PNG rasmlari qabul qilinadi."
        }, status_code=400)

    content = await file.read()
    img_b64 = base64.b64encode(content).decode("utf-8")
    mime = "image/png" if ext == ".png" else "image/jpeg"

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)

        raw = _analyze_image_direct(
            client, img_b64, mime,
            magnification, gender, age,
            complaints or [], lang
        )

        if not raw:
            return JSONResponse(content={"xato": "model_bo'sh_javob"}, status_code=422)

        json_match = re.search(r'\{[\s\S]*\}', raw)
        if not json_match:
            logger.error(f"Parasitology JSON parse xatosi. raw[:300]: {raw[:300]}")
            return JSONResponse(
                content={"xato": "model_json_qaytarmadi", "raw": raw[:300]},
                status_code=422
            )
        parsed = json.loads(json_match.group())

        # Bonus logging
        turlar = parsed.get("aniqlangan_turlar") or []
        for tur in turlar:
            if not tur.get("lotin_nomi") or tur.get("lotin_nomi") == "...":
                logger.warning("Parasitology: lotin_nomi bo'sh yoki to'ldirilmagan")
            if tur.get("ishonch_darajasi", 1) == 0:
                logger.warning("Parasitology: ishonch_darajasi = 0")

        if parsed.get("rasm_sifati") in ["past", "yomon"]:
            return JSONResponse(content={
                "xato": "rasm_sifati_past",
                "xabar": "Rasm sifati tahlil uchun yetarli emas."
            }, status_code=422)

        return JSONResponse(content={"ai_response": parsed})

    except Exception as e:
        logger.error(f"Parasitology AI xatolik: {str(e)}")
        return JSONResponse(content={"xato": "ai_xatolik", "xabar": str(e)}, status_code=500)
