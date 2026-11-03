# NMED — laboratoriya AI xarajatini kamaytirish (v6)

Bu paket `fe73908` gacha bo'lgan barcha o'zgarishlarni o'rnatadi (`v4` va
`v5` dagi statistika sahifasi va PDF hisobot ham shu yerda — ular
yuklanmagan bo'lsa alohida yuklash shart emas).

**Nima yangi:**
- Laboratoriya tahlili ~40% arzon. Natijalar o'zgarmaydi (4 ta klinika
  faylida eski yo'l bilan aynan bir xil). Prompt keshlanadi, fikrlash
  chuqurligi "medium", alohida tasniflash so'rovi yo'q.
- `ai_usage` jadvali — har bir AI so'rovining tokenlari va narxi (barcha modullar).
- Arxiv importi (`import_labs.py`) endi `bulk=true` yuboradi — AI arzon
  **flex** tarifida (~50% arzon, javob sekinroq).
- Fayl turi mos kelmagan tahlil (status 3) endi «Tahlillar» oynasida
  «davom etmoqda» bo'lib qolib ketmaydi.

**Baza:** yangi migratsiya `20261105000000_AiUsageAndLabAliases` (2 ta yangi
jadval: `ai_usage`, `lab_value_aliases`). Mavjud jadvallarga tegmaydi. API
ishga tushganda o'zi qo'llanadi.

**Yangi sozlama SHART EMAS.** Ixtiyoriylari pastda.

---

## Fayllar — `D:\git\ekg_tahlili_app\deploy_2026-11-03_v6\`

