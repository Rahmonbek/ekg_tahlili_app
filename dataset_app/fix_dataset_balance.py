import random
import shutil
from pathlib import Path

SOURCE = Path("dataset")
TARGET = Path("balanced_dataset")

SPLITS = ["train", "valid", "test"]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Ascaris juda ko‘p bo‘lgani uchun limit
MAX_ASCARIS_IMAGES_PER_SPLIT = {
    "train": 2000,
    "valid": 300,
    "test": 300,
}

random.seed(42)


def read_classes(label_path: Path):
    if not label_path.exists():
        return []

    text = label_path.read_text(encoding="utf-8", errors="ignore").strip()
    if not text:
        return []

    classes = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) != 5:
            continue
        classes.append(int(float(parts[0])))

    return classes


def copy_pair(img_path: Path, label_path: Path, split: str):
    img_target = TARGET / split / "images"
    lbl_target = TARGET / split / "labels"

    img_target.mkdir(parents=True, exist_ok=True)
    lbl_target.mkdir(parents=True, exist_ok=True)

    shutil.copy2(img_path, img_target / img_path.name)
    shutil.copy2(label_path, lbl_target / label_path.name)


def process_split(split: str):
    images_dir = SOURCE / split / "images"
    labels_dir = SOURCE / split / "labels"

    images = [
        p for p in images_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    ]

    ascaris_only = []
    other_images = []

    skipped_empty = 0

    for img in images:
        label = labels_dir / f"{img.stem}.txt"
        classes = read_classes(label)

        if not classes:
            skipped_empty += 1
            continue

        # faqat Ascaris bo‘lgan rasmlar
        if set(classes) == {0}:
            ascaris_only.append((img, label))
        else:
            other_images.append((img, label))

    random.shuffle(ascaris_only)

    max_ascaris = MAX_ASCARIS_IMAGES_PER_SPLIT[split]
    selected_ascaris = ascaris_only[:max_ascaris]

    selected = selected_ascaris + other_images
    random.shuffle(selected)

    for img, label in selected:
        copy_pair(img, label, split)

    print(f"\n--- {split.upper()} ---")
    print(f"Ascaris-only asl soni: {len(ascaris_only)}")
    print(f"Ascaris-only qoldirildi: {len(selected_ascaris)}")
    print(f"Boshqa classli rasmlar: {len(other_images)}")
    print(f"Bo‘sh label olib tashlandi: {skipped_empty}")
    print(f"Jami ko‘chirildi: {len(selected)}")


def main():
    if TARGET.exists():
        print("❌ balanced_dataset allaqachon mavjud.")
        print("Uni o‘chirib qayta ishga tushiring yoki nomini o‘zgartiring.")
        return

    for split in SPLITS:
        process_split(split)

    print("\n✅ Tayyor: balanced_dataset yaratildi")
    print("Endi data.yaml ichida path ni balanced_dataset ga o‘zgartiring.")


if __name__ == "__main__":
    main()