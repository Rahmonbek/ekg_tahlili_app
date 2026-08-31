"""Frontend rasmlarini ko'rsatiladigan o'lchamga keltiradi (T-048).

Muammo: `src/images` papkasi 6.1 MB. Eng yomon nisbatlar:

    avatars/male.jpg     1280 x 1280   ekranda 45 x 45
    logo.png              469 x 429    ekranda  60 x 55

Ya'ni 45 pikselli avatar uchun 1280 pikselli rasm yuklanadi. Mobil
internetda bu sezilarli kechikish, va u har bir sahifa ochilishida
takrorlanadi.

Skript **faqat ishlatiladigan** rasmlarni qayta o'lchaydi. Ishlatilmagan
fayllarga tegmaydi: ular CRA to'plamiga tushmaydi (import qilinmagan),
ya'ni brauzerga yetib bormaydi — ularni o'chirish alohida qaror.

Retina ekranlar uchun maqsad o'lcham ko'rsatiladigan o'lchamdan ikki
barobar olinadi.

Ishlatish::

    python optimize_images.py            # faqat ko'rsatadi
    python optimize_images.py --apply
"""

import os
import sys

from PIL import Image

APPLY = "--apply" in sys.argv

#: fayl -> (maqsad eni, JPEG sifati)
#: Maqsad = ekranda ko'rinadigan en x 2 (retina uchun).
TARGETS = {
    "src/images/avatars/male.jpg": (128, 82),
    "src/images/avatars/female.jpg": (128, 82),
    "src/images/logo.png": (160, None),          # PNG — shaffoflik saqlanadi
    # Bular fotosurat va PNG sifatida saqlangan — shaffoflik kerak emas.
    # JPEG ga o'tkazish hajmni bir necha barobar kamaytiradi, shuning
    # uchun ular alohida ro'yxatda (kengaytma ham o'zgaradi).
    "src/images/langs/ru.jpg": (64, 85),
}


def optimize(path, target_width, quality):
    before = os.path.getsize(path)
    img = Image.open(path)
    width, height = img.size

    if width > target_width:
        new_height = int(height * target_width / width)
        img = img.resize((target_width, new_height), Image.LANCZOS)

    if APPLY:
        if quality is not None:
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.save(path, format="JPEG", quality=quality, optimize=True)
        else:
            # PNG: shaffoflik kerak bo'lishi mumkin, formatni o'zgartirmaymiz
            img.save(path, format="PNG", optimize=True)

    after = os.path.getsize(path) if APPLY else before
    return (width, height), img.size, before, after


#: PNG dan JPEG ga o'tkaziladigan fotosuratlar: (eski yo'l, yangi yo'l, en, sifat)
CONVERT = [
    ("src/images/login1.png", "src/images/login1.jpg", 900, 82),
    ("src/images/register1.png", "src/images/register1.jpg", 900, 82),
]


def convert(src, dst, target_width, quality):
    before = os.path.getsize(src)
    img = Image.open(src)
    width, height = img.size

    if width > target_width:
        img = img.resize((target_width, int(height * target_width / width)), Image.LANCZOS)
    if img.mode != "RGB":
        img = img.convert("RGB")

    if APPLY:
        img.save(dst, format="JPEG", quality=quality, optimize=True)
        os.remove(src)

    after = os.path.getsize(dst) if APPLY else before
    return (width, height), img.size, before, after


def main():
    total_before = total_after = 0

    for path, (target_width, quality) in TARGETS.items():
        if not os.path.exists(path):
            print(f"  YO'Q  {path}")
            continue

        old_size, new_size, before, after = optimize(path, target_width, quality)
        total_before += before
        total_after += after

        print(f"  {os.path.basename(path):18} "
              f"{old_size[0]}x{old_size[1]} -> {new_size[0]}x{new_size[1]}   "
              f"{before / 1024:7.1f} KB -> {after / 1024:6.1f} KB")

    for src, dst, target_width, quality in CONVERT:
        if not os.path.exists(src):
            print(f"  O'TKAZILGAN  {os.path.basename(src)}")
            continue
        old_size, new_size, before, after = convert(src, dst, target_width, quality)
        total_before += before
        total_after += after
        print(f"  {os.path.basename(src):18} "
              f"{old_size[0]}x{old_size[1]} -> {new_size[0]}x{new_size[1]}   "
              f"{before / 1024:7.1f} KB -> {after / 1024:6.1f} KB  (PNG -> JPEG)")

    print(f"\n  JAMI: {total_before / 1024:.0f} KB -> {total_after / 1024:.0f} KB")
    if not APPLY:
        print("  (fayllar o'zgartirilmadi — `--apply` bilan ishga tushiring)")


if __name__ == "__main__":
    main()
