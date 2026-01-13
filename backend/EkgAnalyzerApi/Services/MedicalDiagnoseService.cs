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

            // jami yozuvlar soni
            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
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
                .Select(e => new MedicalDiagnoseDTO
                {
                    Id = e.Id,

                    UpdatedAt = e.UpdatedAt,
                    CreatedAt = e.CreatedAt,
                    DiagnoseFileLink = e.DiagnoseFileLink,
                    PatcientId = e.PatcientId,
                    CreatedDoctorId = e.CreatedDoctorId,
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
