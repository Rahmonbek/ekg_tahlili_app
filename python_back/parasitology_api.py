import logging
import tempfile
import os

from openai import OpenAI
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from auth_middleware import verify_token
from config import OPENAI_API_KEY
from file_validator import prepare_upload_filename

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Parasitology Analyses"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB

ANALYSIS_SYSTEM_PROMPT = """
Sen tajribali va professional parazitologsan.
Bu rasmda qanday turdagi gijja yoki gijja tuxumi mavjudligini ayt
"""


def _analyze_image_direct(
    client: OpenAI,
    image_bytes: bytes,
    filename: str,
) -> str:
    suffix = os.path.splitext(filename)[1] or ".jpg"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(image_bytes)
        temp_file_path = temp_file.name

    try:
        with open(temp_file_path, "rb") as image_file:
            uploaded_file = client.files.create(
                file=image_file,
                purpose="vision"
            )

        response = client.responses.create(
            model="gpt-4o",
            input=[
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "input_text",
                            "text": ANALYSIS_SYSTEM_PROMPT
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": ANALYSIS_SYSTEM_PROMPT
                        },
                        {
                            "type": "input_image",
                            "file_id": uploaded_file.id,
                            "detail": "high"
                        }
                    ]
                }
            ],
            temperature=0,
            max_output_tokens=1000
        )

        ai_text = response.output_text

        if not ai_text:
            raise ValueError("Model bo'sh javob qaytardi")

        return ai_text.strip()

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@router.post("/analyze-parasitology")
async def analyze_parasitology(
    user: dict = Depends(verify_token),
    file: UploadFile = File(...),
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY mavjud emas")

    content = await file.read()
    fname = prepare_upload_filename(file.filename or "upload.jpg", content, default_stem="parasitology_upload").lower()
    ext = "." + fname.rsplit(".", 1)[-1] if "." in fname else ""

    if ext not in ALLOWED_EXTENSIONS:
        return JSONResponse(
            content={
                "xato": "notogri_fayl_turi",
                "xabar": "Faqat JPG, JPEG yoki PNG rasmlari qabul qilinadi."
            },
            status_code=400
        )

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

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)

        ai_text = _analyze_image_direct(
            client=client,
            image_bytes=content,
            filename=fname,
        )

        result = {
            "text": ai_text
        }

        return JSONResponse(
            content={
                "ai_response": result
            },
            status_code=200
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
