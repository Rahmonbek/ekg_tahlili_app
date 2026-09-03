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

            // Rol bo'yicha ko'rinish qoidasi bitta joyda — kompleks
            // xulosalar ro'yxati ham aynan shu qoidaga tayanadi
            var visibleIds = PatientVisibility.VisiblePatientIds(_context, user);

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

            // Tahlil sonlari va oxirgi tahlil sanasi KLINIKA BO'YICHA
            // FILTRLANMAYDI: bemor kartasi ham bazadagi barcha tahlillarni
            // ko'rsatadi, ro'yxatdagi son undan farq qilsa chalkashlik bo'lardi.
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

                    EcgCount = _context.ECGAnalyse.Count(a => a.PatcientId == p.Id),
                    LabCount = _context.LabAnalyse.Count(a => a.PatcientId == p.Id),
                    HolterCount = _context.HolterAnalyses.Count(a => a.PatcientId == p.Id),
                    SmadCount = _context.SmadAnalyses.Count(a => a.PatcientId == p.Id),

                    LastEcg = _context.ECGAnalyse.Where(a => a.PatcientId == p.Id).Max(a => a.CreatedAt),
                    LastLab = _context.LabAnalyse.Where(a => a.PatcientId == p.Id).Max(a => a.CreatedAt),
                    LastHolter = _context.HolterAnalyses.Where(a => a.PatcientId == p.Id).Max(a => a.CreatedAt),
                    LastSmad = _context.SmadAnalyses.Where(a => a.PatcientId == p.Id).Max(a => a.CreatedAt),
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
        /// Passport seriyasi + tug'ilgan sana bo'yicha bemor(lar)ni qidiradi.
        ///
        /// Klinika va rol filtri YO'Q — to'rttala rol ham bazadagi istalgan
        /// bemorni topa oladi (loyiha egasining qarori). Bu alohida, ataylab
        /// tor endpoint: `search` bilan bemor bazasini "kezib" chiqib
        /// bo'lmaydi, faqat passportni to'liq biladigan xodim topa oladi.
        ///
        /// Nega in-memory taqqoslash: passport AES-256 CBC bilan TASODIFIY IV
        /// orqali shifrlangan bo'lishi mumkin — bir xil matn har safar boshqa
        /// shifrmatn beradi va SQL `LIKE` ishlamaydi. Shuning uchun avval
        /// tug'ilgan sana bo'yicha (arzon, indeksli) toraytiriladi, keyin
        /// qolgan bir nechta yozuv deshifrlanib solishtiriladi.
        /// </summary>
        /// <param name="passport">Passport seriyasi va raqami, masalan "AB 1234567".</param>
        /// <param name="birthDate">Tug'ilgan sana — qidiruvni cheklaydi va majburiy.</param>
        public async Task<List<PatcientListItemDTO>> SearchByPassportAsync(
            string passport, DateOnly birthDate, string lang = "uz")
        {
            var normalized = NormalizeSeries(passport);
            if (normalized.Length < 5) return new List<PatcientListItemDTO>();

            var candidates = await _context.Patcients.AsNoTracking()
                .Include(p => p.District!).ThenInclude(d => d.Region!)
                .Where(p => p.BirthDate == birthDate)
                .ToListAsync();

            var matched = candidates
                .Where(p => NormalizeSeries(TryDecrypt(p.Passport)) == normalized)
                .ToList();

            if (matched.Count == 0) return new List<PatcientListItemDTO>();

            var ids = matched.Select(p => p.Id).ToList();

            // Tahlil sonlari: har bir tur bo'yicha bitta GROUP BY so'rovi —
            // bemor boshiga alohida so'rov yuborilmaydi
            var ecg = await _context.ECGAnalyse.AsNoTracking()
                .Where(a => ids.Contains(a.PatcientId))
                .GroupBy(a => a.PatcientId)
                .Select(g => new { PatientId = g.Key, Count = g.Count(), Last = g.Max(x => x.CreatedAt) })
                .ToListAsync();
            var lab = await _context.LabAnalyse.AsNoTracking()
                .Where(a => ids.Contains(a.PatcientId))
                .GroupBy(a => a.PatcientId)
                .Select(g => new { PatientId = g.Key, Count = g.Count(), Last = g.Max(x => x.CreatedAt) })
                .ToListAsync();
            var holter = await _context.HolterAnalyses.AsNoTracking()
                .Where(a => ids.Contains(a.PatcientId))
                .GroupBy(a => a.PatcientId)
                .Select(g => new { PatientId = g.Key, Count = g.Count(), Last = g.Max(x => x.CreatedAt) })
                .ToListAsync();
            var smad = await _context.SmadAnalyses.AsNoTracking()
                .Where(a => ids.Contains(a.PatcientId))
                .GroupBy(a => a.PatcientId)
                .Select(g => new { PatientId = g.Key, Count = g.Count(), Last = g.Max(x => x.CreatedAt) })
                .ToListAsync();

            var stats = ecg.Concat(lab).Concat(holter).Concat(smad)
                .GroupBy(x => x.PatientId)
                .ToDictionary(
                    g => g.Key,
                    g => (
                        Count: g.Sum(x => x.Count),
                        Last: g.Select(x => x.Last).Max()));

            return matched.Select(p =>
            {
                var hasStats = stats.TryGetValue(p.Id, out var stat);

                return new PatcientListItemDTO
                {
                    Id = p.Id,
                    FirstName = p.FirstName,
                    LastName = p.LastName,
                    SureName = p.SureName,
                    PassportMasked = MaskPassport(TryDecrypt(p.Passport)),
                    BirthDate = p.BirthDate,
                    Gender = p.Gender,
                    Phone = p.Phone,
                    Address = p.Address,
                    RegionName = p.District == null ? null
                        : Localized(lang, p.District.Region.NameUz, p.District.Region.NameRu, p.District.Region.NameEn),
                    DistrictName = p.District == null ? null
                        : Localized(lang, p.District.NameUz, p.District.NameRu, p.District.NameEn),
                    AnalysesCount = hasStats ? stat.Count : 0,
                    LastAnalysisAt = hasStats ? stat.Last : null,
                };
            })
            .OrderByDescending(x => x.LastAnalysisAt ?? DateTime.MinValue)
            .ToList();
        }

        /// <summary>Bo'shliq, defis, nuqta va slashlarni olib tashlab katta harfga o'tkazadi.</summary>
        private static string NormalizeSeries(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            return System.Text.RegularExpressions.Regex.Replace(
                value.Trim().ToUpperInvariant(), @"[\s\-\/\.]", string.Empty);
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

            // Bemor tarixida ROL VA KLINIKA FILTRI YO'Q: bazadagi shu bemorga
            // tegishli BARCHA tahlillar to'rttala rolga ham ko'rinadi
            // (loyiha egasining qarori). Ro'yxat sahifasidagi cheklov
            // qaysi bemor ko'rinishini belgilaydi, kartaning ichini emas.
            var patient = await _context.Patcients.AsNoTracking()
                .Include(p => p.District!).ThenInclude(d => d.Region!)
                .FirstOrDefaultAsync(p => p.Id == patientId);
            if (patient == null) return null;

            var timeline = new List<PatientTimelineItemDTO>();

            var ecg = await _context.ECGAnalyse.AsNoTracking()
                .Where(a => a.PatcientId == patientId)
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
                .Where(a => a.PatcientId == patientId)
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
                .Where(a => a.PatcientId == patientId)
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
                .Where(a => a.PatcientId == patientId)
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
                .Where(a => a.PatcientId == patientId)
                .Select(a => new { a.Id, a.CreatedAt,
                    Doctor = a.MainDoctor.LastName + " " + a.MainDoctor.FirstName })
                .ToListAsync();
            timeline.AddRange(diagnoses.Select(a => new PatientTimelineItemDTO
            {
                Type = "diagnose", Id = a.Id, CreatedAt = a.CreatedAt, DoctorName = a.Doctor
            }));

            // Tahlili yo'q bemor ham ochiladi: passport bo'yicha qidiruvdan
            // kelgan foydalanuvchi bemor kartasini ko'rishi kerak, hatto unda
            // hali birorta tahlil bo'lmasa ham.

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
