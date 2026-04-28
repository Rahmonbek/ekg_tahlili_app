import os
import shutil

# 1. Sozlamalar
dataset_path = 'dataset/train/images'  # Rasmlar joylashgan yo'l
labels_path = 'dataset/train/labels'  # TXT fayllar joylashgan yo'l
output_path = 'sorted_dataset'                # Saralangan rasmlar tushadigan joy

# YAML faylingizdagi nomlar lug'ati
names = {
    0: 'ascaris', 1: 'trichuris', 2: 'hookworm', 3: 'schistosoma',
    4: 'taenia', 5: 'enterobius', 6: 'fasciolopsis', 7: 'hymenolepis_nana',
    8: 'hymenolepis_diminuta', 9: '激capillaria', 10: 'opisthorchis', 11: 'paragonimus'
}

# Chiqish papkasini yaratish
if not os.path.exists(output_path):
    os.makedirs(output_path)

# 2. Fayllarni qayta ishlash
for label_file in os.listdir(labels_path):
    if label_file.endswith('.txt'):
        file_id = os.path.splitext(label_file)[0]
        label_full_path = os.path.join(labels_path, label_file)
        
        # Rasm formatini aniqlash (jpg, png bo'lishi mumkin)
        img_name = None
        for ext in ['.jpg', '.jpeg', '.png']:
            if os.path.exists(os.path.join(dataset_path, file_id + ext)):
                img_name = file_id + ext
                break
        
        if img_name:
            img_src = os.path.join(dataset_path, img_name)
            
            # TXT faylni o'qish va klasslarni aniqlash
            with open(label_full_path, 'r') as f:
                lines = f.readlines()
                
            # Bitta rasmda bir nechta har xil gijja bo'lsa, har birining papkasiga nusxalaydi
            detected_classes = set()
            for line in lines:
                class_id = int(line.split()[0])
                detected_classes.add(class_id)
            
            for cid in detected_classes:
                class_name = names[cid]
                class_folder = os.path.join(output_path, class_name)
                
                # Klass papkasini yaratish
                if not os.path.exists(class_folder):
                    os.makedirs(class_folder)
                
                # Rasmni nusxalash
                shutil.copy(img_src, os.path.join(class_folder, img_name))

print(f"Ish yakunlandi! Rasmlar '{output_path}' papkasiga saralandi.")