---
name: NMED Platforma Arxitekturasi
description: Loyiha tuzilishi, modullar, xavfsizlik sertifikati holati va muhim sinxron nuqtalar
type: project
---

# NMED Platforma Arxitekturasi (2026-04-23 holati)

**Why:** Har suhbatda arxitekturani qayta tushuntirmaslik uchun.
**How to apply:** Har yangi vazifada avval bu faylni o'qib, tegishli kontekstni olish.

## Qatlam va Portlar
| Qatlam | Texnologiya | Port |
|--------|-------------|------|
| .NET API | ASP.NET Core 8, EF Core 7, PostgreSQL | 5000/5001 |
| Python AI | FastAPI + Uvicorn, OpenAI GPT-4o | 8000 |
| Frontend | React 18, Ant Design v5, Zustand | 3000 |

**DB**: PostgreSQL `med_helper_data` — bitta baza, ikkala backend ulangan.

## Tahlil Modullari (5 ta)
- **EKG** — XML/CSV/PNG → AI tahlil
- **Laboratoriya** — lab ko'rsatkichlari → AI tahlil
- **Holter** — 24h yurak monitoring
- **SMAD** — 24h qon bosimi monitoring
- **Parazitologiya** (yangi, 2026-04-22) — mikroskop rasm → GPT-4o vision

## Xavfsizlik Sertifikatsiyasi (O'z DSt 2814:2014 3-daraja)
| Talab | Holat |
|-------|-------|
| C1 — Proxy arxitektura (Python API to'g'ridan-to'g'ri chaqirilmaydi) | ✅ BAJARILGAN |
| C2 — Audit log (AuditMiddleware.cs) | ✅ BAJARILGAN |
| C3 — Rate limiting (3 pog'onali: strict/ai-analysis/general) | ✅ BAJARILGAN |
| C4 — AES-256 shifrlash (passport ✅, birthdate ⚠️, file paths ⚠️) | QISMAN |
| C5 — JWT va API kalitlari startup validation | ✅ BAJARILGAN |
| C6 — HTTPS majburlash (production) | ✅ BAJARILGAN |

**Ochiq muammolar**: C4-GAP-1 (birthdate shifrlanmagan), C4-GAP-2 (fayl yo'llari shifrlanmagan)

## Rol Tizimi
- Admin (2) / Direktor (3): klinika boshqaruvi, barcha tahlillarni ko'radi
- Shifokor (4): faqat o'ziga assigned junction tahlillarni ko'radi + `is_viewed` badge
- Hamshira (5): faqat o'zi `created_doctor_id` bo'lgan tahlillarni ko'radi, badge yo'q
- SuperAdmin (1): tizim darajasi, statistika endpointlari
