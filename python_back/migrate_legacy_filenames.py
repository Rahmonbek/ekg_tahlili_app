"""Eski fayl nomlarini UUID ga o'tkazadi (T-101).

Muammo
------
Yuklangan faylning asl nomi diskdagi nom sifatida ishlatilardi va bazadagi
yo'lga tushardi. Bazadagi haqiqiy misollar::

    /uploads/smad_analyse_files/битураев_б_смад.pdf
    /uploads/lab_analyse_files/поверхностный_антиген_вируса_гепатита_в,_hbsag.pdf

Birinchisi bemorning familiyasini, ikkinchisi qanday tahlil topshirilganini
(gepatit B) yo'lning o'zida oshkor qiladi. Bunday yo'l server jurnaliga,
brauzer tarixiga, proksi keshiga tushadi va "havolani nusxalash" orqali
tarqaladi — fayl mazmuni himoyalangan bo'lsa ham.

Ikkinchi muammo — taxmin qilinadigan nomlar (`ecg_92.png`, `ecg_95.png`):
autentifikatsiya talab qilinsa ham, nomni taxmin qilish oson.

Yangi yuklashlar `storage.build_key()` orqali allaqachon UUID oladi
(T-099). Bu skript bazadagi ESKI yozuvlarni ham o'tkazadi.

Nima qiladi
-----------
Har bir eski havola uchun:

1. Diskdagi faylni yangi kalitga ko'chiradi (`{tur}/{yyyy}/{MM}/{uuid}{kengaytma}`);
2. bazadagi havolani yangilaydi;
3. asl nomni `original_filename` ustuniga yozadi — foydalanuvchi faylni
   yuklab olganda unga o'sha nom bilan beriladi, ya'ni qulaylik yo'qolmaydi.

Bir xil faylga bir nechta ustun ishora qilishi mumkin (masalan EKG da
`analyse_file_link` va `generated_file_link` bitta faylga) — shuning uchun
ko'chirilgan fayllar hisobi yuritiladi va ikkinchi marta ko'chirilmaydi.

Diskda topilmagan fayl uchun havola **o'zgartirilmaydi**: yozuvni buzib
qo'ymaslik uchun. Bunday holatlar oxirida sanab ko'rsatiladi.

Ishlatish::

    python migrate_legacy_filenames.py            # faqat ko'rsatadi
    python migrate_legacy_filenames.py --apply    # bajaradi
"""

import re
import shutil
import sys

from sqlalchemy import text

import storage
from database import engine

APPLY = "--apply" in sys.argv

#: Yangi format: `.../2026/08/<32 ta o'n oltilik belgi>.<kengaytma>`
NEW_FORMAT = re.compile(r"/\d{4}/\d{2}/[0-9a-f]{32}\.[A-Za-z0-9]+$")

#: (jadval, havola ustuni, saqlash turi, asl nom ustuniga yozilsinmi)
#:
#: `generated_*` — bu bizning o'zimiz yaratgan fayllar, ularning "asl nomi"
#: yo'q, shuning uchun `original_filename` ga yozilmaydi.
TARGETS = [
    ("ecg_analyses", "analyse_file_link", "ecg_analyse", True),
    ("ecg_analyses", "generated_file_link", "ecg_generated", False),
    ("ecg_analyses", "generated_short_file_link", "ecg_generated_short", False),
    ("lab_analyses", "analyse_file_link", "lab_analyse", True),
    ("holter_analyses", "analyse_file_link", "holter_analyse", True),
    ("smad_analyses", "analyse_file_link", "smad_analyse", True),
    ("medical_diagnoses", "diagnose_file_link", "diagnose", True),
]


def main():
    moved = {}      # eski havola -> yangi havola (takroriy ko'chirishni oldini olish)
    missing = []
    stats = {"moved": 0, "already": 0, "missing": 0}

    # `connect()` — `begin()` emas: quruq rejimda hech qanday yozuv
    # bajarilmaydi, shuning uchun tranzaksiyani ochiq qoldirish shart emas.
    with engine.connect() as conn:
        for table, column, kind, keep_name in TARGETS:
            rows = conn.execute(
                text(f"SELECT id, {column} FROM {table} "
                     f"WHERE {column} IS NOT NULL AND {column} <> ''")
            ).fetchall()

            for row_id, link in rows:
                if NEW_FORMAT.search(link):
                    stats["already"] += 1
                    continue

                original = link.rsplit("/", 1)[-1]

                if link in moved:
                    new_link = moved[link]
                else:
                    source = storage.resolve_existing(link)
                    if source is None or not source.exists():
                        stats["missing"] += 1
                        missing.append(f"{table}#{row_id}: {link}")
                        continue

                    key = storage.build_key(kind, original)
                    target = storage.absolute_path(key)
                    new_link = "/uploads/" + key

                    if APPLY:
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(source), str(target))
                    moved[link] = new_link

                params = {"link": new_link, "id": row_id}
                sets = f"{column} = :link"
                if keep_name:
                    sets += ", original_filename = COALESCE(original_filename, :orig)"
                    params["orig"] = original[:255]

                if APPLY:
                    conn.execute(
                        text(f"UPDATE {table} SET {sets} WHERE id = :id"), params
                    )

                stats["moved"] += 1
                print(f"  {table}#{row_id}: {original}  ->  {new_link.rsplit('/', 1)[-1]}")

        if APPLY:
            conn.commit()

    print("\n  O'tkazildi: {} | allaqachon yangi: {} | diskda topilmadi: {}"
          .format(stats["moved"], stats["already"], stats["missing"]))

    if missing:
        print("\n  Diskda topilmagan (havola o'zgartirilmadi):")
        for m in missing:
            print("   ", m)

    if not APPLY:
        print("\n  (hech narsa o'zgartirilmadi — `--apply` bilan ishga tushiring)")


if __name__ == "__main__":
    main()
