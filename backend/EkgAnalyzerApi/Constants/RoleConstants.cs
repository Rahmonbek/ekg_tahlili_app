namespace EkgAnalyzerApi.Constants
{
    /// <summary>
    /// Tizim rollari uchun konstantalar.
    /// Baza dagi `roles` jadvalidagi ID larga mos keladi.
    /// Yangi rol qo'shilganda shu yerga ham qo'shing.
    /// </summary>
    public static class RoleConstants
    {
        public const int SuperAdmin = 1;
        public const int Admin = 2;
        public const int Director = 3;
        public const int Doctor = 4;
        public const int Nurse = 5;

        /// <summary>
        /// Rolning matnli nomi — JWT dagi <c>ClaimTypes.Role</c> ga shu yoziladi.
        /// <c>[Authorize(Roles = "SuperAdmin")]</c> kabi atributlar shu nomlarga tayanadi.
        /// </summary>
        public static string Name(int roleId) => roleId switch
        {
            SuperAdmin => nameof(SuperAdmin),
            Admin      => nameof(Admin),
            Director   => nameof(Director),
            Doctor     => nameof(Doctor),
            Nurse      => nameof(Nurse),
            _          => "Unknown"
        };

        // ─── Avtorizatsiya siyosatlari (Program.cs da ro'yxatdan o'tkaziladi) ───

        /// <summary>Klinika boshqaruvi: Admin va Direktor.</summary>
        public const string PolicyClinicManager = "ClinicManager";

        /// <summary>Faqat shifokor (rol 4).</summary>
        public const string PolicyDoctorOnly = "DoctorOnly";

        /// <summary>Faqat hamshira (rol 5).</summary>
        public const string PolicyNurseOnly = "NurseOnly";

        /// <summary>Tibbiyot xodimi: shifokor yoki hamshira.</summary>
        public const string PolicyMedicalStaff = "MedicalStaff";

        /// <summary>Faqat SuperAdmin.</summary>
        public const string PolicySuperAdmin = "SuperAdminOnly";
    }
}
