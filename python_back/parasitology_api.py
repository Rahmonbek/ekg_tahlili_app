import base64
import json
import logging
from typing import List, Optional

from openai import OpenAI
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from auth_middleware import verify_token
from config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Parasitology Analyses"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB


ANALYSIS_SYSTEM_PROMPT = """
Sen tajribali tibbiy parazitolog va laboratoriya diagnostik mutaxassisisan.

VAZIFA:
Mikroskopdan olingan najas/preparat rasmini tahlil qilasan.
Faqat rasmda KO'RINIB TURGAN parazit/gijja tuxumi, kista, lichinka yoki voyaga yetgan shakllarni baholaysan.

MUHIM QOIDALAR:
1. Artefaktlarni gijja deb yozma.
2. Kraxmal donachalari, o'simlik hujayralari, yog' tomchilari, havo pufakchalari, tolalar, najas detriti va kristallarni parazit deb hisoblama.
3. Agar aniq morfologik belgi bo'lmasa, gijja_topildimi=false qil.
4. Taxminiy o'xshashlik asosida Ascaris, Hymenolepis, Giardia yoki boshqa turni yozma.
5. Tur nomini faqat quyidagi belgilar aniq ko'rinsa yoz:
   - Ascaris lumbricoides: qalin qobiq, ko'pincha notekis/mammillated tashqi qavat, oval/yumaloq tuxum.
   - Trichuris trichiura: limon/bochka shakl, ikki uchida aniq polar plug.
   - Enterobius vermicularis: D-shakl, bir tomoni tekis, ichida lichinka.
   - Hymenolepis nana: dumaloq/oval, ikki qavatli qobiq, onkosfera va polar filamentlar ko'rinishi mumkin.
   - Taenia spp.: qalin radial chiziqli qobiq, ichida onkosfera.
   - Ancylostoma/Necator: yupqa qobiq, segmentlangan embrion.
   - Giardia lamblia: bu gijja emas, protozoy; oval kista, ichida yadrolar/ichki strukturalar.
6. Agar rasm sifati yomon bo'lsa yoki obyekt noaniq bo'lsa, topilma bermasdan izohda qayta rasm olishni ayt.
7. Davolash bo'yicha aniq dori nomi yoki doza yozma. Faqat shifokor/laborator tasdig'ini tavsiya qil.
8. Faqat JSON qaytar. Markdown, izoh, matn qo'shma.
"""


PARASITOLOGY_JSON_SCHEMA = {
    "name": "parasitology_analysis_response",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "gijja_topildimi",
            "aniqlangan_turlar",
            "jami_tuxum_soni",
            "jami_jiddiylik",
            "davolash_tavsiyasi",
            "shifokorga_tavsiya",
            "rasm_sifati",
            "qoshimcha_izoh",
            "yakuniy_xulosa"
        ],
        "properties": {
            "gijja_topildimi": {"type": "boolean"},
            "aniqlangan_turlar": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "lotin_nomi",
                        "uz_nomi",
                        "ru_nomi",
                        "en_nomi",
                        "ishonch_darajasi",
                        "voyaga_yetgan_bor",
                        "tuxum_soni",
                        "tuxum_morfologiyasi",
                        "infektsiya_darajasi",
                        "infektsiya_uz"
                    ],
                    "properties": {
                        "lotin_nomi": {"type": "string"},
                        "uz_nomi": {"type": "string"},
                        "ru_nomi": {"type": "string"},
                        "en_nomi": {"type": "string"},
                        "ishonch_darajasi": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1
                        },
                        "voyaga_yetgan_bor": {"type": "boolean"},
                        "tuxum_soni": {
                            "type": "integer",
                            "minimum": 0
                        },
                        "tuxum_morfologiyasi": {"type": "string"},
                        "infektsiya_darajasi": {
                            "type": "string",
                            "enum": ["light", "moderate", "heavy", "unknown"]
                        },
                        "infektsiya_uz": {
                            "type": "string",
                            "enum": ["Yengil", "O'rtacha", "Og'ir", "Noma'lum"]
                        }
                    }
                }
            },
            "jami_tuxum_soni": {
                "type": "integer",
                "minimum": 0
            },
            "jami_jiddiylik": {
                "type": "integer",
                "minimum": 0,
                "maximum": 3
            },
            "davolash_tavsiyasi": {"type": "string"},
            "shifokorga_tavsiya": {"type": "string"},
            "rasm_sifati": {
                "type": "string",
                "enum": ["yaxshi", "o'rtacha", "yomon"]
            },
            "qoshimcha_izoh": {"type": "string"},
            "yakuniy_xulosa": {"type": "string"}
        }
    }
}


