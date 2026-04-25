@echo off
venv\Scripts\activate
python check_dataset.py
python train.py --epochs 3
pause
