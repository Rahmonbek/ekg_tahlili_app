from pathlib import Path

folders = [
    "dataset/train/images",
    "dataset/train/labels",
    "dataset/valid/images",
    "dataset/valid/labels",
    "dataset/test/images",
    "dataset/test/labels",
]

for folder in folders:
    Path(folder).mkdir(parents=True, exist_ok=True)
    print("Created:", folder)

print("\n✅ Papkalar yaratildi.")
