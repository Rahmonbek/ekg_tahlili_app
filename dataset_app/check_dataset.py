from pathlib import Path

DATASET_DIR = Path("balanced_dataset")
SPLITS = ["train", "valid", "test"]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

CLASS_NAMES = {
    0: "ascaris",
    1: "trichuris",
    2: "hookworm",
    3: "schistosoma",
    4: "taenia",
    5: "enterobius",
    6: "fasciolopsis",
    7: "hymenolepis_nana",
    8: "hymenolepis_diminuta",
    9: "capillaria",
    10: "opisthorchis",
    11: "paragonimus",
}


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

    images = [
        p for p in images_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    ]

    labels = [
        p for p in labels_dir.iterdir()
        if p.is_file() and p.suffix.lower() == ".txt"
    ]

    print(f"Rasmlar soni: {len(images)}")
    print(f"Label txt soni: {len(labels)}")

    missing_labels = []
    for img in images:
        label_path = labels_dir / f"{img.stem}.txt"
        if not label_path.exists():
            missing_labels.append(img.name)

    if missing_labels:
        print(f"⚠️ Label yo‘q rasmlar soni: {len(missing_labels)}")
        for name in missing_labels[:10]:
            print(" -", name)
    else:
        print("✅ Har bir rasmga mos label mavjud")

    class_counts = {class_id: 0 for class_id in CLASS_NAMES}
    bad_lines = []

    empty_labels = 0

    for txt in labels:
        try:
            content = txt.read_text(encoding="utf-8").strip()
        except UnicodeDecodeError:
            content = txt.read_text(errors="ignore").strip()

        if not content:
            empty_labels += 1
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

            if cls not in CLASS_NAMES:
                bad_lines.append((txt.name, line_no, line))
                continue

            if any(x < 0 or x > 1 for x in nums):
                bad_lines.append((txt.name, line_no, line))
                continue

            class_counts[cls] += 1

    print("\nClasslar bo‘yicha obyektlar:")
    for class_id, name in CLASS_NAMES.items():
        print(f"  {class_id:2d} {name}: {class_counts[class_id]}")

    if empty_labels:
        print(f"\nℹ️ Bo‘sh label fayllar: {empty_labels}")

    if bad_lines:
        print(f"\n⚠️ Xato label qatorlari: {len(bad_lines)}")
        for item in bad_lines[:10]:
            print(" -", item)
        return False
    else:
        print("\n✅ Label formatlari to‘g‘ri ko‘rinadi")

    return True


def main():
    print("NMED dataset tekshiruv boshlandi...")

    if not DATASET_DIR.exists():
        print("❌ dataset papkasi topilmadi.")
        return

    ok = True

    for split in SPLITS:
        ok = check_split(split) and ok

    print("\nTUGADI")

    if ok:
        print("✅ Dataset training uchun tayyor ko‘rinadi.")
    else:
        print("❌ Datasetda muammo bor.")


if __name__ == "__main__":
    main()