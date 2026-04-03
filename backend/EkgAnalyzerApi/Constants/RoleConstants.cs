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
    }
}
