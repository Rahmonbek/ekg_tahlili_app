"""Tibbiy fayllarni saqlash uchun yagona ildiz papka (T-099).

Muammo: bemorlarning tibbiy fayllari **loyiha manba papkasi ichida**
(`python_back/uploads/`, 113 MB) saqlanardi. Bu uchta jiddiy xavf tug'diradi:

1. **Deploy paytida yo'qolish.** `DEPLOY_LINUX.md` dagi yangilash buyrug'i
   `rsync -a --delete ... --exclude uploads` ko'rinishida. `--exclude uploads`
   unutilsa yoki xato yozilsa — barcha bemor fayllari o'chib ketadi.
   Bitta so'z xatosi butun arxivni yo'q qiladi.
2. **Zaxira nusxa chalkash.** "Kodni backup qilish" va "ma'lumotni backup
   qilish" ajratilmagan; baza dump'i olinadi, fayllar unutiladi.
3. **Masshtablash imkonsiz.** Ikkinchi server qo'shilsa fayllar faqat
   bittasida qoladi.

Yechim: yagona ildiz papka `STORAGE_ROOT` muhit o'zgaruvchisi orqali
beriladi va u **kod papkasidan tashqarida** bo'ladi
(masalan `/var/lib/nmed/storage`).

Orqaga moslik: `STORAGE_ROOT` berilmasa eski joy (`python_back/uploads`)
ishlatiladi, ya'ni mavjud o'rnatmalar buzilmaydi.
"""

import os
import uuid
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent

#: Saqlash ildizi. Ishlab chiqarishda albatta kod papkasidan tashqarida
#: bo'lishi kerak — `.env` da `STORAGE_ROOT=/var/lib/nmed/storage`.
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT") or (BASE_DIR / "uploads")).resolve()

#: Tahlil turi -> papka nomi. Bu nomlar bazadagi yo'llarda ham ishlatiladi.
FOLDERS = {
    "ecg": "ecg_analyse_files",
    "ecg_generated": "ecg_generated_files",
    "ecg_generated_short": "ecg_generated_short_files",
    "holter": "holter_analyse_files",
    "smad": "smad_analyse_files",
    "lab": "lab_analyse_files",
    "diagnose": "medical_diagnoses",
}


def storage_root() -> Path:
    """Saqlash ildizi (mavjud bo'lmasa yaratiladi)."""
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    return STORAGE_ROOT


def build_key(kind: str, original_name: str) -> str:
    """Fayl uchun saqlash kaliti yasaydi: `{tur}/{yyyy}/{MM}/{uuid}{kengaytma}`.

    Nima uchun sana bo'yicha papkalar: hozir barcha fayllar bitta papkada
    yotibdi (`ecg_analyse_files/`), bu esa minglab fayl to'planganda
    fayl tizimini sekinlashtiradi va eski fayllarni arxivlashni qiyinlashtiradi.

    Nima uchun UUID: asl fayl nomi bemor ismini o'z ichiga olishi va
    taxmin qilinishi mumkin (T-038, T-101).
    """
    folder = FOLDERS.get(kind, kind)
    ext = os.path.splitext(original_name or "")[1].lower()
    now = datetime.utcnow()
    return f"{folder}/{now:%Y}/{now:%m}/{uuid.uuid4().hex}{ext}"


def absolute_path(key: str) -> Path:
    """Saqlash kalitidan diskdagi to'liq yo'lni hisoblaydi.

    Kalit ildizdan tashqariga chiqa olmaydi — `..` bilan boshqa
    papkalarga o'tish urinishlari to'xtatiladi.
    """
    root = storage_root()
    path = (root / key.lstrip("/")).resolve()
    if not str(path).startswith(str(root)):
        raise ValueError(f"Saqlash ildizidan tashqaridagi yo'l: {key}")
    return path


def save(kind: str, original_name: str, content: bytes) -> str:
    """Faylni saqlaydi va bazaga yoziladigan nisbiy yo'lni qaytaradi.

    Qaytarilgan qiymat eski format bilan mos: `/uploads/{kalit}` —
    shuning uchun mavjud yozuvlar va `FileProxyController` ishlashda
    davom etadi.
    """
    key = build_key(kind, original_name)
    path = absolute_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return f"/uploads/{key}"


def resolve_existing(db_link: str) -> Path | None:
    """Bazadagi yo'ldan diskdagi faylni topadi.

    Eski yozuvlar (`/uploads/ecg_analyse_files/nom.jpg`) ham, yangilari
    (`/uploads/ecg_analyse_files/2026/08/uuid.jpg`) ham ishlaydi.
    """
    if not db_link:
        return None
    key = db_link.lstrip("/")
    if key.startswith("uploads/"):
        key = key[len("uploads/"):]
    try:
        path = absolute_path(key)
    except ValueError:
        return None
    return path if path.exists() else None
