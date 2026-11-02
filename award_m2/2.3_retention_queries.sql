-- NMED | M2 2.3 — qaytib kelish (retention) dalillari uchun so'rovlar
-- FAQAT O'QISH (SELECT). Production bazada ishga tushiring va natijani yuboring.
-- O'chirilgan tahlillar (deleted_at) hisobga olinmaydi.

-- Barcha tahlillar bitta ro'yxatda
WITH a AS (
    SELECT 'ecg' AS kind, id, clinic_id, created_doctor_id, patient_id, created_at FROM ecg_analyses    WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'holter', id, clinic_id, created_doctor_id, patient_id, created_at FROM holter_analyses WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'smad',   id, clinic_id, created_doctor_id, patient_id, created_at FROM smad_analyses   WHERE deleted_at IS NULL
    UNION ALL
    SELECT 'lab',    id, clinic_id, created_doctor_id, patient_id, created_at FROM lab_analyses    WHERE deleted_at IS NULL
)

-- 1) Oylik hajm: klinika x tur (oxirgi 12 oy)
SELECT c.clinic_name,
       to_char(date_trunc('month', a.created_at), 'YYYY-MM') AS oy,
       a.kind,
       count(*)                       AS tahlillar,
       count(DISTINCT a.patient_id)   AS bemorlar,
       count(DISTINCT a.created_doctor_id) AS yuklovchilar,
       count(DISTINCT a.created_at::date)  AS faol_kunlar
FROM a LEFT JOIN clinics c ON c.id = a.clinic_id
WHERE a.created_at >= now() - interval '12 months'
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;

-- 2) Haftalik muntazamlik: oxirgi 8 hafta, klinika bo'yicha
WITH a AS (
    SELECT clinic_id, created_at FROM ecg_analyses    WHERE deleted_at IS NULL
    UNION ALL SELECT clinic_id, created_at FROM holter_analyses WHERE deleted_at IS NULL
    UNION ALL SELECT clinic_id, created_at FROM smad_analyses   WHERE deleted_at IS NULL
    UNION ALL SELECT clinic_id, created_at FROM lab_analyses    WHERE deleted_at IS NULL
), w AS (
    SELECT clinic_id, date_trunc('week', created_at) AS hafta,
           count(*) AS tahlillar, count(DISTINCT created_at::date) AS faol_kunlar
    FROM a WHERE created_at >= date_trunc('week', now()) - interval '8 weeks'
    GROUP BY 1, 2
)
SELECT c.clinic_name,
       count(*)                                        AS faol_haftalar_8dan,
       count(*) FILTER (WHERE w.faol_kunlar >= 3)      AS haftada_3kun_plus,
       round(avg(w.tahlillar), 1)                      AS haftalik_orta_tahlil,
       round(avg(w.faol_kunlar), 1)                    AS haftalik_orta_faol_kun
FROM w LEFT JOIN clinics c ON c.id = w.clinic_id
GROUP BY 1
ORDER BY 2 DESC;

-- 3) Bemor darajasida takror: nechta bemor 2+ marta tekshirilgan va oraliq
WITH a AS (
    SELECT 'ecg' AS kind, patient_id, created_at FROM ecg_analyses    WHERE deleted_at IS NULL
    UNION ALL SELECT 'holter', patient_id, created_at FROM holter_analyses WHERE deleted_at IS NULL
    UNION ALL SELECT 'smad',   patient_id, created_at FROM smad_analyses   WHERE deleted_at IS NULL
    UNION ALL SELECT 'lab',    patient_id, created_at FROM lab_analyses    WHERE deleted_at IS NULL
), p AS (
    SELECT patient_id,
           count(*)                         AS tahlillar,
           count(DISTINCT created_at::date) AS tashrif_kunlari,
           count(DISTINCT kind)             AS turlar
    FROM a GROUP BY 1
), g AS (   -- bir bemorning ketma-ket tashrif kunlari orasidagi kunlar
    SELECT patient_id,
           d - lag(d) OVER (PARTITION BY patient_id ORDER BY d) AS oraliq_kun
    FROM (SELECT DISTINCT patient_id, created_at::date AS d FROM a) x
)
SELECT (SELECT count(*) FROM p)                                  AS jami_bemor,
       (SELECT count(*) FROM p WHERE tashrif_kunlari >= 2)        AS ikki_va_kop_kun_kelgan,
       (SELECT count(*) FROM p WHERE turlar >= 2)                 AS ikki_va_kop_turdagi_tahlil,
       (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY oraliq_kun)
          FROM g WHERE oraliq_kun IS NOT NULL)                    AS takror_oraliq_mediana_kun;

-- 4) Shifokor/hamshira faolligi: oxirgi 4 haftada tizimga necha kun kirgan (audit log)
SELECT u.role_id,
       count(*)                                         AS foydalanuvchilar,
       count(*) FILTER (WHERE x.faol_kun >= 12)         AS haftada_3kun_plus_4hafta,
       round(avg(x.faol_kun), 1)                        AS orta_faol_kun_28dan
FROM (
    SELECT user_id, count(DISTINCT created_at::date) AS faol_kun
    FROM audit_logs
    WHERE user_id IS NOT NULL AND created_at >= now() - interval '28 days'
    GROUP BY 1
) x JOIN users u ON u.id = x.user_id
GROUP BY 1 ORDER BY 1;

-- 5) Kompleks AI xulosa va shifokor xulosasi — natijaga qaytish belgisi
SELECT (SELECT count(*) FROM combined_analyses)                        AS kompleks_jami,
       (SELECT count(*) FROM combined_analyses WHERE is_auto)          AS kompleks_avtomatik,
       (SELECT count(*) FROM analysis_diagnoses)                       AS shifokor_xulosalari;
