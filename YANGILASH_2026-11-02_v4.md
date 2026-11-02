# NMED — yangi statistika sahifasini serverga chiqarish

Serverda `9d4ff46` turibdi. Bu paket `d4cd569` gacha bo'lgan o'zgarishlarni
qo'shadi: **frontend** va **API**. Python o'zgarmagan (faqat import
skriptlari — ular allaqachon serverda), baza migratsiyasi YO'Q, yangi
sozlama YO'Q. Avvalgi `deploy_2026-11-02_v3` paketi kerak emas — bu uning
o'rnini bosadi.

**Nima yangi:**
- `https://nmed.uz/lab-statistics` (menyudagi «Statistika») — yangi dizayn:
  chapda bo'limlar va filtrlar, o'ngda jadvallar. Sinov manzillari
  (`/lab-statistics-new`, `/lab-statistics-new-1`) shu sahifaga yo'naltiriladi.
- «Chetlanishli/chetlanishsiz» → «patologiyali/patologiyasiz» (uz/ru/en).
- API: «Tahlil guruhlari» jadvali uchun ↑/↓/me'yorda/bemorlar ustunlari.

**Ishlab turgan import bilan:** frontend yangilanishi importga ta'sir
qilmaydi. API qayta ishga tushganda (~10–30 s) import skripti so'rovni o'zi
qayta yuboradi — to'xtatish shart emas.

---

## Fayllar — `D:\git\ekg_tahlili_app\deploy_2026-11-02_v4\`

| Papka | Ichida | Serverda qayerga |
|---|---|---|
| `frontend\` | `index.html`, `asset-manifest.json`, `static\` (`main.bec5c699.js`), rasmlar | `/projects/nmed/nmed.uz` |
| `api\` | `EkgAnalyzerApi.dll`, `.pdb`, `.deps.json`, `.runtimeconfig.json` | `/projects/nmed/api.nmed.uz` |

---

## Qadamlar

### 1. Frontend (WinSCP, Binary)
`frontend` papkasi **ichidagilarni** `/projects/nmed/nmed.uz` ga torting
(ustidan yozish). Shu zahoti ishlaydi — restart kerak emas.

### 2. API
Avval API ni to'xtating (ishlab turgan `.dll` ustiga yozilmaydi):
```bash
systemctl stop api.nmed.uz
```
WinSCP da `api` ichidagi 4 faylni `/projects/nmed/api.nmed.uz` ga torting, keyin:
```bash
chown -R --reference=/projects/nmed/nmed.uz /projects/nmed/nmed.uz
chown -R --reference=/projects/nmed/api.nmed.uz /projects/nmed/api.nmed.uz
systemctl start api.nmed.uz
systemctl status api.nmed.uz --no-pager | head -5
```
`active (running)` bo'lishi kerak.

### 3. Import davom etayotganini tekshirish
```bash
pgrep -af import_labs.py; tail -3 /root/import/import.log
```
Jarayon qatori chiqishi va logda yangi `lab ...` qatorlari ko'payishi kerak
(API to'xtagan paytdagi `tarmoq xatosi` / `502 — 20 s kutiladi` qatorlari
normal).

### 4. Brauzerda (`Ctrl+F5`)
- `curl -s https://nmed.uz/asset-manifest.json | grep main.js` →
  `/static/js/main.bec5c699.js`.
- «Statistika» — chapda bo'limlar va filtrlar; «Patologiyali tahlillar»
  yozuvi; «Tahlil guruhlari bo'yicha» jadvalida ↑ Yuqori / ↓ Past ustunlari
  raqamli (API yangilanganini bildiradi).

## Orqaga qaytarish
Faqat kod: bugungi `~/nmed-code-*.tar.gz` zaxirasidan `nmed.uz` va
`api.nmed.uz` papkalarini tiklab `systemctl restart api.nmed.uz`. Baza
o'zgarmagan.
