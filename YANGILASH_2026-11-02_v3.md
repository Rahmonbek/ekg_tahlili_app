# NMED — statistika sahifasining yangi ko'rinishlarini serverga chiqarish

Serverda `9d4ff46` (bugungi lab tuzatishlari) turibdi. Bu paket faqat
`679de4f` commitini qo'shadi: **frontend** va **API**. Python o'zgarmagan,
baza migratsiyasi YO'Q, yangi sozlama YO'Q.

**Nima yangi:** laboratoriya statistikasining ikkita yangi ko'rinishi, eski
sahifa o'zgarmagan:
- `https://nmed.uz/lab-statistics` — eski (menyudagi «Statistika»).
- `https://nmed.uz/lab-statistics-new` — ixcham ko'rinish.
- `https://nmed.uz/lab-statistics-new-1` — chapda filtrlar, o'ngda jadvallar
  (tanlangan ko'rinish).
Yangi manzillar menyuda yo'q — brauzer qatoriga qo'lda yoziladi; admin yoki
direktor hisobi kerak.

API o'zgarishi: statistikadagi «Tahlil guruhlari» jadvali uchun ↑/↓/me'yorda/
bemorlar ustunlari. API yangilanmasa yangi sahifadagi shu ustunlar 0 bo'lib
chiqadi, boshqa hech narsa buzilmaydi.

**Downtime:** API qayta ishga tushishi ~30 soniya. Frontend uchun to'xtatish
shart emas.

---

## Fayllar — `D:\git\ekg_tahlili_app\deploy_2026-11-02_v3\`

| Papka | Ichida | Serverda qayerga |
|---|---|---|
| `frontend\` | `index.html`, `asset-manifest.json`, `static\` (`main.128c6fa1.js`), rasmlar | `/projects/nmed/nmed.uz` |
| `api\` | `EkgAnalyzerApi.dll`, `.pdb`, `.deps.json`, `.runtimeconfig.json` | `/projects/nmed/api.nmed.uz` |

`appsettings*.json`, `.env`, `uploads`, `wwwroot`, Python papkasiga tegilmaydi.

---

## Qadamlar

### 1. WinSCP (Transfer mode: Binary)
`frontend` papkasi ichidagilarni `/projects/nmed/nmed.uz` ga, `api` papkasi
ichidagi 4 faylni `/projects/nmed/api.nmed.uz` ga ko'chiring (ustidan yozish).
Xohlasangiz avval API ni to'xtating — ishlab turgan `.dll` ustiga yozishda
WinSCP xato berishi mumkin:
```bash
systemctl stop api.nmed.uz
```

### 2. SSH: egasini to'g'rilash va API ni ishga tushirish
```bash
chown -R --reference=/projects/nmed/nmed.uz /projects/nmed/nmed.uz
chown -R --reference=/projects/nmed/api.nmed.uz /projects/nmed/api.nmed.uz
systemctl restart api.nmed.uz
```
30 soniyadan keyin:
```bash
systemctl status api.nmed.uz --no-pager | head -12
journalctl -u api.nmed.uz --since "-3 min" --no-pager | grep -iE "error|fail|exception"
```
`active (running)` bo'lishi, log bo'sh bo'lishi kerak. Migratsiya yo'q —
"Applying migration" chiqmaydi.

### 3. Tekshirish
O'z kompyuteringizda:
```bash
curl -s https://nmed.uz/asset-manifest.json | grep main.js
```
`/static/js/main.128c6fa1.js` chiqishi kerak.

Brauzerda `Ctrl+F5`, so'ng admin hisobi bilan:
- `https://nmed.uz/lab-statistics-new-1` — chapda bo'limlar va filtrlar,
  «Umumiy» da grafik ostida davr jadvali, «Tahlil guruhlari bo'yicha»
  jadvalida ↑ Yuqori / ↓ Past ustunlari raqamli (API yangilanganini
  bildiradi), «Ko'rsatkichlar» da keng statistika jadvali, «Xavf
  signallari» bemor bo'yicha guruhlangan.
- `https://nmed.uz/lab-statistics` — eski sahifa avvalgidek ishlaydi.

## Orqaga qaytarish
Faqat kod: `~/nmed-code-*.tar.gz` (bugungi zaxira) dan `nmed.uz` va
`api.nmed.uz` papkalarini tiklab `systemctl restart api.nmed.uz`. Baza
o'zgarmagan — tiklash shart emas.
