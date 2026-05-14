# NMED EKG Tahlili App — Claude Code Yo'riqnomasi

## Loyiha Haqida

NMED — tibbiy tahlil platformasi. Uch qatlam:
- **Backend**: `backend/EkgAnalyzerApi/` — .NET 8, EF Core 7, PostgreSQL, port 5000/5001
- **AI**: `python_back/` — FastAPI + Uvicorn, OpenAI GPT-4o, port 8000
- **Frontend**: `frontend/src/` — React 18, Ant Design v5, Zustand, port 3000

**DB**: PostgreSQL `med_helper_data` — bitta baza, ikkala backend ulangan.

Tahlil modullari: **EKG, Laboratoriya, Holter, SMAD, Parazitologiya**

---

## Arxitektura Hujjatlari

- **Constitution** (arxitektura qoidalari, xavfsizlik): [.specify/memory/constitution.md](.specify/memory/constitution.md)
- **Spec** (user stories, API shartnomasi): [.specify/memory/spec.md](.specify/memory/spec.md)
- **Tasks — Parazitologiya**: [.specify/memory/tasks-parasitology.md](.specify/memory/tasks-parasitology.md)
- **Tasks — UI/UX**: [.specify/memory/tasks-uiux.md](.specify/memory/tasks-uiux.md)
- **Tasks — Video Konferensiya**: [.specify/memory/tasks-videocall.md](.specify/memory/tasks-videocall.md)

---

## Qat'iy Taqiqlangan (Hech Qachon Qilma)

1. **Frontend → Python API bevosita murojaat** — barcha so'rovlar `.NET API` proxy orqali o'tishi SHART
2. **Python `print()` production kodda** — faqat `logging.getLogger(__name__)` ishlatilsin
3. **Bo'sh catch bloklar (.NET)** — kamida `ILogger` orqali log qilinsin
4. **Baza sxemasini Python tomonidan o'zgartirish** — faqat EF Core Migrations
5. **Hardcoded API kalitlari** — faqat environment variable'lardan o'qilsin
6. **Silent fallback (JWT)** — `JWT_SECRET` yo'q bo'lsa `RuntimeError`, anonymous user qaytarish emas

---

## Muhim Konventsiyalar

### Naming
- C#: `PascalCase` (class, method), `camelCase` (local vars)
- Python: `snake_case` (func, var), `PascalCase` (class)
- React: `PascalCase` (components), `camelCase` (functions, state)
- DB ustunlari: `snake_case`

### Tahlil Status Kodlari (int, EKG/Lab/Holter/SMAD)
- `0` = yaratildi (kutmoqda)
- `1` = fayl qayta ishlandi (AI kutmoqda)
- `2` = AI natija tayyor
- `-1` = AI xatolik

> **Istisno — Parazitologiya**: string status — `"pending"` / `"analyzed"` / `"not_analyzed"` / `"failed"`

### AI Javob Formati (`AIAnswerData` ustunida JSON text)
```json
{
  "digital_measurements": {},
  "automatic_analysis": "...",
  "automatic_analysis_bool": 1,
  "AI_recommendations": "...",
  "final_summary": "..."
}
```
`automatic_analysis_bool` ba'zan int (1), ba'zan string ("1") — ikkalasi handle qilinishi SHART.

### `automatic_analysis_bool` Filter (DB darajasida emas, `Contains` orqali)
```csharp
e.AIAnswerData.Contains($"\"automatic_analysis_bool\": {val}") ||
e.AIAnswerData.Contains($"\"automatic_analysis_bool\":{val}") ||
e.AIAnswerData.Contains($"\"automatic_analysis_bool\": \"{val}\"") ||
e.AIAnswerData.Contains($"\"automatic_analysis_bool\":\"{val}\"")
```

### Passport Qidiruvi
AES-256-CBC tasodifiy IV ishlatadi → DB `LIKE` ishlamaydi.
Qidiruv in-memory: barcha passportlar `EncryptionService.Decrypt()` → keyin taqqoslash.

---

## Xavfsizlik Sertifikatsiyasi (O'z DSt 2814:2014 3-daraja)

| Talab | Holat |
|-------|-------|
| C1 — Proxy arxitektura | ✅ |
| C2 — Audit log (`AuditMiddleware.cs`) | ✅ |
| C3 — Rate limiting (strict/ai-analysis/general) | ✅ |
| C4 — AES-256 (passport ✅, birthdate ⚠️, fayl yo'llari ⚠️) | QISMAN |
| C5 — JWT startup validation | ✅ |
| C6 — HTTPS (production) | ✅ |

**Ochiq**: C4-GAP-1 (birthdate), C4-GAP-2 (fayl yo'llari)

---

## Fayl Tuzilishi

```
backend/EkgAnalyzerApi/
  Controllers/     # API endpointlar
  Services/        # Biznes logika
  Models/          # EF Core entity modellari
  DTOs/            # Request/Response DTO'lar
  Data/            # DbContext (MedDataDB)
  Migrations/      # EF Core (baza sxemasi manba haqqoniyati)

python_back/
  main.py              # FastAPI app + router ulash
  *_analyses_api.py    # Router submodulelar (har modul uchun alohida)
  models.py            # SQLAlchemy (faqat mavjud jadvallarni reflect)
  database.py          # DB connection

frontend/src/
  host/                # API konfiguratsiya, axiosInstance
  host/requests/       # Entity-based API request funksiyalari
  store/               # Zustand global store (Store.js)
  pages/cabinet/       # Sahifalar
  components/          # Qayta ishlatiladigan komponentlar
  locale/              # i18n (Uz.json, Ru.json, En.json)
```

---

## Rol Tizimi

| Rol | ID | Kirish |
|-----|----|--------|
| SuperAdmin | 1 | Tizim darajasi, statistika |
| Admin | 2 | Klinika boshqaruvi, barcha tahlillar |
| Direktor | 3 | Admin bilan bir xil |
| Shifokor | 4 | Faqat o'ziga assigned tahlillar + `is_viewed` badge |
| Hamshira | 5 | Faqat o'zi yaratgan tahlillar, badge yo'q |

---

## Agent Memory

Qo'shimcha kontekst: [.claude/agent-memory/nmed-system-architect/MEMORY.md](.claude/agent-memory/nmed-system-architect/MEMORY.md)
