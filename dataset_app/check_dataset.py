import os
from pathlib import Path

DATASET_DIR = Path("dataset")
SPLITS = ["train", "valid", "test"]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

def count_files(folder: Path, exts=None):
    if not folder.exists():
        return 0
    if exts is None:
        return len([p for p in folder.iterdir() if p.is_file()])
    return len([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in exts])

def check_split(split: str):
    images_dir = DATASET_DIR / split / "images"
    labels_dir = DATASET_DIR / split / "labels"

    print(f"\n--- {split.upper()} ---")

    if not images_dir.exists():
        print(f"❌ Images papka topilmadi: {images_dir}")
        return False

    if not labels_dir.exists():
        print(f"❌ Labels papka topilmadi: {labels_dir}")
        return False

    images = [p for p in images_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS]
    labels = [p for p in labels_dir.iterdir() if p.is_file() and p.suffix.lower() == ".txt"]

    print(f"Rasmlar soni: {len(images)}")
    print(f"Label txt soni: {len(labels)}")

    missing_labels = []
    for img in images:
        label_path = labels_dir / f"{img.stem}.txt"
        if not label_path.exists():
            missing_labels.append(img.name)

    if missing_labels:
        print(f"⚠️ Label yo‘q rasmlar soni: {len(missing_labels)}")
        print("Birinchi 10 tasi:")
        for name in missing_labels[:10]:
            print(" -", name)
    else:
        print("✅ Har bir rasmga mos label mavjud")

    class_counts = {0: 0, 1: 0, 2: 0, 3: 0}
    bad_lines = []

    for txt in labels:
        try:
            content = txt.read_text(encoding="utf-8").strip()
        except UnicodeDecodeError:
            content = txt.read_text(errors="ignore").strip()

        if not content:
            continue

        for line_no, line in enumerate(content.splitlines(), start=1):
            parts = line.strip().split()
            if len(parts) != 5:
                bad_lines.append((txt.name, line_no, line))
                continue

            try:
                cls = int(float(parts[0]))
                nums = [float(x) for x in parts[1:]]
            except ValueError:
                bad_lines.append((txt.name, line_no, line))
                continue

            if cls in class_counts:
                class_counts[cls] += 1
            else:
                bad_lines.append((txt.name, line_no, line))

            if any(x < 0 or x > 1 for x in nums):
                bad_lines.append((txt.name, line_no, line))

    print("Classlar bo‘yicha tuxumlar:")
    print("  0 ascaris:", class_counts[0])
    print("  1 trichuris:", class_counts[1])
    print("  2 hookworm:", class_counts[2])
    print("  3 schistosoma:", class_counts[3])

    if bad_lines:
        print(f"⚠️ Xato label qatorlari: {len(bad_lines)}")
        for item in bad_lines[:10]:
            print(" -", item)
    else:
        print("✅ Label formatlari to‘g‘ri ko‘rinadi")

    return True

def main():
    print("NMED dataset tekshiruv boshlandi...")
    if not DATASET_DIR.exists():
        print("❌ dataset papkasi topilmadi.")
        print("dataset/train/images, dataset/train/labels kabi papkalarni yarating.")
        return

    ok = True
    for split in SPLITS:
        ok = check_split(split) and ok

    print("\nTUGADI")
    if ok:
        print("✅ Dataset training uchun tayyor ko‘rinadi.")
    else:
        print("❌ Dataset papkalarida muammo bor.")

if __name__ == "__main__":
    main()
