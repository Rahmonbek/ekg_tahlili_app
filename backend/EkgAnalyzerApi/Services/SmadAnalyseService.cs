using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class SmadAnalyseService
    {
        private readonly MedDataDB _context;

        public SmadAnalyseService(MedDataDB context)
        {
            _context = context;
        }

        public async Task<PagedResult<SmadAnalyseDTO>> GetSmadAnalysesByPatientIdAsync(
            int patientId,
            int page = 1,
            int pageSize = 5)
        {
            var baseQuery = _context.SmadAnalyses
               .Where(e => e.PatcientId == patientId)
               .Include(e => e.Clinic)
                   .ThenInclude(c => c.ClinicDetail)
                       .ThenInclude(d => d.District)
               .Include(e => e.Clinic)
                   .ThenInclude(c => c.ClinicPhoneNumber)
               .Include(e => e.Patcient)
               .Include(e => e.CreatedDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
               .Include(e => e.MainDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role);

            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new SmadAnalyseDTO
                {
                    Id = e.Id,
                    AIAnswerData = e.AIAnswerData,
                    UpdatedAt = e.UpdatedAt,
                    CreatedAt = e.CreatedAt,
                    AnalyseFileLink = e.AnalyseFileLink,
                    Status = e.Status,
                    PatcientId = e.PatcientId,
                    CreatedDoctorId = e.CreatedDoctorId,
                    MainDoctorId = e.MainDoctorId,
                    Clinic = e.Clinic == null ? null : new ClinicForECG
                    {
                        Id = e.Clinic.Id,
                        ClinicLogo = e.Clinic.ClinicLogo,
                        ClinicName = e.Clinic.ClinicName,
                        District = e.Clinic.ClinicDetail != null ? e.Clinic.ClinicDetail.District : null,
                        Address = e.Clinic.ClinicDetail != null ? e.Clinic.ClinicDetail.Address : null,
                        PhoneNumbers = e.Clinic.ClinicPhoneNumber.Select(p => p.PhoneNumber).ToList()
                    },
                    Patcient = e.Patcient == null ? null : new PatcientForECG
                    {
                        Id = e.Patcient.Id,
                        BirthDate = e.Patcient.BirthDate,
                        Gender = e.Patcient.Gender,
                        FirstName = e.Patcient.FirstName,
                        LastName = e.Patcient.LastName,
                        SureName = e.Patcient.SureName,
                        Passport = e.Patcient.Passport
                    },
                    CreatedDoctor = e.CreatedDoctor == null ? null : new DoctorForECGData
                    {
                        Id = e.CreatedDoctor.Id,
                        FirstName = e.CreatedDoctor.FirstName,
                        LastName = e.CreatedDoctor.LastName,
                        SureName = e.CreatedDoctor.SureName,
                        Phone = e.CreatedDoctor.Phone,
                        Role = e.CreatedDoctor.User.Role == null ? null : new RolesDTO
                        {
                            Id = e.CreatedDoctor.User.Role.Id,
                            NameUz = e.CreatedDoctor.User.Role.NameUz,
                            NameEn = e.CreatedDoctor.User.Role.NameEn,
                            NameRu = e.CreatedDoctor.User.Role.NameRu
                        }
                    },
                    MainDoctor = e.MainDoctor == null ? null : new DoctorForECGData
                    {
                        Id = e.MainDoctor.Id,
                        FirstName = e.MainDoctor.FirstName,
                        LastName = e.MainDoctor.LastName,
                        SureName = e.MainDoctor.SureName,
                        Phone = e.MainDoctor.Phone,
                        Role = e.MainDoctor.User.Role == null ? null : new RolesDTO
                        {
                            Id = e.MainDoctor.User.Role.Id,
                            NameUz = e.MainDoctor.User.Role.NameUz,
                            NameEn = e.MainDoctor.User.Role.NameEn,
                            NameRu = e.MainDoctor.User.Role.NameRu
                        }
                    },
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

            return new PagedResult<SmadAnalyseDTO>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PagedResult<SmadAnalyseListDTO>> GetSmadAnalysesByClinicIdAsync(
            int clinicId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            int? status = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null,
            int? automaticAnalysisBool = null)
        {
            var query = _context.SmadAnalyses
                .Where(e => e.ClinicId == clinicId)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
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

            if (!string.IsNullOrWhiteSpace(search))
            {
                var sLower = search.Trim().ToLower();
                var isPassport = System.Text.RegularExpressions.Regex.IsMatch(search.Replace(" ", ""), @"^[A-Za-z]{2}\d+$");
                if (isPassport)
                {
                    var normalizedSearch = search.Replace(" ", "").ToUpper();
                    var clinicPatientIds = await _context.SmadAnalyses.Where(e => e.ClinicId == clinicId).Select(e => e.PatcientId).Distinct().ToListAsync();
                    var patients = await _context.Patcients.Where(p => clinicPatientIds.Contains(p.Id)).Select(p => new { p.Id, p.Passport }).ToListAsync();
                    var matchingIds = patients.Where(p => p.Passport != null && p.Passport.Replace(" ", "").ToUpper().Contains(normalizedSearch)).Select(p => p.Id).ToList();
                    query = query.Where(e => matchingIds.Contains(e.PatcientId));
                }
                else
                {
                    query = query.Where(e =>
                        (e.Patcient.FirstName != null && e.Patcient.FirstName.ToLower().Contains(sLower)) ||
                        (e.Patcient.LastName != null && e.Patcient.LastName.ToLower().Contains(sLower)) ||
                        (e.Patcient.SureName != null && e.Patcient.SureName.ToLower().Contains(sLower))
                    );
                }
            }

            if (automaticAnalysisBool.HasValue)
            {
                var val = automaticAnalysisBool.Value.ToString();
                query = query.Where(e => e.AIAnswerData != null && (
                    e.AIAnswerData.Contains($"\"automatic_analysis_bool\": {val}") ||
                    e.AIAnswerData.Contains($"\"automatic_analysis_bool\":{val}") ||
                    e.AIAnswerData.Contains($"\"automatic_analysis_bool\": \"{val}\"") ||
                    e.AIAnswerData.Contains($"\"automatic_analysis_bool\":\"{val}\"")));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new SmadAnalyseListDTO
                {
                    Id = e.Id,
                    Status = e.Status,
                    CreatedAt = e.CreatedAt,
                    Patcient = e.Patcient == null ? null : new PatcientForECG
                    {
                        Id = e.Patcient.Id,
                        BirthDate = e.Patcient.BirthDate,
                        Gender = e.Patcient.Gender,
                        FirstName = e.Patcient.FirstName,
                        LastName = e.Patcient.LastName,
                        SureName = e.Patcient.SureName,
                        Passport = e.Patcient.Passport
                    },
                    CreatedDoctor = e.CreatedDoctor == null ? null : new DoctorForECGData
                    {
                        Id = e.CreatedDoctor.Id,
                        FirstName = e.CreatedDoctor.FirstName,
                        LastName = e.CreatedDoctor.LastName,
                        SureName = e.CreatedDoctor.SureName
                    },
                    AIStatus = e.AIAnswerData != null ? 
                        (e.AIAnswerData.Contains("\"automatic_analysis_bool\": 1") || e.AIAnswerData.Contains("\"automatic_analysis_bool\": \"1\"") ? 1 : 
                         e.AIAnswerData.Contains("\"automatic_analysis_bool\": 2") || e.AIAnswerData.Contains("\"automatic_analysis_bool\": \"2\"") ? 2 : 
                         e.AIAnswerData.Contains("\"automatic_analysis_bool\": 3") || e.AIAnswerData.Contains("\"automatic_analysis_bool\": \"3\"") ? 3 : null) : null
                })
                .ToListAsync();

            return new PagedResult<SmadAnalyseListDTO>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        // ── Shifokor bo'yicha filter ──────────────────────────────────────────────

        public async Task<PagedResult<SmadAnalyseListDTO>> GetSmadAnalysesByDoctorAsync(
            int doctorId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            int? status = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null)
        {
            var query = _context.SmadAnalyses
                .Where(e => e.Doctors!.Any(d => d.DoctorId == doctorId))
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
                .Include(e => e.Doctors)
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

            if (!string.IsNullOrWhiteSpace(search))
            {
                var sLower = search.Trim().ToLower();
                query = query.Where(e =>
                    (e.Patcient.FirstName != null && e.Patcient.FirstName.ToLower().Contains(sLower)) ||
                    (e.Patcient.LastName  != null && e.Patcient.LastName.ToLower().Contains(sLower))  ||
                    (e.Patcient.SureName  != null && e.Patcient.SureName.ToLower().Contains(sLower)));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new SmadAnalyseListDTO
                {
                    Id        = e.Id,
                    Status    = e.Status,
                    CreatedAt = e.CreatedAt,
                    IsViewed  = e.Doctors!.Where(d => d.DoctorId == doctorId).Select(d => d.IsViewed).FirstOrDefault(),
                    Patcient  = e.Patcient == null ? null : new PatcientForECG
                    {
                        Id        = e.Patcient.Id,
                        BirthDate = e.Patcient.BirthDate,
                        Gender    = e.Patcient.Gender,
                        FirstName = e.Patcient.FirstName,
                        LastName  = e.Patcient.LastName,
                        SureName  = e.Patcient.SureName,
                        Passport  = e.Patcient.Passport
                    },
                    CreatedDoctor = e.CreatedDoctor == null ? null : new DoctorForECGData
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

            return new PagedResult<SmadAnalyseListDTO>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize
            };
        }

        public async Task<int> GetUnviewedSmadCountByDoctorAsync(int doctorId)
        {
            return await _context.SmadAnalyseDoctor
                .Where(d => d.DoctorId == doctorId && !d.IsViewed)
                .CountAsync();
        }

        public async Task MarkSmadViewedByDoctorAsync(int doctorId)
        {
            var rows = await _context.SmadAnalyseDoctor
                .Where(d => d.DoctorId == doctorId && !d.IsViewed)
                .ToListAsync();

            foreach (var r in rows) r.IsViewed = true;
            await _context.SaveChangesAsync();
        }

        public async Task<SmadAnalyseDTO?> GetSmadAnalyseByIdAsync(int id)
        {
            var e = await _context.SmadAnalyses
               .Include(e => e.Clinic)
                   .ThenInclude(c => c.ClinicDetail)
                       .ThenInclude(d => d.District)
               .Include(e => e.Clinic)
                   .ThenInclude(c => c.ClinicPhoneNumber)
               .Include(e => e.Patcient)
               .Include(e => e.CreatedDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
               .Include(e => e.MainDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
               .Include(e => e.Doctors).ThenInclude(d => d.Doctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
               .FirstOrDefaultAsync(x => x.Id == id);

            if (e == null) return null;

            return new SmadAnalyseDTO
            {
                Id = e.Id,
                AIAnswerData = e.AIAnswerData,
                UpdatedAt = e.UpdatedAt,
                CreatedAt = e.CreatedAt,
                AnalyseFileLink = e.AnalyseFileLink,
                Status = e.Status,
                PatcientId = e.PatcientId,
                CreatedDoctorId = e.CreatedDoctorId,
                MainDoctorId = e.MainDoctorId,
                Clinic = e.Clinic == null ? null : new ClinicForECG
                {
                    Id = e.Clinic.Id,
                    ClinicLogo = e.Clinic.ClinicLogo,
                    ClinicName = e.Clinic.ClinicName,
                    District = e.Clinic.ClinicDetail != null ? e.Clinic.ClinicDetail.District : null,
                    Address = e.Clinic.ClinicDetail != null ? e.Clinic.ClinicDetail.Address : null,
                    PhoneNumbers = e.Clinic.ClinicPhoneNumber.Select(p => p.PhoneNumber).ToList()
                },
                Patcient = e.Patcient == null ? null : new PatcientForECG
                {
                    Id = e.Patcient.Id,
                    BirthDate = e.Patcient.BirthDate,
                    Gender = e.Patcient.Gender,
                    FirstName = e.Patcient.FirstName,
                    LastName = e.Patcient.LastName,
                    SureName = e.Patcient.SureName,
                    Passport = e.Patcient.Passport
                },
                CreatedDoctor = e.CreatedDoctor == null ? null : new DoctorForECGData
                {
                    Id = e.CreatedDoctor.Id,
                    FirstName = e.CreatedDoctor.FirstName,
                    LastName = e.CreatedDoctor.LastName,
                    SureName = e.CreatedDoctor.SureName,
                    Phone = e.CreatedDoctor.Phone,
                    Role = e.CreatedDoctor.User.Role == null ? null : new RolesDTO
                    {
                        Id = e.CreatedDoctor.User.Role.Id,
                        NameUz = e.CreatedDoctor.User.Role.NameUz,
                        NameEn = e.CreatedDoctor.User.Role.NameEn,
                        NameRu = e.CreatedDoctor.User.Role.NameRu
                    }
                },
                MainDoctor = e.MainDoctor == null ? null : new DoctorForECGData
                {
                    Id = e.MainDoctor.Id,
                    FirstName = e.MainDoctor.FirstName,
                    LastName = e.MainDoctor.LastName,
                    SureName = e.MainDoctor.SureName,
                    Phone = e.MainDoctor.Phone,
                    Role = e.MainDoctor.User.Role == null ? null : new RolesDTO
                    {
                        Id = e.MainDoctor.User.Role.Id,
                        NameUz = e.MainDoctor.User.Role.NameUz,
                        NameEn = e.MainDoctor.User.Role.NameEn,
                        NameRu = e.MainDoctor.User.Role.NameRu
                    }
                },
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
    }
}