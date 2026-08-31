using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260831020000_AddMustChangePassword")]
    /// <summary>
    /// Administrator yaratgan vaqtinchalik parolni birinchi kirishda
    /// almashtirishni talab qiladi (T-022).
    ///
    /// Nima uchun kerak: xodim akkauntini admin yaratadi va parolni
    /// unga og'zaki yoki xabar orqali aytadi. Bu parol amalda hech
    /// qachon almashtirilmaydi — auditda bazada `1` parolli to'rtta
    /// xodim topilgani buning bevosita natijasi.
    ///
    /// Parol siyosati (kamida 8 belgi, harf va raqam) endi bunday
    /// parolni yaratishga yo'l qo'ymaydi, lekin admin bilgan parol
    /// bilan xodim akkauntiga kirish imkoniyati baribir qoladi. Bayroq
    /// shu bo'shliqni yopadi.
    ///
    /// Sukut qiymati `false`: mavjud foydalanuvchilar o'z parollarini
    /// almashtirishga majbur qilinmaydi, aks holda migratsiyadan keyin
    /// hamma birdan tizimdan chiqib qolardi.
    /// </summary>
    public partial class AddMustChangePassword : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;");
        }
    }
}
