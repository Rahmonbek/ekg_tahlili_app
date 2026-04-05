"""
NMED — Fayl turi tekshiruvi moduli.
Faqat kengaytmaga emas, haqiqiy fayl content (magic bytes) ga qarab tekshiradi.
"""
import io

# Ruxsat etilgan fayl turlari va ularning magic bytes (imzo) lari
ALLOWED_FILE_SIGNATURES = {
    # Rasmlar
    '.png': [b'\x89PNG\r\n\x1a\n'],
    '.jpg': [b'\xff\xd8\xff'],
    '.jpeg': [b'\xff\xd8\xff'],
    # PDF
    '.pdf': [b'%PDF'],
    # XML (HL7 EKG)
    '.xml': [b'<?xml', b'\xef\xbb\xbf<?xml'],  # UTF-8 BOM bilan ham
    # Matnli fayllar (CSV, TXT, TSV) — maxsus imzo yo'q, shuning uchun tekshirmaymiz
    '.csv': None,
    '.txt': None,
    '.tsv': None,
}


def validate_file_type(filename: str, content: bytes) -> bool:
    """
    Fayl nomi va content asosida fayl turini tekshiradi.
    
    Args:
        filename: Fayl nomi (kengaytma bilan)
        content: Fayl content baytlari
    
    Returns:
        True agar fayl ruxsat etilgan turda bo'lsa, False aks holda
    """
    import os
    _, ext = os.path.splitext(filename.lower())
    
    if ext not in ALLOWED_FILE_SIGNATURES:
        return False
    
    signatures = ALLOWED_FILE_SIGNATURES[ext]
    
    # Matnli fayllar uchun magic bytes tekshiruvi yo'q
    if signatures is None:
        return True
    
    # Magic bytes tekshiruvi
    for sig in signatures:
        if content[:len(sig)] == sig:
            return True
    
    return False


def get_allowed_extensions() -> list[str]:
    """Ruxsat etilgan fayl kengaytmalarini qaytaradi."""
    return list(ALLOWED_FILE_SIGNATURES.keys())
