using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace EkgAnalyzerApi.Services
{
    public class ECGAnalyseService
    {
        private readonly MedDataDB _context;
        private readonly EncryptionService _encryption;

        public ECGAnalyseService(MedDataDB context, EncryptionService encryption)
        {
            _context = context;
            _encryption = encryption;
        }

        public async Task<PagedResult<ECGAnalyseDTO>> GetECGAnalysesByPatientIdAsync(
            int patientId,
            int page = 1,
            int pageSize = 5)
        {
            var baseQuery = _context.ECGAnalyse
                .Where(e => e.PatcientId == patientId);

            // jami yozuvlar soni
            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .Include(e => e.Clinic)
                .ThenInclude(c=>c.ClinicDetail)
                .ThenInclude(c=>c.District)
                .ThenInclude(c=>c.Region)
                .Include(e => e.Clinic)
                .ThenInclude(c => c.ClinicPhoneNumber)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
                    .ThenInclude(c => c.User)
                    .ThenInclude(c => c.Role)

                .Include(e => e.Complaints)
                    .ThenInclude(c => c.Complaint)
                .Include(e => e.Doctors)
                    .ThenInclude(c => c.Doctor)
                     .ThenInclude(c => c.User)
                    .ThenInclude(c => c.Role)
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new ECGAnalyseDTO
                {
                    Id = e.Id,
                    AIAnswerData = e.AIAnswerData,
                    UpdatedAt = e.UpdatedAt,
                    CreatedAt = e.CreatedAt,
                    GeneratedFileLink = e.GeneratedFileLink,
                    GeneratedShortFileLink = e.GeneratedShortFileLink,
                    AnalyseFileLink = e.AnalyseFileLink,
                    Status = e.Status,
                    PatcientId = e.PatcientId,
                    CreatedDoctorId = e.CreatedDoctorId,
                    Clinic=new ClinicForECG
                    {
                        Id = e.Clinic.Id,
                        ClinicLogo = e.Clinic.ClinicLogo,
                        ClinicName = e.Clinic.ClinicName,
                        District = e.Clinic.ClinicDetail != null ? e.Clinic.ClinicDetail.District : null,
                        Address = e.Clinic.ClinicDetail != null ? e.Clinic.ClinicDetail.Address : null,
                        PhoneNumbers = e.Clinic.ClinicPhoneNumber.Select(p => p.PhoneNumber).ToList()
                    },
                    Patcient = new PatcientForECG
                    {
                        Id = e.Patcient.Id,
                        BirthDate = e.Patcient.BirthDate,
                        Gender = e.Patcient.Gender

                    },
                    CreatedDoctor = new DoctorForECGData
                    {
                        Id = e.CreatedDoctor.Id,
                        FirstName = e.CreatedDoctor.FirstName,
                        LastName = e.CreatedDoctor.LastName,
                        SureName = e.CreatedDoctor.SureName,
                        Phone = e.CreatedDoctor.Phone,
                        Role = new RolesDTO
                        {
                            Id = e.CreatedDoctor.User.Role.Id,
                            NameUz = e.CreatedDoctor.User.Role.NameUz,
                            NameEn = e.CreatedDoctor.User.Role.NameEn,
                            NameRu = e.CreatedDoctor.User.Role.NameRu
                        }
                    },
                    Complaints = e.Complaints.OrderBy(ce => ce.Complaint.NameUz).Select(c => new Complaints
                    {
                        Id = c.Complaint.Id,
                        NameUz = c.Complaint.NameUz,
                        NameEn = c.Complaint.NameEn,
                        NameRu = c.Complaint.NameRu
                    }).ToList(),
                    Doctors = e.Doctors.Select(c => new DoctorForECGData
                    {
                        Id = c.Doctor.Id,
                        FirstName = c.Doctor.FirstName,
                        LastName = c.Doctor.LastName,
                        SureName = c.Doctor.SureName,
                        Phone = c.Doctor.Phone,
                        Role = new RolesDTO
                        {
                            Id = c.Doctor.User.Role.Id,
                            NameUz = c.Doctor.User.Role.NameUz,
                            NameEn = c.Doctor.User.Role.NameEn,
                            NameRu = c.Doctor.User.Role.NameRu
                        }
                    }).ToList()
                })
                .ToListAsync();

            return new PagedResult<ECGAnalyseDTO>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        /// <summary>
        /// Klinikaga tegishli barcha ECG tahlillarini qaytaradi.
        /// Bemor ismi/familiyasi/passport bo'yicha qidiruv, status filtri,
        /// sana oralig'i filtri, ORDER BY id DESC.
        /// </summary>
        public async Task<PagedResult<ECGAnalyseListDTO>> GetECGAnalysesByClinicIdAsync(
            int clinicId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            int? status = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null,
            int? aiStatus = null)
        {
            var query = _context.ECGAnalyse
                .Where(e => e.ClinicId == clinicId)
                .Include(e => e.Clinic)
                    .ThenInclude(c => c.ClinicDetail)
                        .ThenInclude(d => d.District)
                .Include(e => e.Clinic)
                    .ThenInclude(c => c.ClinicPhoneNumber)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(e => e.Status == status.Value);

            if (dateFrom.HasValue)
            {
                var utcFrom = DateTime.SpecifyKind(dateFrom.Value, DateTimeKind.Utc);
                query = query.Where(e => e.CreatedAt >= utcFrom);
            }

            if (dateTo.HasValue)
            {
                var utcTo = DateTime.SpecifyKind(dateTo.Value.Date.AddDays(1), DateTimeKind.Utc);
                query = query.Where(e => e.CreatedAt <= utcTo);
            }

            if (aiStatus.HasValue)
            {
                var val = aiStatus.Value.ToString();
                query = query.Where(e => e.AIAnswerData != null && (
                    e.AIAnswerData.Contains($"\"automatic_analysis_bool\": {val}") ||
                    e.AIAnswerData.Contains($"\"automatic_analysis_bool\":{val}") ||
                    e.AIAnswerData.Contains($"\"automatic_analysis_bool\": \"{val}\"") ||
                    e.AIAnswerData.Contains($"\"automatic_analysis_bool\":\"{val}\"")));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                var sLower = s.ToLower();

                // Passport formatini aniqlash: 2 harf + raqamlar (masalan "AA1234567")
                var isPassportSearch = System.Text.RegularExpressions.Regex.IsMatch(
                    s.Replace(" ", ""), @"^[A-Za-z]{2}\d+$");

                if (isPassportSearch)
                {
                    // Passport shifrlangan saqlanadi — in-memory deshifrlash va taqqoslash
                    var normalizedSearch = s.Replace(" ", "").ToUpper();

                    var clinicPatientIds = await _context.ECGAnalyse
                        .Where(e => e.ClinicId == clinicId)
                        .Select(e => e.PatcientId)
                        .Distinct()
                        .ToListAsync();

                    var patients = await _context.Patcients
                        .Where(p => clinicPatientIds.Contains(p.Id))
                        .Select(p => new { p.Id, p.Passport })
                        .ToListAsync();

                    var matchingIds = patients
                        .Where(p => p.Passport
                            .Replace(" ", "").ToUpper()
                            .Contains(normalizedSearch))
                        .Select(p => p.Id)
                        .ToList();

                    query = query.Where(e => matchingIds.Contains(e.PatcientId));
                }
                else
                {
                    query = query.Where(e =>
                        (e.Patcient.FirstName != null && e.Patcient.FirstName.ToLower().Contains(sLower)) ||
                        (e.Patcient.LastName  != null && e.Patcient.LastName.ToLower().Contains(sLower))  ||
                        (e.Patcient.SureName  != null && e.Patcient.SureName.ToLower().Contains(sLower)));
                }
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new ECGAnalyseListDTO
                {
                    Id              = e.Id,
                    Status          = e.Status,
                    CreatedAt = e.CreatedAt,
                    Patcient = new PatcientForECG
                    {
                        Id        = e.Patcient.Id,
                        BirthDate = e.Patcient.BirthDate,
                        Gender    = e.Patcient.Gender,
                        FirstName = e.Patcient.FirstName,
                        LastName  = e.Patcient.LastName,
                        SureName  = e.Patcient.SureName,
                        Passport = e.Patcient.Passport
                    },
                    CreatedDoctor = new DoctorForECGData
                    {
                        Id        = e.CreatedDoctor.Id,
                        FirstName = e.CreatedDoctor.FirstName,
                        LastName  = e.CreatedDoctor.LastName,
                        SureName  = e.CreatedDoctor.SureName
                    },
                    AIStatus = e.AIAnswerData != null ? 
                        (e.AIAnswerData.Contains("\"automatic_analysis_bool\": 1") || e.AIAnswerData.Contains("\"automatic_analysis_bool\": \"1\"") ? 1 : 
                         e.AIAnswerData.Contains("\"automatic_analysis_bool\": 2") || e.AIAnswerData.Contains("\"automatic_analysis_bool\": \"2\"") ? 2 : 
                         e.AIAnswerData.Contains("\"automatic_analysis_bool\": 3") || e.AIAnswerData.Contains("\"automatic_analysis_bool\": \"3\"") ? 3 : null) : null
                })
                .ToListAsync();

            return new PagedResult<ECGAnalyseListDTO>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize
            };
        }

        public async Task<ECGAnalyseDTO?> GetECGAnalyseByIdAsync(int id)
        {
            var e = await _context.ECGAnalyse
                .Include(e => e.Clinic)
                .ThenInclude(c => c.ClinicDetail)
                .ThenInclude(c => c.District)
                .ThenInclude(c => c.Region)
                .Include(e => e.Clinic)
                .ThenInclude(c => c.ClinicPhoneNumber)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
                    .ThenInclude(c => c.User)
                    .ThenInclude(c => c.Role)
                .Include(e => e.Complaints)
                    .ThenInclude(c => c.Complaint)
                .Include(e => e.Doctors)
                    .ThenInclude(c => c.Doctor)
                     .ThenInclude(c => c.User)
                    .ThenInclude(c => c.Role)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (e == null) return null;

            return new ECGAnalyseDTO
            {
                Id = e.Id,
                AIAnswerData = e.AIAnswerData,
                UpdatedAt = e.UpdatedAt,
                CreatedAt = e.CreatedAt,
                GeneratedFileLink = e.GeneratedFileLink,
                GeneratedShortFileLink = e.GeneratedShortFileLink,
                AnalyseFileLink = e.AnalyseFileLink,
                Status = e.Status,
                PatcientId = e.PatcientId,
                CreatedDoctorId = e.CreatedDoctorId,
                Clinic = new ClinicForECG
                {
                    Id = e.Clinic.Id,
                    ClinicLogo = e.Clinic.ClinicLogo,
                    ClinicName = e.Clinic.ClinicName,
                    District = e.Clinic.ClinicDetail != null ? e.Clinic.ClinicDetail.District : null,
                    Address = e.Clinic.ClinicDetail != null ? e.Clinic.ClinicDetail.Address : null,
                    PhoneNumbers = e.Clinic.ClinicPhoneNumber.Select(p => p.PhoneNumber).ToList()
                },
                Patcient = new PatcientForECG
                {
                    Id = e.Patcient.Id,
                    BirthDate = e.Patcient.BirthDate,
                    Gender = e.Patcient.Gender,
                    FirstName = e.Patcient.FirstName,
                    LastName = e.Patcient.LastName,
                    SureName = e.Patcient.SureName,
                    Passport = e.Patcient.Passport
                },
                CreatedDoctor = new DoctorForECGData
                {
                    Id = e.CreatedDoctor.Id,
                    FirstName = e.CreatedDoctor.FirstName,
                    LastName = e.CreatedDoctor.LastName,
                    SureName = e.CreatedDoctor.SureName,
                    Phone = e.CreatedDoctor.Phone,
                    Role = new RolesDTO
                    {
                        Id = e.CreatedDoctor.User.Role.Id,
                        NameUz = e.CreatedDoctor.User.Role.NameUz,
                        NameEn = e.CreatedDoctor.User.Role.NameEn,
                        NameRu = e.CreatedDoctor.User.Role.NameRu
                    }
                },
                Complaints = e.Complaints.OrderBy(ce => ce.Complaint.NameUz).Select(c => new Complaints
                {
                    Id = c.Complaint.Id,
                    NameUz = c.Complaint.NameUz,
                    NameEn = c.Complaint.NameEn,
                    NameRu = c.Complaint.NameRu
                }).ToList(),
                Doctors = e.Doctors.Select(c => new DoctorForECGData
                {
                    Id = c.Doctor.Id,
                    FirstName = c.Doctor.FirstName,
                    LastName = c.Doctor.LastName,
                    SureName = c.Doctor.SureName,
                    Phone = c.Doctor.Phone,
                    Role = new RolesDTO
                    {
                        Id = c.Doctor.User.Role.Id,
                        NameUz = c.Doctor.User.Role.NameUz,
                        NameEn = c.Doctor.User.Role.NameEn,
                        NameRu = c.Doctor.User.Role.NameRu
                    }
                }).ToList()
            };
        }

        /// <summary>
        /// ai_answer_data TEXT ustunida saqlangan JSON stringni
        /// AIAnswerDataDTO ga parse qiladi.
        /// Parsing xatosi bo'lsa null qaytaradi.
        /// </summary>
        public static AIAnswerDataDTO? ParseAIAnswerData(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return null;

            try
            {
                return JsonSerializer.Deserialize<AIAnswerDataDTO>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }
            catch
            {
                // JSON format to'g'ri emas bo'lsa, raw sifatida qaytaramiz
                return new AIAnswerDataDTO { Raw = json };
            }
        }
    }
}
