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
               .Where(e => e.PatcientId == patientId);
            var r = baseQuery.Include(e => e.Doctors).Take(pageSize).ToList();
            // 1. Jami sonini hisoblash
            var totalCount = await baseQuery.CountAsync();

            // 2. Ma'lumotlarni olish
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
                        District = e.Clinic.ClinicDetail.District
                    },
                    Patcient = e.Patcient == null ? null : new PatcientForECG
                    {
                        Id = e.Patcient.Id,
                        BirthDate = e.Patcient.BirthDate,
                        Gender = e.Patcient.Gender
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

    }
}
