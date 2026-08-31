"""Mavjud "generatsiya qilingan" EKG rasmlarini siqadi (T-047 / T-039).

Nima uchun kerak: rasm sifatida yuklangan EKG uchun `jpg_bytes_to_png_bytes`
faylni o'lchamini o'zgartirmasdan PNG ga o'girardi. PNG yo'qotishsiz format
bo'lgani uchun telefonda olingan 4.2 MB JPG (4032x3024) **13-14 MB PNG** ga
aylanardi. Bu:

  * PDF hisobotni 13.5 MB qilardi — shifokor mobil internetda ochа olmasdi
    va elektron pochta orqali yuborib bo'lmasdi;
  * diskda har bir tahlil uchun o'nlab megabaytni behuda egallardi.

Kod tuzatildi (`prepare_display_image`), lekin u faqat YANGI tahlillarga
ta'sir qiladi. Bu skript bazadagi mavjud fayllarni ham siqadi.

Asl yuklangan fayl (`analyse_file_link`) **tegilmaydi** — u arxiv sifatida
o'zgarishsiz qoladi. Faqat ko'rsatish uchun ishlatiladigan
`generated_file_link` qayta siqiladi.

Ishlatish:
    python compress_existing_images.py            # faqat ko'rsatadi
    python compress_existing_images.py --apply    # fayllarni almashtiradi
"""

import io
import os
import sys

from PIL import Image

import storage

APPLY = "--apply" in sys.argv

#: `main.py` bilan bir xil chegaralar
MAX_WIDTH = 2000
QUALITY = 85

#: Shu hajmdan kichik fayllarga tegmaymiz — foydasi yo'q
MIN_SIZE_BYTES = 1_500_000


def compress(path):
    """Bitta faylni siqadi. (avvalgi_hajm, yangi_hajm) qaytaradi."""
    before = os.path.getsize(path)

    with open(path, "rb") as fh:
        data = fh.read()

    img = Image.open(io.BytesIO(data))
    if img.mode != "RGB":
        img = img.convert("RGB")

    width, height = img.size
    if width > MAX_WIDTH:
        img = img.resize((MAX_WIDTH, int(height * MAX_WIDTH / width)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=QUALITY, optimize=True)
    result = buf.getvalue()

    # Siqilgan variant kattaroq chiqsa — tegmaymiz
    if len(result) >= before:
        return before, before

    if APPLY:
        # Kengaytma `.png` bo'lsa ham mazmuni JPEG bo'ladi: brauzer va
        # iTextSharp faylni sehrli baytlari bo'yicha taniydi, bazadagi
        # yo'lni o'zgartirish shart emas.
        with open(path, "wb") as fh:
            fh.write(result)

    return before, len(result)


def main():
    root = storage.storage_root()
    targets = []

    for folder in ("ecg_generated_files", "ecg_generated_short_files"):
        base = root / folder
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in (".png", ".jpg", ".jpeg"):
                continue
            if path.stat().st_size < MIN_SIZE_BYTES:
                continue
            targets.append(path)

    if not targets:
        print("Siqish kerak bo'lgan fayl topilmadi.")
        return

    total_before = total_after = 0
    for path in sorted(targets):
        try:
            before, after = compress(path)
        except Exception as exc:
            print(f"  XATO  {path.name}: {exc}")
            continue

        total_before += before
        total_after += after
        if after < before:
            print(f"  {path.name:28s} {before/1048576:7.2f} MB -> {after/1048576:6.2f} MB")

    print(f"\n  JAMI: {total_before/1048576:.1f} MB -> {total_after/1048576:.1f} MB"
          f"  ({total_before/max(total_after, 1):.1f} barobar)")
    if not APPLY:
        print("  (fayllar o'zgartirilmadi — `--apply` bilan ishga tushiring)")


if __name__ == "__main__":
    main()
