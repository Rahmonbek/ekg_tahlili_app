using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Laboratoriya klinik qoidalari natijalari ("xavf signallari") —
    /// "NMED laboratoriya klinik qoidalari" spetsifikatsiyasi (2026-11-01).
    ///
    ///  * `lab_rule_signals` — bitta (klinika, bemor, qoida) uchun oxirgi baho:
    ///    holat (CRITICAL / CRITERIA_MET / SUSPECTED / MONITOR /
    ///    INSUFFICIENT_DATA), dalillar (qiymatlar, sanalar, chegara), vaqt
    ///    bo'yicha o'zgarish, yetishmayotgan ma'lumot, shifokorga xabar va
    ///    tavsiya. Shifokor signalni tasdiqlaydi yoki rad etadi
    ///    (`reviewer_status`). Signal hech qachon yakuniy tashxis emas.
    ///  * `lab_rule_patient_state` — qaysi bemor qaysi qoidalar versiyasi va
    ///    qaysi qiymatlar to'plami bilan baholangani (worker faqat o'zgargan
    ///    bemorlarni qayta hisoblaydi; qoidalar versiyasi o'zgarsa — hammasini).
    ///
    /// Baho klinika kesimida: bemorning faqat SHU klinikada yuklangan tahlillari.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261102020000_LabRuleSignals")]
    public partial class LabRuleSignals : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS lab_rule_signals (
                    id                  bigserial    PRIMARY KEY,
                    clinic_id           integer      NOT NULL REFERENCES clinics (id) ON DELETE CASCADE,
                    patient_id          integer      NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
                    rule_id             varchar(16)  NOT NULL,
                    status              varchar(20)  NOT NULL,
                    severity            smallint     NOT NULL DEFAULT 1,
                    title_uz            varchar(200) NOT NULL,
                    message_uz          text         NOT NULL,
                    recommendation_uz   text,
                    evidence            jsonb        NOT NULL DEFAULT '[]'::jsonb,
                    temporal            jsonb,
                    missing_data        jsonb        NOT NULL DEFAULT '[]'::jsonb,
                    latest_analysis_id  integer      REFERENCES lab_analyses (id) ON DELETE SET NULL,
                    observed_at         timestamptz,
                    source_version      varchar(32)  NOT NULL,
                    evaluated_at        timestamptz  NOT NULL DEFAULT NOW(),
                    reviewer_status     varchar(12)  NOT NULL DEFAULT 'pending',
                    reviewed_by_user_id integer      REFERENCES users (id) ON DELETE SET NULL,
                    reviewed_at         timestamptz,
                    review_note         varchar(1000),
                    CONSTRAINT ux_lab_rule_signals_patient_rule UNIQUE (clinic_id, patient_id, rule_id)
                );
                CREATE INDEX IF NOT EXISTS ix_lab_rule_signals_clinic_status
                    ON lab_rule_signals (clinic_id, status, severity);
                CREATE INDEX IF NOT EXISTS ix_lab_rule_signals_clinic_rule
                    ON lab_rule_signals (clinic_id, rule_id);

                CREATE TABLE IF NOT EXISTS lab_rule_patient_state (
                    clinic_id      integer      NOT NULL REFERENCES clinics (id) ON DELETE CASCADE,
                    patient_id     integer      NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
                    rules_version  varchar(32)  NOT NULL,
                    last_value_id  bigint       NOT NULL DEFAULT 0,
                    values_count   integer      NOT NULL DEFAULT 0,
                    evaluated_at   timestamptz  NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (clinic_id, patient_id)
                );");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS lab_rule_patient_state;
                DROP TABLE IF EXISTS lab_rule_signals;");
        }
    }
}
