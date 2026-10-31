-- NMED — 2.3 (retention) hujjati uchun production ko'rsatkichlari.
-- Har bir so'rovdagi all_an = EKG/Holter/SMAD/Lab tahlillari birlashmasi.
-- Faqat O'QIYDI: tranzaksiya READ ONLY ochiladi va oxirida ROLLBACK qilinadi.
-- Ishga tushirish (serverda):  psql "$DATABASE_URL" -f retention_metrics.sql > retention_out.txt
-- Natijani (retention_out.txt) Claude ga yuboring — hujjatdagi [___] joylar shundan to'ldiriladi.

BEGIN TRANSACTION READ ONLY;


\echo '=== 1. Jami tahlillar va bemorlar ==='
WITH all_an AS (
      SELECT 'ecg' AS t, id, clinic_id, patient_id, created_doctor_id, created_at FROM ecg_analyses
UNION ALL SELECT 'holter', id, clinic_id, patient_id, created_doctor_id, created_at FROM holter_analyses
UNION ALL SELECT 'smad',   id, clinic_id, patient_id, created_doctor_id, created_at FROM smad_analyses
UNION ALL SELECT 'lab',    id, clinic_id, patient_id, created_doctor_id, created_at FROM lab_analyses)
SELECT count(*) AS jami_tahlil, count(DISTINCT patient_id) AS tahlilli_bemor FROM all_an;

\echo '=== 2. Turlar bo''yicha ulush ==='
WITH all_an AS (
      SELECT 'ecg' AS t, id, clinic_id, patient_id, created_doctor_id, created_at FROM ecg_analyses
UNION ALL SELECT 'holter', id, clinic_id, patient_id, created_doctor_id, created_at FROM holter_analyses
UNION ALL SELECT 'smad',   id, clinic_id, patient_id, created_doctor_id, created_at FROM smad_analyses
UNION ALL SELECT 'lab',    id, clinic_id, patient_id, created_doctor_id, created_at FROM lab_analyses)
SELECT t, count(*) AS soni, round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS foiz
FROM all_an GROUP BY t ORDER BY soni DESC;

\echo '=== 3. Oylik tahlillar, klinika bo''yicha (2026-06 dan) ==='
WITH all_an AS (
      SELECT 'ecg' AS t, id, clinic_id, patient_id, created_doctor_id, created_at FROM ecg_analyses
UNION ALL SELECT 'holter', id, clinic_id, patient_id, created_doctor_id, created_at FROM holter_analyses
UNION ALL SELECT 'smad',   id, clinic_id, patient_id, created_doctor_id, created_at FROM smad_analyses
UNION ALL SELECT 'lab',    id, clinic_id, patient_id, created_doctor_id, created_at FROM lab_analyses)
SELECT to_char(a.created_at, 'YYYY-MM') AS oy, coalesce(c.clinic_name, '(klinikasiz)') AS klinika,
       count(*) AS tahlil, count(DISTINCT a.patient_id) AS bemor,
       count(DISTINCT a.created_doctor_id) AS yuklagan_xodim
FROM all_an a LEFT JOIN clinics c ON c.id = a.clinic_id
WHERE a.created_at >= '2026-06-01'
GROUP BY 1, 2 ORDER BY 1, 2;

\echo '=== 4. Haftalik faollik, oxirgi 8 hafta (klinika bo''yicha) ==='
WITH all_an AS (
      SELECT 'ecg' AS t, id, clinic_id, patient_id, created_doctor_id, created_at FROM ecg_analyses
UNION ALL SELECT 'holter', id, clinic_id, patient_id, created_doctor_id, created_at FROM holter_analyses
UNION ALL SELECT 'smad',   id, clinic_id, patient_id, created_doctor_id, created_at FROM smad_analyses
UNION ALL SELECT 'lab',    id, clinic_id, patient_id, created_doctor_id, created_at FROM lab_analyses)
SELECT date_trunc('week', a.created_at)::date AS hafta, coalesce(c.clinic_name, '(klinikasiz)') AS klinika,
       count(*) AS tahlil, count(DISTINCT a.created_at::date) AS faol_kun,
       count(DISTINCT a.created_doctor_id) AS faol_xodim
