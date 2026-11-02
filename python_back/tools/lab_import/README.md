# Laboratoriya arxivini serverga yuklash (`D:\labaratoriya`)

Hammasi oddiy yuklash bilan AYNAN bir xil yo'ldan o'tadi (API → AI →
birliklar → sana → xavf signallari). Skript faqat bemorni topadi/yaratadi va
fayllarni navbat bilan yuboradi.

## Nima tayyorlandi (lokal skaner, AI siz)

| | |
|---|---|
| Jami xlsx fayl | 26 676 |
| Yuklanadigan fayl | 23 846 (bir xil mazmunli 358 tasi bir marta) |
| Bemorlar | 16 652 |
| Lab tahlillari = AI so'rovlari | 23 166 (bir kundagi fayllar bitta tahlil) |
| O'tkazib yuboriladi | 2 472 — `skipped.csv` (sababi bilan) |
| Hajm | ≈ 3.5 GB |

O'tkazib yuborilganlar: bo'sh shablon 1 493, tug'ilgan yili yo'q 497, faqat
familiya (mos bemor topilmadi) 393, F.I.O. yo'q 88, buzilgan 1.

**Qoidalar:** bemor = lotincha familiya + ism bosh harfi + tug'ilgan yili
(sana `YYYY-01-01`, faylda to'liq sana bo'lsa o'sha). Bazada shunday bemor
bo'lsa yangisi yaratilmaydi. Tahlil sanasi faylning «Дата:» katagidan. AI
xulosasi o'zbekcha. Avtomatik kompleks tahlil o'chiq bo'lishi SHART.

## Papka — `D:\git\ekg_tahlili_app\import_lab_2026-11-02\`

`labs.zip` (fayllar), `plan.json` (bemor → tahlillar), `skipped.csv`,
`report.txt`, `tools\import_labs.py`, `tools\make_import_token.py`.

---

## Qadamlar (SSH, root)

### 1. Joy va sozlama
```bash
df -h /root /projects
grep -n -A2 '"AutoCombined"' /projects/nmed/api.nmed.uz/appsettings*.json
```
Kamida 12 GB bo'sh joy kerak. `"Enabled": true` chiqsa — `false` qiling va
`systemctl restart api.nmed.uz`.

### 2. Fayllarni yuklash (WinSCP, Binary)
`import_lab_2026-11-02` papkasini `/root/import` nomi bilan yuklang
(`labs.zip` ≈ 3.5 GB — bir necha soat olishi mumkin). So'ng:
```bash
mkdir -p /projects/nmed/analyse.nmed.uz/tools/lab_import
cp /root/import/tools/*.py /projects/nmed/analyse.nmed.uz/tools/lab_import/
cd /root/import && /projects/nmed/analyse.nmed.uz/venv/bin/python -m zipfile -e labs.zip labaratoriya/
```

### 3. Token (parol kerak emas)
Tahlillar kimning nomidan yuklansin — o'sha xodimning telefoni (shifokor yoki
hamshira; admin hisobida shifokor yozuvi bo'lmasa yuklay olmaydi):
```bash
cd /projects/nmed/analyse.nmed.uz
venv/bin/python tools/lab_import/make_import_token.py --who 998XXXXXXXXX --days 5 > /root/import/token.txt
```
Ekranda xodim ismi, roli va klinikasi chiqadi — to'g'riligini tekshiring.

### 4. Sinov — 30 ta tahlil
```bash
cd /root/import
/projects/nmed/analyse.nmed.uz/venv/bin/python /projects/nmed/analyse.nmed.uz/tools/lab_import/import_labs.py run \
  --plan plan.json --root labaratoriya --token-file token.txt --limit 30
```
5 daqiqadan keyin:
```bash
/projects/nmed/analyse.nmed.uz/venv/bin/python /projects/nmed/analyse.nmed.uz/tools/lab_import/import_labs.py check --token-file token.txt
```
Tekshiring: saytda bemorlar va tahlillar to'g'ri; OpenAI kabinetida (Usage)
shu 30 ta so'rov narxi — ×770 qilsangiz umumiy xarajat chiqadi.

### 5. Hammasi (fon rejimida, ≈ 2 kun)
```bash
cd /root/import
nohup /projects/nmed/analyse.nmed.uz/venv/bin/python /projects/nmed/analyse.nmed.uz/tools/lab_import/import_labs.py run \
  --plan plan.json --root labaratoriya --token-file token.txt --rate 7 > import.log 2>&1 &
tail -f import.log
```
`Ctrl+C` faqat ko'rishni to'xtatadi, import davom etadi. Server qayta yuklansa
yoki to'xtasa — xuddi shu buyruqni qayta bering: `state.json` dan davom etadi,
hech narsa takror yuklanmaydi.

AI so'rovlari chegarasi (daqiqasiga 10) BUTUN sayt uchun umumiy: `--rate 7`
da klinika xodimlari ham yuklay oladi. Kechasi `--rate 9` qilish mumkin.

### 6. Oxirida
```bash
cd /root/import
PY=/projects/nmed/analyse.nmed.uz/venv/bin/python; T=/projects/nmed/analyse.nmed.uz/tools/lab_import/import_labs.py
$PY $T check --token-file token.txt     # holatlar
$PY $T retry --token-file token.txt     # AI xatosi bo'lganlarni qayta yuborish
```
So'ng `token.txt`, `labs.zip` va `labaratoriya/` ni o'chiring (`state.json`
va `import.log` ni saqlang).

Kompleks AI xulosalari — import tugagach, alohida bir martalik ish sifatida.
