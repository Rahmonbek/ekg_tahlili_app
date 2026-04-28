from roboflow import Roboflow

# 1. Roboflow-ga ulanish
rf = Roboflow(api_key="HnOEx3NnrtxHi8HSziYm")
project = rf.workspace("rahmonbeks-workspace").project("dataset-helmint")

# 2. Dataset papkasining yo'li
# Balanced_dataset ichida train, valid, test papkalari borligiga ishonch hosil qiling
dataset_path = "balanced_dataset"

# 3. Datasetni yuklash (yolov8 formatida)
# Bu metod train/images, valid/images va hokazolarni avtomatik taniydi
project.single_upload(
    image_path='dataset',
    batch_name="NMED_Batch_1",
    num_workers=10
)

# DIQQAT: Agar tepadagi metod ham xato bersa, eng yangi va to'g'ri metod:
# project.import_dataset(dataset_path=dataset_path, dataset_format="yolov8")