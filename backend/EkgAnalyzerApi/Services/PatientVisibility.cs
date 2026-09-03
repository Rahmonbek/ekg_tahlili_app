using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Models;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// "Bu foydalanuvchi qaysi bemorlarni RO'YXATLARDA ko'radi?" degan
/// savolga javob beradigan yagona joy.
///
/// Nima uchun alohida: shu qoida ikkita mustaqil ro'yxatda kerak —
/// bemorlar ro'yxati (<see cref="PatcientService"/>) va kompleks AI
/// xulosalari ro'yxati (<see cref="CombinedAnalysisService"/>). Ikkala
/// joyda alohida yozilsa, biri o'zgarganda ikkinchisi eskirib qolardi
/// va rollar orasidagi farq jimgina buzilardi.
///
/// <para>
/// <b>Diqqat:</b> bu cheklov faqat RO'YXATLARGA tegishli. Bemor kartasi,
/// tahlil yuklash sahifasidagi "oldingi tahlillar" bo'limi va passport
/// bo'yicha qidiruv ATAYLAB filtrlanmaydi — u yerda to'rttala rol ham
/// bazadagi barcha ma'lumotni ko'radi (loyiha egasining qarori).
/// </para>
/// </summary>
public static class PatientVisibility
{
    /// <summary>
    /// Foydalanuvchi ro'yxatlarda ko'ra oladigan bemorlar ID lari.
    ///
    /// <list type="bullet">
    /// <item>Shifokor (4) — o'zi yuklagan <b>yoki</b> o'ziga davolovchi
    /// shifokor sifatida biriktirilgan tahlillarning bemorlari;</item>
    /// <item>Hamshira (5) — faqat o'zi yuklagan tahlillarning bemorlari;</item>
    /// <item>Admin / Direktor va boshqalar — klinika xodimlari yuklagan
    /// barcha tahlillarning bemorlari.</item>
    /// </list>
    ///
    /// Natija <see cref="IQueryable{T}"/> — u chaqiruvchi so'rov ichida
    /// pastki so'rov sifatida bajariladi va bazadan ortiqcha ma'lumot
    /// tortilmaydi.
    /// </summary>
    /// <param name="user">
    /// <c>Doctor</c> navigatsiyasi yuklangan bo'lishi kerak
    /// (<c>Include(u =&gt; u.Doctor)</c>) — aks holda shifokor/hamshira
    /// klinika tarmog'iga tushib qoladi.
    /// </param>
    public static IQueryable<int> VisiblePatientIds(MedDataDB context, User user)
    {
        if (user.RoleId == RoleConstants.Doctor && user.Doctor != null)
        {
            var doctorId = user.Doctor.Id;
            return CreatedBy(context, doctorId)
                .Union(context.ECGAnalyseDoctor
                    .Where(x => x.DoctorId == doctorId)
                    .Select(x => x.ECGAnalyse.PatcientId))
                .Union(context.LabAnalyseDoctor
                    .Where(x => x.DoctorId == doctorId)
                    .Select(x => x.LabAnalyse.PatcientId))
                .Union(context.HolterAnalyseDoctor
                    .Where(x => x.DoctorId == doctorId)
                    .Select(x => x.HolterAnalyse.PatcientId))
                .Union(context.SmadAnalyseDoctor
                    .Where(x => x.DoctorId == doctorId)
                    .Select(x => x.SmadAnalyse.PatcientId))
                .Union(context.MedicalDiagnose
                    .Where(x => x.MainDoctorId == doctorId)
                    .Select(x => x.PatcientId));
        }

        if (user.RoleId == RoleConstants.Nurse && user.Doctor != null)
            return CreatedBy(context, user.Doctor.Id);

        var clinicId = user.ClinicId;
        return context.ECGAnalyse
                .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId)
            .Union(context.LabAnalyse
                .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId))
            .Union(context.HolterAnalyses
                .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId))
            .Union(context.SmadAnalyses
                .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId))
            .Union(context.MedicalDiagnose
                .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId));
    }

    /// <summary>Shu xodim O'ZI yuklagan tahlillarning bemorlari.</summary>
    private static IQueryable<int> CreatedBy(MedDataDB context, int doctorId) =>
        context.ECGAnalyse
                .Where(x => x.CreatedDoctorId == doctorId).Select(x => x.PatcientId)
            .Union(context.LabAnalyse
                .Where(x => x.CreatedDoctorId == doctorId).Select(x => x.PatcientId))
            .Union(context.HolterAnalyses
                .Where(x => x.CreatedDoctorId == doctorId).Select(x => x.PatcientId))
            .Union(context.SmadAnalyses
                .Where(x => x.CreatedDoctorId == doctorId).Select(x => x.PatcientId))
            .Union(context.MedicalDiagnose
                .Where(x => x.CreatedDoctorId == doctorId).Select(x => x.PatcientId));
}