def _build_prompt(
    magnification: str,
    gender: str,
    age: int,
    complaints: List[str],
    lang: str
) -> str:
    language = "O'ZBEK" if lang == "uz" else "РУССКИЙ" if lang == "ru" else "ENGLISH"
    complaints_text = ", ".join(complaints) if complaints else "ko'rsatilmagan"

    return f"""
TAHLIL MA'LUMOTLARI:
- Preparat: najas / mikroskopik rasm
- Kattalashtirish: {magnification}
- Bemor yoshi: {age}
- Bemor jinsi: {gender}
- Shikoyatlar: {complaints_text}
- Javob tili: {language}

TALAB:
Rasmda gijja tuxumi, protozoy kistasi, lichinka yoki voyaga yetgan parazit bormi — faqat vizual morfologik belgilarga asoslanib bahola.

Agar rasmda faqat artefakt, kraxmal, o'simlik hujayrasi, tolalar, yog' tomchisi, havo pufagi yoki detrit ko'rinsa:
- gijja_topildimi=false
- aniqlangan_turlar=[]
- jami_tuxum_soni=0
- jami_jiddiylik=0

Agar parazit aniq topilsa:
- har bir tur uchun lotin, uz, ru, en nomlarini to'ldir
- ishonch_darajasini 0 dan 1 gacha yoz
- tuxum_soni aniq ko'ringan tuxum/kista soni bo'lsin
- morfologik sababni qisqa yoz

Faqat JSON qaytar.
"""


def _analyze_image_direct(
    client: OpenAI,
    img_b64: str,
    mime: str,
    magnification: str,
    gender: str,
    age: int,
    complaints: List[str],
    lang: str
) -> dict:
    prompt = _build_prompt(magnification, gender, age, complaints, lang)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": ANALYSIS_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{img_b64}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": PARASITOLOGY_JSON_SCHEMA
        },
        temperature=0,
        top_p=1,
        max_tokens=3000,
        seed=42
    )

    content = response.choices[0].message.content

    if not content:
        raise ValueError("Model bo'sh javob qaytardi")

    return json.loads(content)


def _normalize_response(parsed: dict) -> dict:
    """
    Model schema bo'yicha qaytaradi, lekin biznes qoidalarni yana bir marta tekshiramiz.
    JSON strukturani o'zgartirmaydi.
    """

    turlar = parsed.get("aniqlangan_turlar") or []

    if not parsed.get("gijja_topildimi"):
        parsed["aniqlangan_turlar"] = []
        parsed["jami_tuxum_soni"] = 0
        parsed["jami_jiddiylik"] = 0
        return parsed

    valid_turlar = []
    total_count = 0

    for tur in turlar:
        confidence = float(tur.get("ishonch_darajasi", 0))
        tuxum_soni = int(tur.get("tuxum_soni", 0))

        # Juda past ishonchdagi topilmalarni olib tashlaymiz
        if confidence < 0.55:
            continue

        valid_turlar.append(tur)
        total_count += max(tuxum_soni, 0)

    parsed["aniqlangan_turlar"] = valid_turlar
    parsed["jami_tuxum_soni"] = total_count

    if not valid_turlar:
        parsed["gijja_topildimi"] = False
        parsed["jami_tuxum_soni"] = 0
        parsed["jami_jiddiylik"] = 0
        parsed["yakuniy_xulosa"] = "Rasmda ishonchli parazit/gijja tuxumi aniqlanmadi."
        parsed["qoshimcha_izoh"] = (
            parsed.get("qoshimcha_izoh", "") +
            " Past ishonchli taxminlar yakuniy natijaga kiritilmadi."
        ).strip()

    return parsed


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
        return JSONResponse(
            content={
                "xato": "notogri_fayl_turi",
                "xabar": "Faqat JPG, JPEG yoki PNG rasmlari qabul qilinadi."
            },
            status_code=400
        )

    content = await file.read()

    if not content:
        return JSONResponse(
            content={
                "xato": "bosh_fayl",
                "xabar": "Yuklangan fayl bo'sh."
            },
            status_code=400
        )

    if len(content) > MAX_FILE_SIZE:
        return JSONResponse(
            content={
                "xato": "fayl_hajmi_katta",
                "xabar": "Rasm hajmi 8 MB dan oshmasligi kerak."
            },
            status_code=400
        )

    mime = "image/png" if ext == ".png" else "image/jpeg"
    img_b64 = base64.b64encode(content).decode("utf-8")

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)

        parsed = _analyze_image_direct(
            client=client,
            img_b64=img_b64,
            mime=mime,
            magnification=magnification,
            gender=gender,
            age=age,
            complaints=complaints or [],
            lang=lang
        )

        parsed = _normalize_response(parsed)

        if parsed.get("rasm_sifati") == "yomon":
            return JSONResponse(
                content={
                    "ai_response": parsed,
                    "ogohlantirish": "Rasm sifati past. Natija laborator mutaxassis tomonidan tekshirilishi kerak."
                },
                status_code=200
            )

        return JSONResponse(content={"ai_response": parsed}, status_code=200)

    except json.JSONDecodeError:
        logger.exception("Model JSON parse xatosi")
        return JSONResponse(
            content={
                "xato": "json_parse_xatosi",
                "xabar": "Model noto'g'ri JSON qaytardi."
            },
            status_code=422
        )

    except Exception as e:
        logger.exception("Parasitology AI xatolik")
        return JSONResponse(
            content={
                "xato": "ai_xatolik",
                "xabar": str(e)
            },
            status_code=500
        )