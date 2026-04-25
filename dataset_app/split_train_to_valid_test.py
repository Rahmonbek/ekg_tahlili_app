import random
import shutil
from pathlib import Path

DATASET = Path("dataset")
TRAIN_RATIO = 0.8
VALID_RATIO = 0.1
TEST_RATIO = 0.1

random.seed(42)

train_images = DATASET / "train" / "images"
train_labels = DATASET / "train" / "labels"

all_images = list(train_images.glob("*.*"))
random.shuffle(all_images)

total = len(all_images)
valid_count = int(total * VALID_RATIO)
test_count = int(total * TEST_RATIO)

valid_images = all_images[:valid_count]
test_images = all_images[valid_count:valid_count + test_count]

def move_files(images, split):
    img_dst = DATASET / split / "images"
    lbl_dst = DATASET / split / "labels"

    img_dst.mkdir(parents=True, exist_ok=True)
    lbl_dst.mkdir(parents=True, exist_ok=True)

    for img in images:
        label = train_labels / f"{img.stem}.txt"

        shutil.move(str(img), str(img_dst / img.name))

        if label.exists():
            shutil.move(str(label), str(lbl_dst / label.name))
        else:
            print("Label topilmadi:", label)

move_files(valid_images, "valid")
move_files(test_images, "test")

print("✅ Bo‘lish tugadi")
print("Valid:", len(valid_images))
print("Test:", len(test_images))
print("Train qoldi:", len(list(train_images.glob('*.*'))))