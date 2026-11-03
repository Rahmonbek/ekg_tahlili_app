using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Laboratoriya AI xarajatini kamaytirish (2026-11-03).
    ///
    ///  * `ai_usage` — har bir AI chaqiruvining tokenlari (kirish, keshlangan,
    ///    chiqish, fikrlash) va taxminiy narxi: qaysi bosqich (o'qish, nomlarni
    ///    bog'lash, xulosa, tasniflash) qancha turishini o'lchash uchun.
    ///    Python (`ai_usage.record`) yozadi, xato bo'lsa tahlilni to'xtatmaydi.
    ///  * `lab_value_aliases` — fayldagi ko'rsatkich nomi → katalog
    ///    (`lab_value_types`). Ikki bosqichli tahlilda AI ko'rsatkichni fayldagi
    ///    nomi bilan qaytaradi, kod uni shu jadval orqali bog'laydi; noma'lum
    ///    nomni arzon model bog'laydi va natija shu yerga yoziladi (`source =
    ///    'ai'`, `approved = false`). `value_type_id IS NULL` — "katalogda yo'q"
    ///    deb tekshirilgan nom (har safar qayta so'ralmasin). Kalit — namuna
    ///    turi + normallashtirilgan nom: "Глюкоза" qonda va siydikda boshqa
    ///    ko'rsatkich.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261105000000_AiUsageAndLabAliases")]
    public partial class AiUsageAndLabAliases : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ai_usage (
                    id               bigserial PRIMARY KEY,
                    created_at       timestamptz NOT NULL DEFAULT now(),
                    module           varchar(32) NOT NULL,
                    analysis_id      integer NULL,
                    step             varchar(32) NOT NULL,
                    model            varchar(64) NOT NULL,
                    service_tier     varchar(16) NULL,
                    input_tokens     integer NOT NULL DEFAULT 0,
                    cached_tokens    integer NOT NULL DEFAULT 0,
                    output_tokens    integer NOT NULL DEFAULT 0,
                    reasoning_tokens integer NOT NULL DEFAULT 0,
                    cost_usd         numeric(12, 6) NULL
                );
                CREATE INDEX IF NOT EXISTS ix_ai_usage_created ON ai_usage (created_at);
                CREATE INDEX IF NOT EXISTS ix_ai_usage_analysis ON ai_usage (module, analysis_id);

                CREATE TABLE IF NOT EXISTS lab_value_aliases (
                    id             serial PRIMARY KEY,
                    specimen       varchar(16) NOT NULL,
                    alias          varchar(200) NOT NULL,
                    value_type_id  integer NULL REFERENCES lab_value_types (id) ON DELETE CASCADE,
                    source         varchar(16) NOT NULL DEFAULT 'ai',
                    approved       boolean NOT NULL DEFAULT false,
                    hits           integer NOT NULL DEFAULT 0,
                    created_at     timestamptz NOT NULL DEFAULT now(),
                    updated_at     timestamptz NOT NULL DEFAULT now(),
                    CONSTRAINT ux_lab_value_aliases UNIQUE (specimen, alias)
                );");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS lab_value_aliases;
                DROP TABLE IF EXISTS ai_usage;");
        }
    }
}
