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
                .AsNoTracking() // 🔥 Read-only bo‘lsa juda muhim
                .Where(e => e.PatcientId == patientId);
           
            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .Include(e => e.Clinic)
.ThenInclude(c => c.ClinicDetail)
.ThenInclude(c => c.District)
.ThenInclude(c => c.Region)
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
                        District = e.Clinic.ClinicDetail.District

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

    }
}
