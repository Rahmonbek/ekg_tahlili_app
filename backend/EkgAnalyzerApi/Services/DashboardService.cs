using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class DashboardService
    {
        private readonly MedDataDB _context;

        public DashboardService(MedDataDB context)
        {
            _context = context;
        }

        public async Task<DashboardStatisticsDto> GetStatisticsAsync(int userId, int roleId)
        {
            var from = DateTime.UtcNow.Date;
            var to = from.AddDays(1);

            if (roleId == 1)
                return new DashboardStatisticsDto
                {
                    Today = await CountAll(from, to),
                    AllTime = await CountAll(null, null),
                };

            if (roleId == 2 || roleId == 3)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user?.ClinicId == null) return new DashboardStatisticsDto();
                var cid = user.ClinicId.Value;
                return new DashboardStatisticsDto
                {
                    Today = await CountByClinic(cid, from, to),
                    AllTime = await CountByClinic(cid, null, null),
                };
            }

            if (roleId == 4)
            {
                var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
                if (doctor == null) return new DashboardStatisticsDto();
                return new DashboardStatisticsDto
                {
                    Today = await CountByDoctor(doctor.Id, from, to),
                    AllTime = await CountByDoctor(doctor.Id, null, null),
                };
            }

            if (roleId == 5)
            {
                var doctor = await _context.Doctors.FirstOrDefaultAsync(d => d.UserId == userId);
                if (doctor == null) return new DashboardStatisticsDto();
                return new DashboardStatisticsDto
                {
                    Today = await CountByNurse(doctor.Id, from, to),
                    AllTime = await CountByNurse(doctor.Id, null, null),
                };
            }

            return new DashboardStatisticsDto();
        }

        private async Task<AnalysisCountsDto> CountAll(DateTime? from, DateTime? to)
        {
            bool hasDate = from.HasValue;
            return new AnalysisCountsDto
            {
                Ecg = await (hasDate
                    ? _context.ECGAnalyse.Where(e => e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.ECGAnalyse).CountAsync(),
                Holter = await (hasDate
                    ? _context.HolterAnalyses.Where(e => e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.HolterAnalyses).CountAsync(),
                Smad = await (hasDate
                    ? _context.SmadAnalyses.Where(e => e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.SmadAnalyses).CountAsync(),
                Lab = await (hasDate
                    ? _context.LabAnalyse.Where(e => e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.LabAnalyse).CountAsync(),
                Diagnoses = await (hasDate
                    ? _context.MedicalDiagnose.Where(e => e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.MedicalDiagnose).CountAsync(),
                Parasitology = await (hasDate
                    ? _context.ParasitologyAnalyses.Where(e => e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.ParasitologyAnalyses).CountAsync(),
            };
        }

        private async Task<AnalysisCountsDto> CountByClinic(int cid, DateTime? from, DateTime? to)
        {
            bool hasDate = from.HasValue;
            return new AnalysisCountsDto
            {
                Ecg = await (hasDate
                    ? _context.ECGAnalyse.Where(e => e.ClinicId == cid && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.ECGAnalyse.Where(e => e.ClinicId == cid)).CountAsync(),
                Holter = await (hasDate
                    ? _context.HolterAnalyses.Where(e => e.ClinicId == cid && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.HolterAnalyses.Where(e => e.ClinicId == cid)).CountAsync(),
                Smad = await (hasDate
                    ? _context.SmadAnalyses.Where(e => e.ClinicId == cid && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.SmadAnalyses.Where(e => e.ClinicId == cid)).CountAsync(),
                Lab = await (hasDate
                    ? _context.LabAnalyse.Where(e => e.ClinicId == cid && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.LabAnalyse.Where(e => e.ClinicId == cid)).CountAsync(),
                Diagnoses = await (hasDate
                    ? _context.MedicalDiagnose.Where(e => e.ClinicId == cid && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.MedicalDiagnose.Where(e => e.ClinicId == cid)).CountAsync(),
                Parasitology = await (hasDate
                    ? _context.ParasitologyAnalyses.Where(e => e.ClinicId == cid && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.ParasitologyAnalyses.Where(e => e.ClinicId == cid)).CountAsync(),
            };
        }

        private async Task<AnalysisCountsDto> CountByDoctor(int did, DateTime? from, DateTime? to)
        {
            bool hasDate = from.HasValue;
            return new AnalysisCountsDto
            {
                Ecg = await (hasDate
                    ? _context.ECGAnalyse.Where(e => e.Doctors!.Any(d => d.DoctorId == did) && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.ECGAnalyse.Where(e => e.Doctors!.Any(d => d.DoctorId == did))).CountAsync(),
                Holter = await (hasDate
                    ? _context.HolterAnalyses.Where(e => e.Doctors!.Any(d => d.DoctorId == did) && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.HolterAnalyses.Where(e => e.Doctors!.Any(d => d.DoctorId == did))).CountAsync(),
                Smad = await (hasDate
                    ? _context.SmadAnalyses.Where(e => e.Doctors!.Any(d => d.DoctorId == did) && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.SmadAnalyses.Where(e => e.Doctors!.Any(d => d.DoctorId == did))).CountAsync(),
                Lab = await (hasDate
                    ? _context.LabAnalyse.Where(e => e.Doctors!.Any(d => d.DoctorId == did) && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.LabAnalyse.Where(e => e.Doctors!.Any(d => d.DoctorId == did))).CountAsync(),
                Diagnoses = await (hasDate
                    ? _context.MedicalDiagnose.Where(e => e.MainDoctorId == did && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.MedicalDiagnose.Where(e => e.MainDoctorId == did)).CountAsync(),
                Parasitology = await (hasDate
                    ? _context.ParasitologyAnalyses.Where(e => e.Doctors!.Any(d => d.DoctorId == did) && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.ParasitologyAnalyses.Where(e => e.Doctors!.Any(d => d.DoctorId == did))).CountAsync(),
            };
        }

        private async Task<AnalysisCountsDto> CountByNurse(int did, DateTime? from, DateTime? to)
        {
            bool hasDate = from.HasValue;
            return new AnalysisCountsDto
            {
                Ecg = await (hasDate
                    ? _context.ECGAnalyse.Where(e => e.CreatedDoctorId == did && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.ECGAnalyse.Where(e => e.CreatedDoctorId == did)).CountAsync(),
                Holter = await (hasDate
                    ? _context.HolterAnalyses.Where(e => e.CreatedDoctorId == did && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.HolterAnalyses.Where(e => e.CreatedDoctorId == did)).CountAsync(),
                Smad = await (hasDate
                    ? _context.SmadAnalyses.Where(e => e.CreatedDoctorId == did && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.SmadAnalyses.Where(e => e.CreatedDoctorId == did)).CountAsync(),
                Lab = await (hasDate
                    ? _context.LabAnalyse.Where(e => e.CreatedDoctorId == did && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.LabAnalyse.Where(e => e.CreatedDoctorId == did)).CountAsync(),
                Diagnoses = await (hasDate
                    ? _context.MedicalDiagnose.Where(e => e.CreatedDoctorId == did && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.MedicalDiagnose.Where(e => e.CreatedDoctorId == did)).CountAsync(),
                Parasitology = await (hasDate
                    ? _context.ParasitologyAnalyses.Where(e => e.CreatedDoctorId == did && e.CreatedAt >= from && e.CreatedAt < to)
                    : _context.ParasitologyAnalyses.Where(e => e.CreatedDoctorId == did)).CountAsync(),
            };
        }
    }
}
