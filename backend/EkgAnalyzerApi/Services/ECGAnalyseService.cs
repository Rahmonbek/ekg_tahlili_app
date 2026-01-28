using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class ECGAnalyseService
    {
        private readonly MedDataDB _context;

        public ECGAnalyseService(MedDataDB context)
        {
            _context = context;
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

    }
}
