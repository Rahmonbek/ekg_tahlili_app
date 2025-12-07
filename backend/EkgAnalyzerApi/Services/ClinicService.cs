using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class ClinicService
    {
        private readonly MedDataDB _context;

        public ClinicService(MedDataDB context)
        {
            _context = context;
        }

        public async Task<ClinicDTO?> GetClinicByUserIdAsync(int userId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return null;

            if (user.ClinicId == null)
            {
                return new ClinicDTO
                {
                    User = new UserDTO
                    {
                        Id = user.Id,
                        Email = user.Email
                    }
                };
            }

            var clinic = await _context.Clinics
                .Where(c => c.Id == user.ClinicId)
                .Select(c => new ClinicDTO
                {
                    Id = c.Id,
                    ClinicName = c.ClinicName,
                    ClinicLogo = c.ClinicLogo,
                    ClinicDetail = new ClinicDetailDTO
                    {
                        BankAccaunt = c.ClinicDetail.BankAccaunt,
                        BankName = c.ClinicDetail.BankName,
                        MFO = c.ClinicDetail.MFO,
                        INN = c.ClinicDetail.INN,
                        License = c.ClinicDetail.License,
                        Address = c.ClinicDetail.Address,
                        Director = c.ClinicDetail.Director
                    },
                    User = new UserDTO
                    {
                        Id = c.User.Id,
                        Email = c.User.Email
                    },
                    ClinicPhoneNumber = c.ClinicPhoneNumber
    .Select(p => new ClinicPhoneNumberDTO
    {
        Id = p.Id,
        PhoneNumber = p.PhoneNumber
    })
    .ToList()
                })
                .FirstOrDefaultAsync();

            return clinic;
        }
    }
}