FROM all_an a LEFT JOIN clinics c ON c.id = a.clinic_id
WHERE a.created_at >= date_trunc('week', now()) - interval '8 weeks'
GROUP BY 1, 2 ORDER BY 2, 1;

\echo '=== 5. Qayta tekshirilgan bemorlar (turli kunlarda >= 2 marta) ==='
WITH all_an AS (
      SELECT 'ecg' AS t, id, clinic_id, patient_id, created_doctor_id, created_at FROM ecg_analyses
UNION ALL SELECT 'holter', id, clinic_id, patient_id, created_doctor_id, created_at FROM holter_analyses
UNION ALL SELECT 'smad',   id, clinic_id, patient_id, created_doctor_id, created_at FROM smad_analyses
UNION ALL SELECT 'lab',    id, clinic_id, patient_id, created_doctor_id, created_at FROM lab_analyses),
v AS (SELECT patient_id, count(DISTINCT created_at::date) AS kunlar FROM all_an GROUP BY patient_id)
SELECT count(*) AS bemor_jami,
       count(*) FILTER (WHERE kunlar >= 2) AS qayta_kelgan,
       round(100.0 * count(*) FILTER (WHERE kunlar >= 2) / nullif(count(*), 0), 1) AS qayta_foiz,
       count(*) FILTER (WHERE kunlar >= 3) AS uch_va_kop
FROM v;

\echo '=== 6. Qayta tashrif oralig''i (kun), bemorning ketma-ket tashriflari orasida ==='
WITH all_an AS (
      SELECT 'ecg' AS t, id, clinic_id, patient_id, created_doctor_id, created_at FROM ecg_analyses
UNION ALL SELECT 'holter', id, clinic_id, patient_id, created_doctor_id, created_at FROM holter_analyses
UNION ALL SELECT 'smad',   id, clinic_id, patient_id, created_doctor_id, created_at FROM smad_analyses
UNION ALL SELECT 'lab',    id, clinic_id, patient_id, created_doctor_id, created_at FROM lab_analyses),
d AS (SELECT DISTINCT patient_id, created_at::date AS kun FROM all_an),
g AS (SELECT kun - lag(kun) OVER (PARTITION BY patient_id ORDER BY kun) AS oraliq FROM d)
SELECT count(oraliq) AS oraliqlar_soni,
       percentile_cont(0.5)  WITHIN GROUP (ORDER BY oraliq) AS mediana_kun,
       percentile_cont(0.25) WITHIN GROUP (ORDER BY oraliq) AS p25_kun,
       percentile_cont(0.75) WITHIN GROUP (ORDER BY oraliq) AS p75_kun
FROM g WHERE oraliq IS NOT NULL;

\echo '=== 7. Shifokor ko''rib chiqishi: biriktirilgan EKG lardan ochilgani (is_viewed) ==='
SELECT count(*) AS biriktirilgan, count(*) FILTER (WHERE is_viewed) AS korilgan,
       round(100.0 * count(*) FILTER (WHERE is_viewed) / nullif(count(*), 0), 1) AS foiz
FROM ecg_analyse_doctors;

\echo '=== 8. Shifokor xulosalari va kompleks AI xulosalar (oylik) ==='
SELECT to_char(created_at, 'YYYY-MM') AS oy, 'shifokor_xulosasi' AS tur, count(*) FROM analysis_diagnoses
WHERE created_at >= '2026-06-01' GROUP BY 1
UNION ALL
SELECT to_char(created_at, 'YYYY-MM'), 'kompleks_ai', count(*) FROM combined_analyses
WHERE created_at >= '2026-06-01' GROUP BY 1
ORDER BY 1, 2;

ROLLBACK;
