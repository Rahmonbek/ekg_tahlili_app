import json
import shutil
from pathlib import Path

# Paths
BASE_DIR = Path("chula-parasite-dataset/Chula-ParasiteEgg-11")
IMAGES_DIR = BASE_DIR / "data"
JSON_PATH = BASE_DIR / "labels.json"

TARGET_DIR = Path("dataset/train")

TARGET_IMAGES = TARGET_DIR / "images"
TARGET_LABELS = TARGET_DIR / "labels"

TARGET_IMAGES.mkdir(parents=True, exist_ok=True)
TARGET_LABELS.mkdir(parents=True, exist_ok=True)

# Load JSON
with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# Map: COCO category id → YOLO class
CLASS_MAP = {}

for cat in data["categories"]:
    cid = cat["id"]
    name = cat["name"].lower()

    if "ascaris" in name:
        CLASS_MAP[cid] = 0
    elif "trichuris" in name:
        CLASS_MAP[cid] = 1
    elif "hookworm" in name:
        CLASS_MAP[cid] = 2
    elif "schistosoma" in name:
        CLASS_MAP[cid] = 3
    elif "taenia" in name:
        CLASS_MAP[cid] = 4
    else:
        # boshqa classlarni tashlab yuboramiz
        continue

# Image info
images = {img["id"]: img for img in data["images"]}

# Annotations
ann_by_image = {}

for ann in data["annotations"]:
    img_id = ann["image_id"]
    cat_id = ann["category_id"]

    if cat_id not in CLASS_MAP:
        continue

    ann_by_image.setdefault(img_id, []).append(ann)

count = 0

for img_id, anns in ann_by_image.items():
    img_info = images[img_id]

    file_name = img_info["file_name"]
    width = img_info["width"]
    height = img_info["height"]

    src_img = IMAGES_DIR / file_name

    if not src_img.exists():
        continue

    new_name = f"chula_{count}.jpg"

    shutil.copy2(src_img, TARGET_IMAGES / new_name)

    label_lines = []

    for ann in anns:
        cat_id = ann["category_id"]
        yolo_class = CLASS_MAP[cat_id]

        x, y, w, h = ann["bbox"]

        # COCO → YOLO
        x_center = (x + w / 2) / width
        y_center = (y + h / 2) / height
        w /= width
        h /= height

        label_lines.append(f"{yolo_class} {x_center} {y_center} {w} {h}")

    (TARGET_LABELS / f"{Path(new_name).stem}.txt").write_text(
        "\n".join(label_lines), encoding="utf-8"
    )

    count += 1

print(f"✅ Chula dataset qo‘shildi: {count} ta rasm")