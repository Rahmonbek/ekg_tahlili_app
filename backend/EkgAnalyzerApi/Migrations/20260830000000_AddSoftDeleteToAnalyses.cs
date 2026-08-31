using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260830000000_AddSoftDeleteToAnalyses")]
    /// <summary>
    /// Tahlil jadvallariga yumshoq o'chirish (soft delete) ustunlarini qo'shadi.
    ///
    /// Nima uchun fizik o'chirish emas: tibbiy yozuv — huquqiy hujjat.
    /// Noto'g'ri biriktirilgan yoki xato fayl bilan yaratilgan tahlilni
    /// ro'yxatdan olib tashlash kerak, lekin yozuvning o'zi (kim yaratgan,
    /// qachon, kim va nima sababdan o'chirgan) auditda saqlanishi shart.
    ///
    /// Ustunlar:
    ///   deleted_at         — o'chirilgan vaqt (NULL = faol yozuv)
    ///   deleted_by_user_id — kim o'chirgan (users.id)
    ///   delete_reason      — sabab (majburiy, kamida 5 belgi — kodda tekshiriladi)
    ///
    /// Qisman indeks `deleted_at IS NULL` bo'yicha: ro'yxat so'rovlari
    /// deyarli har doim faqat faol yozuvlarni so'raydi.
    /// </summary>
    public partial class AddSoftDeleteToAnalyses : Migration
    {
        private static readonly string[] Tables =
        {
            "ecg_analyses",
            "lab_analyses",
            "holter_analyses",
            "smad_analyses",
            "medical_diagnoses",
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($@"
ALTER TABLE {table} ADD COLUMN IF NOT EXISTS deleted_at         timestamptz NULL;
ALTER TABLE {table} ADD COLUMN IF NOT EXISTS deleted_by_user_id integer     NULL;
ALTER TABLE {table} ADD COLUMN IF NOT EXISTS delete_reason      text        NULL;

CREATE INDEX IF NOT EXISTS ix_{table}_active
    ON {table} (clinic_id)
    WHERE deleted_at IS NULL;
");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($@"
DROP INDEX IF EXISTS ix_{table}_active;
ALTER TABLE {table} DROP COLUMN IF EXISTS delete_reason;
ALTER TABLE {table} DROP COLUMN IF EXISTS deleted_by_user_id;
ALTER TABLE {table} DROP COLUMN IF EXISTS deleted_at;
");
            }
        }
    }
}
