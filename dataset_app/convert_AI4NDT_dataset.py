import os
import shutil
from pathlib import Path

source_dir = "AI4NTD KK2.0 P3.0 STH & SCHm Dataset"   # BU YERGA SENING DATASET PAPKA NOMINI YOZ
target_images = Path("dataset/train/images")
target_labels = Path("dataset/train/labels")

target_images.mkdir(parents=True, exist_ok=True)
target_labels.mkdir(parents=True, exist_ok=True)

count = 0

for root, dirs, files in os.walk(source_dir):
    if "images" in root:
        for file in files:
            if file.endswith((".jpg", ".png")):
                src_img = os.path.join(root, file)
                label_file = file.replace(".jpg", ".txt").replace(".png", ".txt")

                src_label = os.path.join(root.replace("images", "labels"), label_file)

                if os.path.exists(src_label):
                    new_name = f"{count}.jpg"
                    
                    shutil.copy(src_img, target_images / new_name)
                    shutil.copy(src_label, target_labels / f"{count}.txt")

                    count += 1

print(f"Tugadi: {count} ta rasm ko‘chirildi")