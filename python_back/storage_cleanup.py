"""Saqlash joyini hisobga oladi va yetim fayllarni topadi (T-102).

Nima uchun kerak
----------------
Yuklangan fayllar abadiy saqlanadi va hech qanday hisob yuritilmaydi.
Auditda `uploads` papkasi 113 MB edi — bu atigi bir nechta test
klinikasidan. Real hisob: kuniga 50 ta tahlil qiladigan klinika oyiga
o'nlab gigabayt yig'adi.

Ikkinchi muammo — **yetim fayllar**: diskda bor, lekin bazadagi hech bir
yozuv ularga ishora qilmaydi. Ular quyidagi hollarda paydo bo'ladi:

* tahlil yaratilayotganda tranzaksiya xatolik bilan tugaydi — fayl
  allaqachon yozilgan, yozuv esa yo'q;
* fayl almashtiriladi (`replace-file`) — eskisi diskda qoladi;
* yozuv bazadan butunlay o'chiriladi.

Bunday fayllar joy egallaydi va — muhimrog'i — **bemor ma'lumoti
bo'lgani holda hech kimga tegishli emas**: ularni topish, kimga
tegishliligini aniqlash yoki "unutilish huquqi" bo'yicha o'chirish
imkoni yo'q.

Xavfsizlik
----------
Skript hech narsani **o'chirmaydi**. Yetim fayllar `_trash/` papkasiga
ko'chiriladi va u yerda sana bo'yicha saqlanadi. Haqiqiy o'chirish —
alohida buyruq va alohida qaror.

Ishlatish::

    python storage_cleanup.py                    # hisobot
    python storage_cleanup.py --move-orphans     # yetimlarni _trash ga
    python storage_cleanup.py --purge-trash 30   # 30 kundan eski trash
"""

import os
import shutil
import sys
import time
from collections import defaultdict

from sqlalchemy import text

import storage
from database import engine

#: Bazada fayl havolasi saqlanadigan barcha (jadval, ustun) juftliklari.
#: Yangi ustun qo'shilsa uni SHU YERGA qo'shish shart — aks holda
#: fayllar yetim deb hisoblanib, `_trash` ga ko'chib ketadi.
LINK_COLUMNS = [
    ("ecg_analyses", "analyse_file_link"),
    ("ecg_analyses", "generated_file_link"),
    ("ecg_analyses", "generated_short_file_link"),
    ("lab_analyses", "analyse_file_link"),
    ("holter_analyses", "analyse_file_link"),
    ("smad_analyses", "analyse_file_link"),
    ("medical_diagnoses", "diagnose_file_link"),
]

TRASH_DIR = "_trash"


def referenced_paths() -> set:
    """Bazada ishora qilinayotgan barcha fayllarning absolyut yo'llari."""
    paths = set()
    with engine.connect() as conn:
        for table, column in LINK_COLUMNS:
            try:
                rows = conn.execute(text(
                    f"SELECT {column} FROM {table} "
                    f"WHERE {column} IS NOT NULL AND {column} <> ''"))
            except Exception as exc:  # noqa: BLE001
                print(f"  OGOHLANTIRISH  {table}.{column}: {exc}")
                continue

            for (link,) in rows:
                resolved = storage.resolve_existing(link)
                if resolved is not None:
                    paths.add(os.path.normcase(str(resolved)))
    return paths


def scan_disk(root):
    """Diskdagi barcha fayllar: (yo'l, hajm, oxirgi o'zgarish vaqti)."""
    for dirpath, dirnames, filenames in os.walk(root):
        # `_trash` allaqachon ko'chirilganlar — qayta ko'rib chiqilmaydi
        dirnames[:] = [d for d in dirnames if d != TRASH_DIR]
        for filename in filenames:
            full = os.path.join(dirpath, filename)
            try:
                stat = os.stat(full)
            except OSError:
                continue
            yield full, stat.st_size, stat.st_mtime


def human(size_bytes: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size_bytes < 1024 or unit == "GB":
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} GB"


def report(root, referenced):
    by_folder = defaultdict(lambda: [0, 0])   # papka -> [soni, hajmi]
    orphans = []
    total_size = total_count = 0

    for path, size, _mtime in scan_disk(root):
        total_count += 1
        total_size += size

        folder = os.path.relpath(os.path.dirname(path), root).split(os.sep)[0]
        by_folder[folder][0] += 1
        by_folder[folder][1] += size

        if os.path.normcase(path) not in referenced:
            orphans.append((path, size))

    print("  Papkalar bo'yicha:")
    for folder, (count, size) in sorted(by_folder.items(), key=lambda x: -x[1][1]):
        print(f"    {folder:32} {count:5} ta  {human(size):>10}")

    print(f"\n  JAMI: {total_count} ta fayl, {human(total_size)}")

    orphan_size = sum(size for _, size in orphans)
    print(f"  Yetim fayllar: {len(orphans)} ta, {human(orphan_size)}"
          f"  ({orphan_size / total_size * 100:.1f}%)" if total_size else "")

    return orphans


def move_orphans(root, orphans):
    trash_root = os.path.join(root, TRASH_DIR, time.strftime("%Y-%m-%d"))
    os.makedirs(trash_root, exist_ok=True)

    moved = 0
    for path, _size in orphans:
        target = os.path.join(trash_root, os.path.basename(path))
        # Bir xil nomli fayllar bo'lishi mumkin
        counter = 1
        while os.path.exists(target):
            stem, ext = os.path.splitext(os.path.basename(path))
            target = os.path.join(trash_root, f"{stem}_{counter}{ext}")
            counter += 1
        try:
            shutil.move(path, target)
            moved += 1
        except OSError as exc:
            print(f"  XATO  {path}: {exc}")

    print(f"\n  {moved} ta fayl `{TRASH_DIR}/{time.strftime('%Y-%m-%d')}` ga ko'chirildi")


def purge_trash(root, older_than_days):
    trash_root = os.path.join(root, TRASH_DIR)
    if not os.path.isdir(trash_root):
        print("  `_trash` papkasi yo'q")
        return

    cutoff = time.time() - older_than_days * 86400
    removed = removed_size = 0

    for dirpath, _dirnames, filenames in os.walk(trash_root):
        for filename in filenames:
            full = os.path.join(dirpath, filename)
            try:
                stat = os.stat(full)
                if stat.st_mtime >= cutoff:
                    continue
                removed_size += stat.st_size
                os.remove(full)
                removed += 1
            except OSError:
                continue

    print(f"  {removed} ta fayl butunlay o'chirildi ({human(removed_size)})")


def main():
    root = str(storage.storage_root())
    print(f"  Saqlash ildizi: {root}\n")

    if "--purge-trash" in sys.argv:
        index = sys.argv.index("--purge-trash")
        days = int(sys.argv[index + 1]) if len(sys.argv) > index + 1 else 30
        purge_trash(root, days)
        return

    referenced = referenced_paths()
    print(f"  Bazada ishora qilingan fayllar: {len(referenced)} ta\n")

    orphans = report(root, referenced)

    if "--move-orphans" in sys.argv:
        move_orphans(root, orphans)
    elif orphans:
        print("\n  (`--move-orphans` bilan ular `_trash` ga ko'chiriladi)")


if __name__ == "__main__":
    main()
