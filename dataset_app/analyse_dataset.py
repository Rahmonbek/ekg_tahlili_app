import os
from collections import Counter

labels_path = "dataset/train/labels"

counter = Counter()

for file in os.listdir(labels_path):
    if file.endswith(".txt"):
        with open(os.path.join(labels_path, file)) as f:
            for line in f:
                cls = int(line.split()[0])
                counter[cls] += 1

print("Class distribution:")
for k, v in counter.items():
    print(f"class {k}: {v}")