"""
NMED - Fayl turi tekshiruvi moduli.
Faqat kengaytmaga emas, haqiqiy fayl content (magic bytes) ga qarab tekshiradi.
"""
import os
import re
import unicodedata
from email.header import decode_header

# Ruxsat etilgan fayl turlari va ularning magic bytes (imzo) lari
ALLOWED_FILE_SIGNATURES = {
    '.png': [b'\x89PNG\r\n\x1a\n'],
    '.jpg': [b'\xff\xd8\xff'],
    '.jpeg': [b'\xff\xd8\xff'],
    '.pdf': [b'%PDF'],
    '.xml': [b'<?xml', b'\xef\xbb\xbf<?xml'],
    '.csv': None,
    '.txt': None,
    '.tsv': None,
}

ENCODED_WORD_PATTERN = re.compile(r"=\?[^?]+\?[bBqQ]\?[^?]+\?=")


def normalize_filename(filename: str) -> str:
    """
    RFC 2047/MIME encoded fayl nomlarini oddiy UTF-8 ko'rinishga keltiradi.
    Masalan:
    =?utf-8?b?...?=
    """
    if not filename:
        return ""

    try:
        parts = decode_header(filename)
        decoded_parts = []
        for value, encoding in parts:
            if isinstance(value, bytes):
                decoded_parts.append(value.decode(encoding or "utf-8", errors="ignore"))
            else:
                decoded_parts.append(value)
        normalized = "".join(decoded_parts).strip()
        return normalized or filename.strip()
    except Exception:
        return filename.strip()


def sanitize_filename(filename: str, default_stem: str = "upload") -> str:
    normalized = normalize_filename(filename)
    base_name = os.path.basename(normalized).strip().replace("\\", "/").split("/")[-1]
    stem, ext = os.path.splitext(base_name)
    original_has_encoded_word = bool(ENCODED_WORD_PATTERN.search(filename or ""))
    normalized_has_encoded_word = bool(ENCODED_WORD_PATTERN.search(normalized))

    if original_has_encoded_word and (normalized == (filename or "").strip() or normalized_has_encoded_word):
        stem = default_stem
        ext = ""

    ascii_stem = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
    ascii_stem = re.sub(r"[^A-Za-z0-9._ -]+", "_", ascii_stem)
    ascii_stem = re.sub(r"\s+", "_", ascii_stem).strip("._- ")
    ascii_stem = ascii_stem or default_stem

    safe_ext = re.sub(r"[^A-Za-z0-9.]+", "", ext.lower())
    if safe_ext and not safe_ext.startswith("."):
        safe_ext = f".{safe_ext}"

    return f"{ascii_stem}{safe_ext}"


def detect_extension_by_signature(content: bytes) -> str | None:
    for ext, signatures in ALLOWED_FILE_SIGNATURES.items():
        if signatures is None:
            continue
        for sig in signatures:
            if content[:len(sig)] == sig:
                return ext
    return None


def prepare_upload_filename(filename: str, content: bytes, default_stem: str = "upload") -> str:
    safe_filename = sanitize_filename(filename, default_stem=default_stem)
    stem, ext = os.path.splitext(safe_filename)

    if ext in ALLOWED_FILE_SIGNATURES:
        return safe_filename

    detected_ext = detect_extension_by_signature(content)
    if detected_ext:
        return f"{stem or default_stem}{detected_ext}"

    return safe_filename if ext else f"{stem or default_stem}.bin"


def validate_file_type(filename: str, content: bytes) -> bool:
    """
    Fayl nomi va content asosida fayl turini tekshiradi.
    """
    normalized_filename = normalize_filename(filename)
    _, ext = os.path.splitext(normalized_filename.lower())

    if ext not in ALLOWED_FILE_SIGNATURES:
        return detect_extension_by_signature(content) is not None

    signatures = ALLOWED_FILE_SIGNATURES[ext]

    if signatures is None:
        return True

    for sig in signatures:
        if content[:len(sig)] == sig:
            return True

    return False


def get_allowed_extensions() -> list[str]:
    return list(ALLOWED_FILE_SIGNATURES.keys())
