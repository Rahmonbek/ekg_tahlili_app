using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using iTextSharp.text;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class PatcientService
    {
        private readonly MedDataDB _context;
        private int _adminRoleId;
        private int _directorRoleId;
        private int _doctorRoleId;
        private int _nurseRoleId;
        private int _superAdminRoleId;
        public PatcientService(MedDataDB context)
        {
            _context = context;
            _adminRoleId = 2;
            _doctorRoleId = 4;
            _nurseRoleId = 5;
            _directorRoleId = 3;
            _superAdminRoleId = 1;

        }

        public async Task<PatcientListDTO> GetPatcientsAsync(int pageNumber, int user_id)
        {
            var user = await _context.Users.Include(u=>u.Doctor)
                .FirstOrDefaultAsync(x => x.Id == user_id);

            if (user == null)
                return new PatcientListDTO();
            const int pageSize = 10;

            IQueryable<Patcient> patcientsQuery = _context.Patcients.AsNoTracking();

            if (user.RoleId == _adminRoleId
             || user.RoleId == _nurseRoleId
             || user.RoleId == _directorRoleId)
            {
                var patientIds =
                    _context.ECGAnalyse
                        .Where(x => x.ClinicId == user.ClinicId)
                        .Select(x => x.PatcientId)
                    .Union(
                        _context.LabAnalyse
                            .Where(x => x.ClinicId == user.ClinicId)
                            .Select(x => x.PatcientId)
                    )
                    .Union(
                        _context.MedicalDiagnose
                            .Where(x => x.ClinicId == user.ClinicId)
                            .Select(x => x.PatcientId)
                    );

                patcientsQuery = patcientsQuery
                    .Where(p => patientIds.Contains(p.Id));
            }
            else
            {
                if (user.RoleId == _doctorRoleId)
                {
                    var patientIds =
                   _context.ECGAnalyseDoctor.Include(e=>e.ECGAnalyse)
                       .Where(x => x.DoctorId == user.Doctor.Id)
                       .Select(x => x.ECGAnalyse.PatcientId)
                   .Union(
                       _context.MedicalDiagnose
                           .Where(x => x.MainDoctorId == user.Doctor.Id)
                           .Select(x => x.PatcientId)
                   );

                    patcientsQuery = patcientsQuery
                        .Where(p => patientIds.Contains(p.Id));
                }
            }

            // 🔥 Include HAR DOIM OXIRIDA
            patcientsQuery = patcientsQuery
     .Include(p => p.District)
         .ThenInclude(d => d.Region)
     .OrderByDescending(p =>
         (
             p.ECGAnalyses
                 .Where(e => e.ClinicId == user.ClinicId)
                 .Max(e => (DateTime?)e.CreatedAt)
             >
             p.LabAnalyses
                 .Where(e => e.ClinicId == user.ClinicId)
                 .Max(e => (DateTime?)e.CreatedAt)
                 ? p.ECGAnalyses
                     .Where(e => e.ClinicId == user.ClinicId)
                     .Max(e => (DateTime?)e.CreatedAt)
                 : p.LabAnalyses
                     .Where(e => e.ClinicId == user.ClinicId)
                     .Max(e => (DateTime?)e.CreatedAt)
         )
     );

            var totalpatcients = await patcientsQuery.CountAsync();
            var totalPages = (int)Math.Ceiling(totalpatcients / (double)pageSize);

            var patcients = await patcientsQuery
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new Patcient
                {
                    Id = u.Id,
                    Passport = u.Passport,
                    BirthDate = u.BirthDate,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    SureName = u.SureName,
                    Phone = u.Phone,
                    Address = u.Address,
                    Gender = u.Gender,
                    District = u.District,
                })
                .ToListAsync();

            return new PatcientListDTO
            {
                data = patcients,
                TotalCount = totalpatcients,
                TotalPages = totalPages
            };
        }


    }
}
