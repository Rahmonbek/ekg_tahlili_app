using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260831000000_AddFileHashToAnalyses")]
    /// <summary>
    /// Tahlil jadvallariga yuklangan faylning SHA-256 xeshini qo'shadi (T-096).
    ///
    /// Nima uchun kerak: auditda bitta `ecg_test.jpg` fayli besh marta
    /// yuklangani va har safar yangi tahlil yozuvi yaratilgani aniqlandi —
    /// bir xil bemor uchun, bir xil sana bilan, hech qanday ogohlantirishsiz.
    /// Amalda bu doim uchraydi: laborant sekin internetda tugmani ikki marta
    /// bosadi yoki "xato bo'ldi" deb o'ylab qaytadan yuklaydi. Natijada
    /// bemor kartasida bir xil EKG bir necha marta turadi va har biri sun'iy
    /// intellektga alohida yuboriladi — xarajat ham shuncha barobar oshadi.
    ///
    /// Fayl nomi bo'yicha solishtirish ishlamaydi: nom o'zgarishi mumkin,
    /// mazmuni esa bir xil qolaveradi. Xesh aynan mazmunni taqqoslaydi.
    ///
    /// Indeks (patcient_id, file_hash) bo'yicha — takrorni qidirish har doim
    /// shu ikkalasi bilan cheklanadi: boshqa bemorning bir xil fayli takror
    /// emas, u alohida holat (masalan bitta apparatdan chiqqan namuna).
    /// `file_hash IS NOT NULL` qisman sharti bilan: migratsiyadan oldingi
    /// yozuvlarda xesh yo'q va ular indeksni bekorga kattalashtirmasin.
    /// </summary>
    public partial class AddFileHashToAnalyses : Migration
    {
        private static readonly string[] Tables =
        {
            "ecg_analyses",
            "lab_analyses",
            "holter_analyses",
            "smad_analyses",
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($@"
ALTER TABLE {table} ADD COLUMN IF NOT EXISTS file_hash varchar(64) NULL;

CREATE INDEX IF NOT EXISTS ix_{table}_patcient_file_hash
    ON {table} (patcient_id, file_hash)
    WHERE file_hash IS NOT NULL;
");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($@"
DROP INDEX IF EXISTS ix_{table}_patcient_file_hash;
ALTER TABLE {table} DROP COLUMN IF EXISTS file_hash;
");
            }
        }
    }
}
