using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── ECG tahlillari ─────────────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "document_number",
                table: "ecg_analyses",
                type: "text",
                nullable: true);

            // ── SMAD tahlillari ────────────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "document_number",
                table: "smad_analyses",
                type: "text",
                nullable: true);

            // ── Holter tahlillari ──────────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "document_number",
                table: "holter_analyses",
                type: "text",
                nullable: true);

            // ── Laboratoriya tahlillari ────────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "document_number",
                table: "lab_analyses",
                type: "text",
                nullable: true);

            // ── Parazitologiya tahlillari ──────────────────────────────────
            migrationBuilder.AddColumn<string>(
                name: "document_number",
                table: "parasitology_analyses",
                type: "text",
                nullable: true);

            // ── Klinika faollik statusi ────────────────────────────────────
            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "clinics",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // ── Mavjud tahlillar uchun document_number retrospektiv to'ldirish ──
            // ECG
            migrationBuilder.Sql(@"
                UPDATE ecg_analyses
                SET document_number = 'NMED-EKG-' || LPAD(id::text, 8, '0')
                WHERE document_number IS NULL;
            ");

            // SMAD
            migrationBuilder.Sql(@"
                UPDATE smad_analyses
                SET document_number = 'NMED-SMAD-' || LPAD(id::text, 8, '0')
                WHERE document_number IS NULL;
            ");

            // Holter
            migrationBuilder.Sql(@"
                UPDATE holter_analyses
                SET document_number = 'NMED-HOL-' || LPAD(id::text, 8, '0')
                WHERE document_number IS NULL;
            ");

            // Lab
            migrationBuilder.Sql(@"
                UPDATE lab_analyses
                SET document_number = 'NMED-LAB-' || LPAD(id::text, 8, '0')
                WHERE document_number IS NULL;
            ");

            // Parazitologiya
            migrationBuilder.Sql(@"
                UPDATE parasitology_analyses
                SET document_number = 'NMED-PARA-' || LPAD(id::text, 8, '0')
                WHERE document_number IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "document_number", table: "ecg_analyses");
            migrationBuilder.DropColumn(name: "document_number", table: "smad_analyses");
            migrationBuilder.DropColumn(name: "document_number", table: "holter_analyses");
            migrationBuilder.DropColumn(name: "document_number", table: "lab_analyses");
            migrationBuilder.DropColumn(name: "document_number", table: "parasitology_analyses");
            migrationBuilder.DropColumn(name: "is_active",        table: "clinics");
        }
    }
}
