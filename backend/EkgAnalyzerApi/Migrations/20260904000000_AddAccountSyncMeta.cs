using System;
using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// `account_sync_meta` jadvalini yaratadi.
    ///
    /// Qo'lda yozilgan: EF snapshot eskirgan bo'lgani uchun `dotnet ef` avtomatik
    /// scaffold ortiqcha (allaqachon qo'llangan) o'zgarishlarni ham qayta bajarishga
    /// urinardi. Bu migratsiya FAQAT yangi jadvalni yaratadi.
    ///
    /// `[DbContext]`/`[Migration]` atributlari SHART — busiz `Database.Migrate()`
    /// migratsiyani jimgina o'tkazib yuboradi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260904000000_AddAccountSyncMeta")]
    public partial class AddAccountSyncMeta : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "account_sync_meta",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ref_id = table.Column<int>(type: "integer", nullable: false),
                    ref_key = table.Column<string>(type: "text", nullable: true),
                    data_value = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_account_sync_meta", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_account_sync_meta_ref_id",
                table: "account_sync_meta",
                column: "ref_id",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "account_sync_meta");
        }
    }
}
