# NMED — statistika sahifasi: halqa diagrammalar va PDF hisobot

Bu paket `8e42a4d` gacha bo'lgan barcha o'zgarishlarni o'rnatadi (`v4` dagi
yangi dizayn va «patologiyali» yozuvlari ham shu yerda — `v4` ni alohida
yuklash shart emas). Faqat **frontend** va **API**. Python o'zgarmagan
(import skripti allaqachon serverda), baza migratsiyasi YO'Q, yangi
sozlama YO'Q.

**Nima yangi (`/lab-statistics`):**
- Bemorlar va tahlillar tarkibi — 4 ta halqa diagramma.
- «Eng ko'p patologiya aniqlangan ko'rsatkichlar» — chapda ro'yxat, o'ngda halqa.
- Ko'rsatkichlar jadvali: sarlavhalar bir qatorda, nom ustuni qotgan.
- Filtr maydonlari ixcham (faqat shu sahifada).
- **«PDF yuklab olish»** — sahifadagi filtrlar bilan statistika hisoboti (yotiq A4).

**Ishlab turgan import bilan:** frontendni istalgan vaqt yuklash mumkin.
API qayta ishga tushganda (~10–30 s) import skripti so'rovni o'zi qayta
yuboradi — to'xtatish shart emas.

---

## Fayllar — `D:\git\ekg_tahlili_app\deploy_2026-11-02_v5\`

| Papka | Ichida | Serverda qayerga |
|---|---|---|
| `frontend\` | `index.html`, `asset-manifest.json`, `static\` (`main.3f641b5d.js`), rasmlar | `/projects/nmed/nmed.uz` |
| `api\` | `EkgAnalyzerApi.dll`, `.pdb`, `.deps.json`, `.runtimeconfig.json` | `/projects/nmed/api.nmed.uz` |

---

## Qadamlar

### 1. Frontend (WinSCP, Binary)
`frontend` papkasi **ichidagilarni** `/projects/nmed/nmed.uz` ga torting
(ustidan yozish). Restart kerak emas.

### 2. API
```bash
systemctl stop api.nmed.uz
```
WinSCP da `api` ichidagi 4 faylni `/projects/nmed/api.nmed.uz` ga torting, keyin:
```bash
chown -R --reference=/projects/nmed/nmed.uz /projects/nmed/nmed.uz; chown -R --reference=/projects/nmed/api.nmed.uz /projects/nmed/api.nmed.uz; systemctl start api.nmed.uz
```
```bash
systemctl status api.nmed.uz --no-pager | head -5; pgrep -af import_labs.py; tail -3 /root/import/import.log
```
API `active (running)`, import jarayoni qatori chiqishi kerak. Logda bir-ikki
`502 — 20 s kutiladi` qatori — API to'xtagan payt, normal.

### 3. Brauzerda (`Ctrl+F5`)
- `curl -s https://nmed.uz/asset-manifest.json | grep main.js` →
  `/static/js/main.3f641b5d.js`.
- «Statistika»: «Umumiy» da 4 ta halqa, «Ko'rsatkichlar» da ro'yxat + halqa.
- **«PDF yuklab olish»** tugmasi — fayl yuklanadi, ochilganda halqalar va
  jadvallar ko'rinadi. PDF ochilmasa yoki xato bersa:
  ```bash
  journalctl -u api.nmed.uz --since "-5 min" --no-pager | grep -iE "pdf|error|exception" | tail -10
  ```
  natijasini yuboring.

## Orqaga qaytarish
Faqat kod: `~/nmed-code-*.tar.gz` zaxirasidan `nmed.uz` va `api.nmed.uz`
papkalarini tiklab `systemctl restart api.nmed.uz`. Baza o'zgarmagan.
