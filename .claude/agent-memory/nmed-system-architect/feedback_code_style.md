---
name: Kod Yozish Qoidalari va Muhim Cheklovlar
description: Constitution va spec dan kelib chiqqan hal qiluvchi kod yozish qoidalari — buzish taqiqlangan
type: feedback
---

# Kod Yozish Qoidalari

## Qat'iy Taqiqlangan (Never Do)
1. **Frontend → Python API bevosita murojaat** — barcha tahlil so'rovlari .NET API proxy orqali.
2. **Python `print()` production kodda** — `logging.getLogger(__name__)` ishlatilsin.
3. **Bo'sh catch bloklar (.NET)** — kamida `ILogger` orqali log qilinsin.
4. **Baza sxemasini Python tomonidan o'zgartirish** — faqat EF Core Migrations.
5. **Hardcoded API kalitlari** — faqat environment variable'lardan o'qilsin.
6. **Silent fallback (JWT)** — `JWT_SECRET` yo'q bo'lsa `RuntimeError`, anonymous user emas.

**Why:** Kiber xavfsizlik sertifikatsiyasi (C1–C6) va loyiha arxitekturasi talablari.
**How to apply:** Har yangi kod yozishda bu qoidalarni tekshir, constitution.md ga murojaat qil.

## Muhim Konventsiyalar
- C# → PascalCase (class/method), camelCase (local vars)
- Python → snake_case (func/var), PascalCase (class)
- React → PascalCase (components), camelCase (functions)
- DB ustunlari → snake_case
- UI: `className="login_input"`, `className="btn_form"`, `className="input_date"`

## AES-256 Passport Qidiruvhi
`automatic_analysis_bool` filtri DB darajasida emas, `Contains()` orqali string match.
Passport qidiruvhi in-memory deshifrlash orqali (DB `LIKE` ishlaytolmaydi — tasodifiy IV sababli).

## Status Kodlari (int)
- `0` = yaratildi (kutmoqda)
- `1` = fayl qayta ishlandi (AI kutmoqda)
- `2` = AI natija tayyor
- `-1` = AI xatolik

**Parazitologiya istisno**: string status — `"pending"` / `"analyzed"` / `"not_analyzed"` / `"failed"`
