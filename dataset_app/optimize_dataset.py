import os
import imagehash
from PIL import Image
import random
from collections import defaultdict

# SOZLAMALAR
DATASET_PATH = 'dataset' # Dataset papkangiz nomi
TARGET_ASCARIS_COUNT = 3000       # Ascaris rasmlarini nechtagacha kamaytirish kerak?
ASCARIS_CLASS_ID = '0'            # Ascaris klass ID raqami (sizda 0 edi)

def clean_and_balance(subset):
    print(f"\n--- {subset.upper()} qismini tozalash boshlandi ---")
    img_dir = os.path.join(DATASET_PATH, subset, 'images')
    lbl_dir = os.path.join(DATASET_PATH, subset, 'labels')
    
    if not os.path.exists(img_dir): return

    # 1. Bo'sh labellarni va rasmlarni o'chirish
    files = os.listdir(lbl_dir)
    for lbl_file in files:
        lbl_path = os.path.join(lbl_dir, lbl_file)
        img_file = lbl_file.replace('.txt', '.jpg') # Agar rasm .png bo'lsa o'zgartiring
        img_path = os.path.join(img_dir, img_file)
        
        if os.path.getsize(lbl_path) == 0:
            if os.path.exists(img_path): os.remove(img_path)
            os.remove(lbl_path)
            # print(f"O'chirildi (bo'sh): {lbl_file}")

    # 2. O'xshash rasmlarni aniqlash va Ascarisni filtrlash
    hashes = {}
    ascaris_only_files = []
    other_species_files = []
    
    img_files = os.listdir(img_dir)
    for img_f in img_files:
        img_path = os.path.join(img_dir, img_f)
        lbl_path = os.path.join(lbl_dir, img_f.replace('.jpg', '.txt'))
        
        if not os.path.exists(lbl_path): continue

        # Klasslarni tekshirish
        with open(lbl_path, 'r') as f:
            lines = f.readlines()
            classes = set([line.split()[0] for line in lines])
        
        # Faqat ascaris bo'lgan rasmlarni ajratib olish
        if classes == {ASCARIS_CLASS_ID}:
            # Rasmning unikal "imzosini" (hash) olish
            try:
                with Image.open(img_path) as img:
                    h = str(imagehash.average_hash(img))
                    if h in hashes:
                        # O'xshash rasm topildi, o'chiramiz
                        os.remove(img_path)
                        os.remove(lbl_path)
                    else:
                        hashes[h] = img_f
                        ascaris_only_files.append(img_f)
            except:
                continue
        else:
            other_species_files.append(img_f)

    print(f"O'xshashlikdan keyin qolgan Ascaris rasmlari: {len(ascaris_only_files)}")

    # 3. Agar haliham ko'p bo'lsa, tasodifiy (random) kamaytirish
    if len(ascaris_only_files) > TARGET_ASCARIS_COUNT:
        to_remove = random.sample(ascaris_only_files, len(ascaris_only_files) - TARGET_ASCARIS_COUNT)
        for f_name in to_remove:
            img_p = os.path.join(img_dir, f_name)
            lbl_p = os.path.join(lbl_dir, f_name.replace('.jpg', '.txt'))
            if os.path.exists(img_p): os.remove(img_p)
            if os.path.exists(lbl_p): os.remove(lbl_p)
        print(f"Ascaris rasmlari {TARGET_ASCARIS_COUNT} tagacha qisqartirildi.")

# Asosiy qismlarni tozalash
for part in ['train', 'valid', 'test']:
    clean_and_balance(part)

print("\nMUVAFFAQIYATLI YAKUNLANDI!")