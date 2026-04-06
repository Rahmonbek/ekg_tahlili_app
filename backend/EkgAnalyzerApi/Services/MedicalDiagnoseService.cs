using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class MedicalDiagnoseService
    {
        private readonly MedDataDB _context;

        public MedicalDiagnoseService(MedDataDB context)
        {
            _context = context;
        }

        public async Task<PagedResult<MedicalDiagnoseDTO>> GetMedicalDiagnosesByPatientIdAsync(
     int patientId,
     int page = 1,
     int pageSize = 5)
        {
            var baseQuery = _context.MedicalDiagnose
                .Where(e => e.PatcientId == patientId);
           
            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(c => c.District).ThenInclude(c => c.Region)
                .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
                .Include(e => e.MainDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
                .Include(e => e.MainDoctor).ThenInclude(d => d.DoctorPositions).ThenInclude(dp => dp.Position)
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new MedicalDiagnoseDTO
                {
                    Id = e.Id,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt,
                    DiagnoseFileLink = e.DiagnoseFileLink,
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
                            NameRu = e.CreatedDoctor.User.Role.NameRu,
                            NameEn = e.CreatedDoctor.User.Role.NameEn
                        }
                    },
                    MainDoctor = new DoctorForECGData
                    {
                        Id = e.MainDoctor.Id,
                        FirstName = e.MainDoctor.FirstName,
                        LastName = e.MainDoctor.LastName,
                        SureName = e.MainDoctor.SureName,
                        Phone = e.MainDoctor.Phone,
                        Role = new RolesDTO
                        {
                            Id = e.MainDoctor.User.Role.Id,
                            NameUz = e.MainDoctor.User.Role.NameUz,
                            NameRu = e.MainDoctor.User.Role.NameRu,
                            NameEn = e.MainDoctor.User.Role.NameEn
                        },
                        Positions = e.MainDoctor.DoctorPositions
                            .Select(dp => new PositionDto
                            {
                                Id = dp.Position.Id,
                                RoleId = dp.Position.RoleId,
                                NameUz = dp.Position.NameUz,
                                NameRu = dp.Position.NameRu,
                                NameEn = dp.Position.NameEn
                            })
                            .ToList()
                    }
                })
                .ToListAsync();

            return new PagedResult<MedicalDiagnoseDTO>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PagedResult<MedicalDiagnoseListDTO>> GetMedicalDiagnoseAnalysesByClinicIdAsync(
            int clinicId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null)
        {
            var query = _context.MedicalDiagnose
                .Where(e => e.ClinicId == clinicId)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
                .Include(e => e.MainDoctor)
                .AsQueryable();

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
                    var clinicPatientIds = await _context.MedicalDiagnose.Where(e => e.ClinicId == clinicId).Select(e => e.PatcientId).Distinct().ToListAsync();
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

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new MedicalDiagnoseListDTO
                {
                    Id = e.Id,
                    CreatedAt = e.CreatedAt,
                    DiagnoseFileLink = e.DiagnoseFileLink,
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
                    MainDoctor = e.MainDoctor == null ? null : new DoctorForECGData
                    {
                        Id = e.MainDoctor.Id,
                        FirstName = e.MainDoctor.FirstName,
                        LastName = e.MainDoctor.LastName,
                        SureName = e.MainDoctor.SureName
                    }
                })
                .ToListAsync();

            return new PagedResult<MedicalDiagnoseListDTO>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        // ── Shifokor bo'yicha filter ──────────────────────────────────────────────

        public async Task<PagedResult<MedicalDiagnoseListDTO>> GetMedicalDiagnosesByDoctorAsync(
            int doctorId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null)
        {
            var query = _context.MedicalDiagnose
                .Where(e => e.MainDoctorId == doctorId)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
                .Include(e => e.MainDoctor)
                .AsQueryable();

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
                .Select(e => new MedicalDiagnoseListDTO
                {
                    Id              = e.Id,
                    CreatedAt       = e.CreatedAt,
                    IsViewed        = e.IsViewed,
                    DiagnoseFileLink = e.DiagnoseFileLink,
                    Patcient = e.Patcient == null ? null : new PatcientForECG
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
                    MainDoctor = e.MainDoctor == null ? null : new DoctorForECGData
                    {
                        Id        = e.MainDoctor.Id,
                        FirstName = e.MainDoctor.FirstName,
                        LastName  = e.MainDoctor.LastName,
                        SureName  = e.MainDoctor.SureName
                    }
                })
                .ToListAsync();

            return new PagedResult<MedicalDiagnoseListDTO>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize
            };
        }

        public async Task<int> GetUnviewedDiagnosesCountByDoctorAsync(int doctorId)
        {
            return await _context.MedicalDiagnose
                .Where(e => e.MainDoctorId == doctorId && !e.IsViewed)
                .CountAsync();
        }

        public async Task MarkDiagnosesViewedByDoctorAsync(int doctorId)
        {
            var rows = await _context.MedicalDiagnose
                .Where(e => e.MainDoctorId == doctorId && !e.IsViewed)
                .ToListAsync();

            foreach (var r in rows) r.IsViewed = true;
            await _context.SaveChangesAsync();
        }

        // ── Hamshira bo'yicha filter (faqat o'zi yaratganlari) ───────────────────

        public async Task<PagedResult<MedicalDiagnoseListDTO>> GetDiagnosesByNurseAsync(
            int doctorId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null)
        {
            var query = _context.MedicalDiagnose
                .Where(e => e.CreatedDoctorId == doctorId)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
                .Include(e => e.MainDoctor)
                .AsQueryable();

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
                .Select(e => new MedicalDiagnoseListDTO
                {
                    Id               = e.Id,
                    CreatedAt        = e.CreatedAt,
                    IsViewed         = null,
                    DiagnoseFileLink = e.DiagnoseFileLink,
                    Patcient = e.Patcient == null ? null : new PatcientForECG
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
                    MainDoctor = e.MainDoctor == null ? null : new DoctorForECGData
                    {
                        Id        = e.MainDoctor.Id,
                        FirstName = e.MainDoctor.FirstName,
                        LastName  = e.MainDoctor.LastName,
                        SureName  = e.MainDoctor.SureName
                    }
                })
                .ToListAsync();

            return new PagedResult<MedicalDiagnoseListDTO>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = page,
                PageSize   = pageSize
            };
        }

        public async Task<MedicalDiagnoseDTO?> GetMedicalDiagnoseByIdAsync(int id)
        {
            var e = await _context.MedicalDiagnose
                .Include(e => e.Clinic).ThenInclude(c => c.ClinicDetail).ThenInclude(c => c.District).ThenInclude(c => c.Region)
                .Include(e => e.Clinic).ThenInclude(c => c.ClinicPhoneNumber)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
                .Include(e => e.MainDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
                .Include(e => e.MainDoctor).ThenInclude(d => d.DoctorPositions).ThenInclude(dp => dp.Position)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (e == null) return null;

            return new MedicalDiagnoseDTO
            {
                Id = e.Id,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt,
                DiagnoseFileLink = e.DiagnoseFileLink,
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
                        NameRu = e.CreatedDoctor.User.Role.NameRu,
                        NameEn = e.CreatedDoctor.User.Role.NameEn
                    }
                },
                MainDoctor = new DoctorForECGData
                {
                    Id = e.MainDoctor.Id,
                    FirstName = e.MainDoctor.FirstName,
                    LastName = e.MainDoctor.LastName,
                    SureName = e.MainDoctor.SureName,
                    Phone = e.MainDoctor.Phone,
                    Role = new RolesDTO
                    {
                        Id = e.MainDoctor.User.Role.Id,
                        NameUz = e.MainDoctor.User.Role.NameUz,
                        NameRu = e.MainDoctor.User.Role.NameRu,
                        NameEn = e.MainDoctor.User.Role.NameEn
                    },
                    Positions = e.MainDoctor.DoctorPositions
                        .Select(dp => new PositionDto
                        {
                            Id = dp.Position.Id,
                            RoleId = dp.Position.RoleId,
                            NameUz = dp.Position.NameUz,
                            NameRu = dp.Position.NameRu,
                            NameEn = dp.Position.NameEn
                        })
                        .ToList()
                }
            };
        }
    }
}