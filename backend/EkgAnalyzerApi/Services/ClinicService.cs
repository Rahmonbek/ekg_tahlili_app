using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class ClinicService
    {
        private readonly MedDataDB _context;
        private int _adminRoleId;
        private int _directorRoleId;
        private int _superAdminRoleId;

        public ClinicService(MedDataDB context)
        {
            _context = context;
            _adminRoleId = 2;
            _directorRoleId = 3;
            _superAdminRoleId = 1;
        }

        public async Task<ClinicDTO> GetClinicByIdAsync(int user_id, int id)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Id == user_id);

            if (user == null)
                return new ClinicDTO();

            if (user.RoleId != _adminRoleId && user.RoleId != _directorRoleId)
                return new ClinicDTO();

            var clinic = await _context.Clinics
                .Include(c=>c.ClinicDetail)
                .Select(c=> new ClinicDTO
                {
                    Id=c.Id,
                    ClinicName=c.ClinicName,
                    ClinicLogo=c.ClinicLogo,
                    ClinicDetail=new ClinicDetailDTO
                    {
                        Id=c.ClinicDetail.Id,
                        BankAccaunt=c.ClinicDetail.BankAccaunt,
                        MFO=c.ClinicDetail.BankName,
                        BankName=c.ClinicDetail.BankName,
                        INN=c.ClinicDetail.INN,
                        License=c.ClinicDetail.License,
                        Address=c.ClinicDetail.Address
                       
    }

}).FirstOrDefaultAsync(c => c.Id == id);
            return clinic;

        }

        
        }
}
