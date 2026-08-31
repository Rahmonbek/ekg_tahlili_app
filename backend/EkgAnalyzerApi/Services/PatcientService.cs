using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using iTextSharp.text;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class PatcientService
    {
        private readonly MedDataDB _context;
        private readonly EncryptionService _encryption;
        public PatcientService(MedDataDB context, EncryptionService encryption)
        {
            _context = context;
            _encryption = encryption;

        }

        /// <summary>
        /// Klinika (yoki shifokor) ko'ra oladigan bemorlar ro'yxati.
        ///
        /// Muhim tuzatishlar:
        ///  * Ilgari faqat EKG / Laboratoriya / Tibbiy xulosa hisobga olinardi —
        ///    faqat Holter yoki SMAD tahlili bo'lgan bemor ro'yxatga umuman
        ///    tushmasdi. Endi to'rttala tahlil turi ham hisobga olinadi.
        ///  * Passport bazada shifrlangan; u serverda deshifrlanib DARHOL
        ///    maskalanadi — to'liq seriya mijozga hech qachon yuborilmaydi.
        ///  * `search` bo'yicha ism/familiya/otasining ismi/telefon qidiriladi.
        /// </summary>
        public async Task<PatcientListDTO> GetPatcientsAsync(
            int pageNumber, int user_id, string? search = null, string lang = "uz")
        {
            var user = await _context.Users.Include(u => u.Doctor)
                .FirstOrDefaultAsync(x => x.Id == user_id);

            if (user == null)
                return new PatcientListDTO();

            const int pageSize = 10;

            IQueryable<Patcient> patcientsQuery = _context.Patcients.AsNoTracking();

            IQueryable<int> visibleIds;

            if (user.RoleId == RoleConstants.Doctor && user.Doctor != null)
            {
                // Shifokor: faqat o'ziga biriktirilgan tahlillarning bemorlari
                var doctorId = user.Doctor.Id;
                visibleIds = _context.ECGAnalyseDoctor
                        .Where(x => x.DoctorId == doctorId)
                        .Select(x => x.ECGAnalyse.PatcientId)
                    .Union(_context.LabAnalyseDoctor
                        .Where(x => x.DoctorId == doctorId)
                        .Select(x => x.LabAnalyse.PatcientId))
                    .Union(_context.HolterAnalyseDoctor
                        .Where(x => x.DoctorId == doctorId)
                        .Select(x => x.HolterAnalyse.PatcientId))
                    .Union(_context.SmadAnalyseDoctor
                        .Where(x => x.DoctorId == doctorId)
                        .Select(x => x.SmadAnalyse.PatcientId))
                    .Union(_context.MedicalDiagnose
                        .Where(x => x.MainDoctorId == doctorId)
                        .Select(x => x.PatcientId));
            }
            else
            {
                // Admin / direktor / hamshira: klinikaning barcha bemorlari
                var clinicId = user.ClinicId;
                visibleIds = _context.ECGAnalyse
                        .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId)
                    .Union(_context.LabAnalyse
                        .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId))
                    .Union(_context.HolterAnalyses
                        .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId))
                    .Union(_context.SmadAnalyses
                        .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId))
                    .Union(_context.MedicalDiagnose
                        .Where(x => x.ClinicId == clinicId).Select(x => x.PatcientId));
            }

            patcientsQuery = patcientsQuery.Where(p => visibleIds.Contains(p.Id));

            if (!string.IsNullOrWhiteSpace(search))
            {
                // Passport shifrlangan (tasodifiy IV) — SQL LIKE ishlamaydi,
                // shuning uchun bu yerda faqat ism va telefon bo'yicha qidiriladi.
                // Passport bo'yicha qidiruv alohida endpoint orqali amalga oshiriladi.
                var term = search.Trim().ToLower();
                patcientsQuery = patcientsQuery.Where(p =>
                    (p.FirstName != null && p.FirstName.ToLower().Contains(term)) ||
                    (p.LastName != null && p.LastName.ToLower().Contains(term)) ||
                    (p.SureName != null && p.SureName.ToLower().Contains(term)) ||
                    (p.Phone != null && p.Phone.Contains(term)));
            }

            var totalpatcients = await patcientsQuery.CountAsync();
            var totalPages = (int)Math.Ceiling(totalpatcients / (double)pageSize);

            var ownClinicId = user.ClinicId;

            var rows = await patcientsQuery
                .Select(p => new
                {
                    p.Id,
                    p.Passport,
                    p.BirthDate,
                    p.FirstName,
                    p.LastName,
                    p.SureName,
                    p.Phone,
                    p.Address,
                    p.Gender,
                    RegionUz = p.District != null ? p.District.Region.NameUz : null,
                    RegionRu = p.District != null ? p.District.Region.NameRu : null,
                    RegionEn = p.District != null ? p.District.Region.NameEn : null,
                    DistrictUz = p.District != null ? p.District.NameUz : null,
                    DistrictRu = p.District != null ? p.District.NameRu : null,
                    DistrictEn = p.District != null ? p.District.NameEn : null,

                    EcgCount = _context.ECGAnalyse.Count(a => a.PatcientId == p.Id && a.ClinicId == ownClinicId),
                    LabCount = _context.LabAnalyse.Count(a => a.PatcientId == p.Id && a.ClinicId == ownClinicId),
                    HolterCount = _context.HolterAnalyses.Count(a => a.PatcientId == p.Id && a.ClinicId == ownClinicId),
                    SmadCount = _context.SmadAnalyses.Count(a => a.PatcientId == p.Id && a.ClinicId == ownClinicId),

                    LastEcg = _context.ECGAnalyse.Where(a => a.PatcientId == p.Id && a.ClinicId == ownClinicId).Max(a => a.CreatedAt),
                    LastLab = _context.LabAnalyse.Where(a => a.PatcientId == p.Id && a.ClinicId == ownClinicId).Max(a => a.CreatedAt),
                    LastHolter = _context.HolterAnalyses.Where(a => a.PatcientId == p.Id && a.ClinicId == ownClinicId).Max(a => a.CreatedAt),
                    LastSmad = _context.SmadAnalyses.Where(a => a.PatcientId == p.Id && a.ClinicId == ownClinicId).Max(a => a.CreatedAt),
                })
                .ToListAsync();

            var items = rows
                .Select(r =>
                {
                    var candidates = new[] { r.LastEcg, r.LastLab, r.LastHolter, r.LastSmad }
                        .Where(d => d.HasValue)
                        .Select(d => d!.Value)
                        .ToList();

                    return new PatcientListItemDTO
                    {
                        Id = r.Id,
                        FirstName = r.FirstName,
                        LastName = r.LastName,
                        SureName = r.SureName,
                        PassportMasked = MaskPassport(TryDecrypt(r.Passport)),
                        BirthDate = r.BirthDate,
                        Gender = r.Gender,
                        Phone = r.Phone,
                        Address = r.Address,
                        RegionName = Localized(lang, r.RegionUz, r.RegionRu, r.RegionEn),
                        DistrictName = Localized(lang, r.DistrictUz, r.DistrictRu, r.DistrictEn),
                        AnalysesCount = r.EcgCount + r.LabCount + r.HolterCount + r.SmadCount,
                        LastAnalysisAt = candidates.Count == 0 ? (DateTime?)null : candidates.Max(),
                    };
                })
                // Saralash xotirada: oxirgi tahlil sanasi bo'yicha, yangisi yuqorida
                .OrderByDescending(x => x.LastAnalysisAt ?? DateTime.MinValue)
                .ThenBy(x => x.LastName)
                .Skip((Math.Max(pageNumber, 1) - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return new PatcientListDTO
            {
                data = items,
                TotalCount = totalpatcients,
                TotalPages = totalPages
            };
        }

        /// <summary>
        /// Bitta bemorning kartasi: shaxsiy ma'lumotlar + EKG/Holter/SMAD/Laboratoriya/
        /// shifokor xulosalari yagona xronologik lentada.
        ///
        /// Ko'rish huquqi: admin/direktor/hamshira — o'z klinikasi yozuvlari;
        /// shifokor — faqat o'ziga biriktirilgan yozuvlar. Boshqa klinikaning
        /// bemori so'ralsa `null` qaytadi (kontroller 404 beradi).
        /// </summary>
        public async Task<PatientCardDTO?> GetPatientCardAsync(int patientId, int user_id, string lang = "uz")
        {
            var user = await _context.Users.Include(u => u.Doctor)
                .FirstOrDefaultAsync(x => x.Id == user_id);
            if (user == null) return null;

            var isDoctor = user.RoleId == RoleConstants.Doctor && user.Doctor != null;
            var doctorId = user.Doctor?.Id ?? 0;
            var clinicId = user.ClinicId;

            var patient = await _context.Patcients.AsNoTracking()
                .Include(p => p.District!).ThenInclude(d => d.Region!)
                .FirstOrDefaultAsync(p => p.Id == patientId);
            if (patient == null) return null;

            var timeline = new List<PatientTimelineItemDTO>();

            var ecg = await _context.ECGAnalyse.AsNoTracking()
                .Where(a => a.PatcientId == patientId && a.ClinicId == clinicId)
                .Where(a => !isDoctor || a.Doctors!.Any(d => d.DoctorId == doctorId))
                .Select(a => new { a.Id, a.DocumentNumber, a.CreatedAt, a.AnalysisDate, a.Status, a.AIAnswerData,
                    Doctor = a.CreatedDoctor.LastName + " " + a.CreatedDoctor.FirstName })
                .ToListAsync();
            timeline.AddRange(ecg.Select(a => new PatientTimelineItemDTO
            {
                Type = "ecg", Id = a.Id, DocumentNumber = a.DocumentNumber, CreatedAt = a.CreatedAt,
                AnalysisDate = a.AnalysisDate, Status = a.Status,
                Severity = AiSeverity.Parse(a.AIAnswerData), DoctorName = a.Doctor
            }));

            var holter = await _context.HolterAnalyses.AsNoTracking()
                .Where(a => a.PatcientId == patientId && a.ClinicId == clinicId)
                .Where(a => !isDoctor || a.Doctors!.Any(d => d.DoctorId == doctorId))
                .Select(a => new { a.Id, a.DocumentNumber, a.CreatedAt, a.AnalysisDate, a.Status, a.AIAnswerData,
                    Doctor = a.CreatedDoctor.LastName + " " + a.CreatedDoctor.FirstName })
                .ToListAsync();
            timeline.AddRange(holter.Select(a => new PatientTimelineItemDTO
            {
                Type = "holter", Id = a.Id, DocumentNumber = a.DocumentNumber, CreatedAt = a.CreatedAt,
                AnalysisDate = a.AnalysisDate, Status = a.Status,
                Severity = AiSeverity.Parse(a.AIAnswerData), DoctorName = a.Doctor
            }));

            var smad = await _context.SmadAnalyses.AsNoTracking()
                .Where(a => a.PatcientId == patientId && a.ClinicId == clinicId)
                .Where(a => !isDoctor || a.Doctors!.Any(d => d.DoctorId == doctorId))
                .Select(a => new { a.Id, a.DocumentNumber, a.CreatedAt, a.AnalysisDate, a.Status, a.AIAnswerData,
                    Doctor = a.CreatedDoctor.LastName + " " + a.CreatedDoctor.FirstName })
                .ToListAsync();
            timeline.AddRange(smad.Select(a => new PatientTimelineItemDTO
            {
                Type = "smad", Id = a.Id, DocumentNumber = a.DocumentNumber, CreatedAt = a.CreatedAt,
                AnalysisDate = a.AnalysisDate, Status = a.Status,
                Severity = AiSeverity.Parse(a.AIAnswerData), DoctorName = a.Doctor
            }));

            var lab = await _context.LabAnalyse.AsNoTracking()
                .Where(a => a.PatcientId == patientId && a.ClinicId == clinicId)
                .Where(a => !isDoctor || a.Doctors!.Any(d => d.DoctorId == doctorId))
                .Select(a => new { a.Id, a.DocumentNumber, a.CreatedAt, a.AnalysisDate, a.Status, a.AIAnswerData,
                    Doctor = a.CreatedDoctor.LastName + " " + a.CreatedDoctor.FirstName })
                .ToListAsync();
            timeline.AddRange(lab.Select(a => new PatientTimelineItemDTO
            {
                Type = "lab", Id = a.Id, DocumentNumber = a.DocumentNumber, CreatedAt = a.CreatedAt,
                AnalysisDate = a.AnalysisDate, Status = a.Status,
                Severity = AiSeverity.Parse(a.AIAnswerData), DoctorName = a.Doctor
            }));

            var diagnoses = await _context.MedicalDiagnose.AsNoTracking()
                .Where(a => a.PatcientId == patientId && a.ClinicId == clinicId)
                .Where(a => !isDoctor || a.MainDoctorId == doctorId)
                .Select(a => new { a.Id, a.CreatedAt,
                    Doctor = a.MainDoctor.LastName + " " + a.MainDoctor.FirstName })
                .ToListAsync();
            timeline.AddRange(diagnoses.Select(a => new PatientTimelineItemDTO
            {
                Type = "diagnose", Id = a.Id, CreatedAt = a.CreatedAt, DoctorName = a.Doctor
            }));

            // Bemor bu foydalanuvchiga umuman ko'rinmasa — mavjud emas deb hisoblaymiz.
            // Aks holda ID ni terib boshqa klinika bemorining F.I.SH ini bilib olish mumkin edi.
            if (timeline.Count == 0) return null;

            return new PatientCardDTO
            {
                Id = patient.Id,
                FirstName = patient.FirstName,
                LastName = patient.LastName,
                SureName = patient.SureName,
                PassportMasked = MaskPassport(TryDecrypt(patient.Passport)),
                BirthDate = patient.BirthDate,
                Gender = patient.Gender,
                Phone = patient.Phone,
                Address = patient.Address,
                RegionName = patient.District == null ? null
                    : Localized(lang, patient.District.Region.NameUz, patient.District.Region.NameRu, patient.District.Region.NameEn),
                DistrictName = patient.District == null ? null
                    : Localized(lang, patient.District.NameUz, patient.District.NameRu, patient.District.NameEn),
                EcgCount = ecg.Count,
                HolterCount = holter.Count,
                SmadCount = smad.Count,
                LabCount = lab.Count,
                DiagnoseCount = diagnoses.Count,
                Timeline = timeline
                    .OrderByDescending(x => x.AnalysisDate ?? x.CreatedAt ?? DateTime.MinValue)
                    .ToList(),
            };
        }

        private static string? Localized(string lang, string? uz, string? ru, string? en) => lang switch
        {
            "ru" => ru ?? uz,
            "en" => en ?? uz,
            _ => uz,
        };

        private string TryDecrypt(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            try { return _encryption.Decrypt(value); }
            catch { return string.Empty; }  // eski shifrlanmagan yoki buzilgan yozuv
        }

        /// <summary>"AC1234567" -> "** ****4567". To'liq seriya mijozga yuborilmaydi.</summary>
        /// <summary>
        /// Passportni ko'rsatishga tayyorlaydi.
        /// </summary>
        /// <remarks>
        /// Maskalash loyiha egasining qarori bo'yicha O'CHIRILGAN —
        /// passport to'liq ko'rsatiladi. Qoida bitta joyda:
        /// <see cref="EkgAnalyzerApi.Helpers.PatientPrivacy.MaskingEnabled"/>.
        /// </remarks>
        private static string MaskPassport(string? passport)
        {
            if (string.IsNullOrWhiteSpace(passport)) return "—";

            var clean = passport.Replace(" ", "");
            if (!EkgAnalyzerApi.Helpers.PatientPrivacy.MaskingEnabled) return clean;

            return clean.Length <= 4 ? clean : "** ****" + clean.Substring(clean.Length - 4);
        }

    }
}
