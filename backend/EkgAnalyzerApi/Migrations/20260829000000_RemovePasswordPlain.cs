using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260829000000_RemovePasswordPlain")]
    /// <summary>
    /// `users.password_plain` ustunini o'chiradi.
    ///
    /// Bu ustunda foydalanuvchilarning parollari OCHIQ MATNDA saqlanardi
    /// (BCrypt hash bilan yonma-yon) va u xodimlar ro'yxati sahifasida
    /// "Parol" ustuni sifatida ekranda ko'rsatilardi.
    ///
    /// Bazaga bir marta kirish (SQL injection, backup o'g'irlash, insayder)
    /// barcha parollarni ochiq berardi va `password_hash` dagi BCrypt
    /// butunlay ma'nosiz bo'lib qolardi.
    ///
    /// MUHIM: bu migratsiyadan keyin barcha foydalanuvchilar parollarini
    /// kompromentatsiya qilingan deb hisoblab, almashtirishlari kerak.
    /// Eski baza backup'larida ham ochiq parollar borligini unutmang.
    /// </summary>
    public partial class RemovePasswordPlain : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'password_plain'
    ) THEN
        -- Avval qiymatlarni tozalaymiz: ALTER TABLE ... DROP COLUMN
        -- ma'lumotni darhol fizik o'chirmasligi mumkin (dead tuple sifatida qoladi).
        UPDATE users SET password_plain = NULL;
        ALTER TABLE users DROP COLUMN password_plain;
    END IF;
END $$;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Ustun qaytariladi, lekin ma'lumot QAYTARILMAYDI — bu ataylab shunday.
            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'password_plain'
    ) THEN
        ALTER TABLE users ADD COLUMN password_plain text;
    END IF;
END $$;
");
        }
    }
}
