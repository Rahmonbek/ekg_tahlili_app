using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Boshlang'ich SuperAdmin hisobi (SA-01, `tasks-superadmin.md`).
    ///
    ///  * Login telefon bo'yicha (`doctors.phone`), shuning uchun `users` VA
    ///    `doctors` qatori birga yaratiladi. `doctors.firstname` bo'sh bo'lsa
    ///    frontend profil oynasini majburan ochardi — "Super Admin" yoziladi.
    ///  * Telefon `998900000000`, parol `1q2w3e` — loyiha egasi kirgach o'zi
    ///    almashtiradi. Xesh migratsiya ishlaganda BCrypt bilan hisoblanadi
    ///    (ochiq parol bazaga tushmaydi).
    ///  * Idempotent: shu telefonli foydalanuvchi bor bo'lsa hech narsa
    ///    qilinmaydi (qo'lda o'zgartirilgan parol qayta yozilmaydi).
    ///  * `clinic_id = NULL` — SuperAdmin hech bir klinikaga tegishli emas.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261106000000_SeedSuperAdmin")]
    public partial class SeedSuperAdmin : Migration
    {
        private const string Phone = "998900000000";

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var hash = BCrypt.Net.BCrypt.HashPassword("1q2w3e");

            migrationBuilder.Sql($@"
                DO $$
                DECLARE new_user_id integer;
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM doctors WHERE phone = '{Phone}') THEN
                        INSERT INTO users (email, password_hash, clinic_id, role_id, status,
                                           must_change_password, created_at, updated_at)
                        VALUES ('{Phone}@phone.nmed.local', '{hash}', NULL, 1, true,
                                false, now(), now())
                        RETURNING id INTO new_user_id;

                        INSERT INTO doctors (user_id, firstname, lastname, sure_name, gender, phone,
                                             average_rating, total_ratings, created_at, updated_at)
                        VALUES (new_user_id, 'Super', 'Admin', '', true, '{Phone}',
                                0, 0, now(), now());
                    END IF;
                END $$;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($@"
                CREATE TEMP TABLE _sa_ids AS
                    SELECT d.user_id AS id FROM doctors d
                    JOIN users u ON u.id = d.user_id
                    WHERE d.phone = '{Phone}' AND u.role_id = 1;
                DELETE FROM doctors WHERE user_id IN (SELECT id FROM _sa_ids);
                DELETE FROM users WHERE id IN (SELECT id FROM _sa_ids);
                DROP TABLE _sa_ids;");
        }
    }
}
