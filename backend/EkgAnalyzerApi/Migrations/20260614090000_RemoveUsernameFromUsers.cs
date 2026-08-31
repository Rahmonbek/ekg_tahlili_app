using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260614090000_RemoveUsernameFromUsers")]
    /// <summary>
    /// `users.username` ustunini o'chiradi (T-008).
    ///
    /// Bu fayl allaqachon mavjud edi, lekin `[DbContext]` va `[Migration]`
    /// atributlari yo'q edi — ularsiz EF Core migratsiyani umuman
    /// ko'rmaydi. Natijada `__EFMigrationsHistory` da bu migratsiya yo'q
    /// va ustun bazada qolib ketgan.
    ///
    /// Ustun xavfsiz o'chiriladi: `User` modelida bunday xossa yo'q va
    /// bazada uni to'ldirilgan bironta yozuv ham topilmadi (0 ta).
    /// </summary>
    public partial class RemoveUsernameFromUsers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'username'
    ) THEN
        ALTER TABLE users DROP COLUMN username;
    END IF;
END $$;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username text NOT NULL DEFAULT '';
    END IF;
END $$;
");
        }
    }
}
