using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class HolterAnalyseService
    {
        private readonly MedDataDB _context;

        public HolterAnalyseService(MedDataDB context)
        {
            _context = context;
        }

        public async Task<PagedResult<HolterAnalyseDTO>> GetHolterAnalysesByPatientIdAsync(
            int patientId,
            int page = 1,
            int pageSize = 5)
        {
            var baseQuery = _context.HolterAnalyses
                .Where(e => e.PatcientId == patientId);

            // jami yozuvlar soni
            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .Include(e => e.Clinic)
                .ThenInclude(c => c.ClinicDetail)
                .ThenInclude(c => c.District)
                .ThenInclude(c => c.Region)
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
                    .ThenInclude(c => c.User)
                    .ThenInclude(c => c.Role)
                .Include(e => e.MainDoctor)
                    .ThenInclude(c => c.User)
                    .ThenInclude(c => c.Role)

                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new HolterAnalyseDTO
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
                            NameEn = e.CreatedDoctor.User.Role.NameEn,
                            NameRu = e.CreatedDoctor.User.Role.NameRu
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
                            NameEn = e.MainDoctor.User.Role.NameEn,
                            NameRu = e.MainDoctor.User.Role.NameRu
                        }
                    },
                })
                .ToListAsync();

            return new PagedResult<HolterAnalyseDTO>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

    }
}