| Papka | Ichida | Serverda qayerga |
|---|---|---|
| `python\` | 14 ta `.py` + `tools\lab_import\` | `/projects/nmed/analyse.nmed.uz` |
| `api\` | `EkgAnalyzerApi.dll`, `.pdb`, `.deps.json`, `.runtimeconfig.json` | `/projects/nmed/api.nmed.uz` |
| `frontend\` | `v5` bilan bir xil (`main.3f641b5d.js`) | `/projects/nmed/nmed.uz` — faqat `v5` yuklanmagan bo'lsa |

---

## Qadamlar

### 0. Zaxira
```bash
cd /projects/nmed && tar czf ~/nmed-code-$(date +%F-%H%M).tar.gz --exclude=venv --exclude=uploads --exclude=wwwroot/uploads analyse.nmed.uz api.nmed.uz nmed.uz && ls -lh ~/nmed-code-*.tar.gz | tail -1
```

### 1. Importni to'xtatish va navbat bo'shashini kutish
Python qayta ishga tushganda AI ishlayotgan tahlillar uzilib qoladi,
shuning uchun avval import to'xtatiladi:
```bash
pkill -f import_labs.py; sleep 2; pgrep -af import_labs.py || echo "import to'xtadi"
```
Navbatdagi tahlillar sonini tekshiring (har 1–2 daqiqada qayta bering):
```bash
cd /projects/nmed/analyse.nmed.uz && venv/bin/python -c "from database import SessionLocal; from sqlalchemy import text; print('navbatda:', SessionLocal().execute(text('select count(*) from lab_analyses where status in (0,1)')).scalar())"
```
`navbatda: 0` bo'lgach keyingi qadamga o'ting (odatda 2–5 daqiqa).

### 2. Python (WinSCP, Binary)
`python` papkasi **ichidagilarni** `/projects/nmed/analyse.nmed.uz` ga torting
(ustidan yozish; `tools/lab_import` ham o'z joyiga tushadi). Keyin:
```bash
cd /projects/nmed/analyse.nmed.uz && venv/bin/python -c "import openai, inspect, openai.resources.responses as r; print('openai', openai.__version__, 'cache_key:', 'prompt_cache_key' in inspect.signature(r.Responses.create).parameters)"
```
`cache_key: True` chiqishi kerak. `False` bo'lsa ham ishlaydi, faqat kesh
tejovi kamroq bo'ladi — natijani menga yuboring.

### 3. API
```bash
systemctl stop api.nmed.uz
```
WinSCP da `api` ichidagi 4 faylni `/projects/nmed/api.nmed.uz` ga torting, keyin:
```bash
chown -R --reference=/projects/nmed/nmed.uz /projects/nmed/nmed.uz; chown -R --reference=/projects/nmed/api.nmed.uz /projects/nmed/api.nmed.uz; chown -R --reference=/projects/nmed/analyse.nmed.uz /projects/nmed/analyse.nmed.uz; systemctl start api.nmed.uz; sleep 15; systemctl restart analyse.nmed.uz
```

### 4. Tekshirish
```bash
systemctl status api.nmed.uz analyse.nmed.uz --no-pager | grep -E "●|Active"; sleep 20; curl -s http://127.0.0.1:1111/api/health; echo
```
Ikkalasi `active (running)`, health `"status":"healthy"`.

Migratsiya va jadvallar:
```bash
cd /projects/nmed/analyse.nmed.uz && venv/bin/python -c "from database import SessionLocal; from sqlalchemy import text; db=SessionLocal(); print(db.execute(text('select max(\"MigrationId\") from \"__EFMigrationsHistory\"')).scalar()); print(db.execute(text(\"select to_regclass('ai_usage'), to_regclass('lab_value_aliases')\")).fetchone())"
```
Kutiladi: `20261105000000_AiUsageAndLabAliases` va `('ai_usage', 'lab_value_aliases')`.

### 5. Brauzerda sinov (`Ctrl+F5`)
Bitta laboratoriya faylini odatdagidek yuklang — natija avvalgidek chiqishi
kerak. Keyin xarajat yozilganini ko'ring:
```bash
cd /projects/nmed/analyse.nmed.uz && venv/bin/python -c "
from database import SessionLocal; from sqlalchemy import text
for r in SessionLocal().execute(text('select created_at::time(0), module, analysis_id, step, model, service_tier, input_tokens, cached_tokens, output_tokens from ai_usage order by id desc limit 5')): print(r)"
```
Ikkinchi va keyingi laboratoriya so'rovlarida `cached_tokens` ≈ 5900 bo'lishi
kerak (statik prompt keshdan — shu tejov).

### 6. Xato tahlillarni qayta yuborish va importni davom ettirish
Avval OpenAI balansi to'ldirilganini tekshiring. Bitta buyruq ketma-ket
uchta ishni bajaradi:
1. `check` — holatlarni yangilaydi;
2. `retry --all-errors` — AI xatosi bilan tugagan BARCHA tahlillarni (import
   qilinganlari va klinikaning boshqalari) bemor yoshi va jinsi bilan qayta
   yuboradi;
3. `run` — qolganlarini yuklaydi: tahlil sanasi bo'yicha ENG YANGISIDAN
   eskisiga. Avval yuklanganlari qayta yuklanmaydi.
```bash
cd /root/import && setsid nohup sh -c 'PY=/projects/nmed/analyse.nmed.uz/venv/bin/python; T=/projects/nmed/analyse.nmed.uz/tools/lab_import/import_labs.py; $PY $T check --token-file token.txt; $PY $T retry --all-errors --token-file token.txt --rate 7; $PY $T run --plan plan.json --root labaratoriya --token-file token.txt --rate 7' >> import.log 2>&1 < /dev/null & sleep 90; tail -8 /root/import/import.log
```
Logda `qayta yuboriladi: N ta`, keyin `retry lab …: 200` qatorlari, so'ng
`yuklanmagan: … ta, 2026-10-30 dan … gacha` va `lab …` qatorlari chiqadi.
`retry lab …: 404` — boshqa klinikaning tahlili (import tokeni unga ruxsat
etmaydi). Buni o'sha klinika xodimi o'zi qayta yuboradi.
Flex tarifi tekshiruvi (bir necha tahlildan keyin):
```bash
cd /projects/nmed/analyse.nmed.uz && venv/bin/python -c "from database import SessionLocal; from sqlalchemy import text; print(SessionLocal().execute(text(\"select coalesce(service_tier,'oddiy'), count(*) from ai_usage where created_at > now() - interval '30 min' group by 1\")).fetchall())"
```
`flex` qatori bo'lsa — import arzon tarifda. Faqat `oddiy` bo'lsa, model flex
ni qo'llamaydi; import baribir ishlaydi (avtomatik oddiy tarifga o'tadi).
Flex sekinroq: import tezligi biroz pasayishi mumkin, bu normal.

---

## Ixtiyoriy sozlamalar (`/projects/nmed/analyse.nmed.uz/.env`, keyin `systemctl restart analyse.nmed.uz`)

| O'zgaruvchi | Standart | Ma'nosi |
|---|---|---|
| `AI_PRICES` | — | Narxni dollarda yozish uchun, 1 mln token: `{"gpt-5.6-terra": [kirish, keshlangan, chiqish], "gpt-5-mini": [...]}` — OpenAI narxlar sahifasidagi qiymatlar |
| `AI_LAB_REASONING_EFFORT` | `medium` | `high` — eski chuqurlik (qimmatroq) |
| `AI_LAB_CLASSIFY` | `false` | `true` — har faylni oldin alohida tasniflash (eski xatti-harakat) |
| `AI_LAB_PIPELINE` | `single` | `split` — ikki bosqichli yo'l (sinov uchun; o'lchovda kamroq tejadi) |
| `AI_BULK_SERVICE_TIER` | `flex` | bo'sh qiymat — importda ham oddiy tarif |

## Orqaga qaytarish
- Faqat sozlama bilan: `.env` ga `AI_LAB_REASONING_EFFORT=high` va
  `AI_LAB_CLASSIFY=true` → `systemctl restart analyse.nmed.uz` (eski xatti-harakat).
- To'liq: 0-qadamdagi `~/nmed-code-*.tar.gz` dan uchala papkani tiklab
  ikkala servisni qayta ishga tushiring. Yangi 2 jadval qolsa ham eski kodga
  xalaqit bermaydi.
