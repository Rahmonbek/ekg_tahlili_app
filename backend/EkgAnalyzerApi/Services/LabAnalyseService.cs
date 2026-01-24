using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class LabAnalyseService
    {
        private readonly MedDataDB _context;

        public LabAnalyseService(MedDataDB context)
        {
            _context = context;
        }

        public async Task<PagedResult<LabAnalyseDTO>> GetLabAnalysesByPatientIdAsync(
            int patientId,
            int page = 1,
            int pageSize = 5)
        {
            var baseQuery = _context.LabAnalyse
                .Where(e => e.PatcientId == patientId);

            // jami yozuvlar soni
            var totalCount = await baseQuery.CountAsync();

            var items = await baseQuery
                .Include(e => e.Patcient)
                .Include(e => e.CreatedDoctor)
                    .ThenInclude(c => c.User)
                    .ThenInclude(c => c.Role)

                .Include(e => e.Categories)
                    .ThenInclude(c => c.LabCategory)
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new LabAnalyseDTO
                {
                    Id = e.Id,
                    AIAnswerData = e.AIAnswerData,
                    UpdatedAt = e.UpdatedAt,
                    CreatedAt = e.CreatedAt,
                    AnalyseFileLink = e.AnalyseFileLink,
                    Status = e.Status,
                    hb = e.hb,
                    rbc = e.rbc,
                    wbc = e.wbc,
                    plt = e.plt,
                    hct = e.hct,
                    mcv = e.mcv,
                    mch = e.mch,
                    mchc = e.mchc,
                    esr = e.esr,
                    glucose = e.glucose,
                    cholesterol = e.cholesterol,
                    alt = e.alt,
                    ast = e.ast,
                    bilirubin_total = e.bilirubin_total,
                    bilirubin_direct = e.bilirubin_direct,
                    creatinine = e.creatinine,
                    urea = e.urea,
                    total_protein = e.total_protein,
                    albumin = e.albumin,
                    calcium = e.calcium,
                    sodium = e.sodium,
                    potassium = e.potassium,
                    iron = e.iron,
                    tsh = e.tsh,
                    free_t4 = e.free_t4,
                    insulin = e.insulin,
                    urine_volume = e.urine_volume,
                    urine_density = e.urine_density,
                    urine_ph = e.urine_ph,
                    urine_protein = e.urine_protein,
                    urine_glucose = e.urine_glucose,
                    urine_ketones = e.urine_ketones,
                    urine_bilirubin = e.urine_bilirubin,
                    urobilinogen = e.urobilinogen,
                    urine_rbc = e.urine_rbc,
                    urine_wbc = e.urine_wbc,
                    daily_protein = e.daily_protein,
                    daily_creatinine = e.daily_creatinine,
                    daily_calcium = e.daily_calcium,
                    daily_sodium = e.daily_sodium,
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
                    Categories = e.Categories.OrderBy(ce => ce.LabCategory.NameUz).Select(c => new LabCategoryDto
                    {
                        Id = c.LabCategory.Id,
                        NameUz = c.LabCategory.NameUz,
                        NameEn = c.LabCategory.NameEn,
                        NameRu = c.LabCategory.NameRu
                    }).ToList(),
                    
                })
                .ToListAsync();

            return new PagedResult<LabAnalyseDTO>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

    }
}
