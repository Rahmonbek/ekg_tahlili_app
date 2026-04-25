@echo off
python -m venv venv
call venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python make_folders.py
echo.
echo Setup tugadi.
pause
