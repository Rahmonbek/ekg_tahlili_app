using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class UserService
    {
        private readonly MedDataDB _context;

        public UserService(MedDataDB context)
        {
            _context = context;
        }

        public async Task<UserResponseDto?> GetUserByIdAsync(int userId)
        {
            var user = await _context.Users
    .Include(u => u.Role)
    .Include(u => u.Doctor)
    .Include(u => u.Clinic)
        .ThenInclude(c => c.ClinicDetail)
    .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return null;

            // Doctor DTO tayyorlash
            DoctorDto? doctorDto = null;
            if (user.Doctor != null)
            {
                var positions = await _context.DoctorPositions
                    .Where(dp => dp.DoctorId == user.Doctor.Id)
                    .Include(dp => dp.Position)
                    .Select(dp => new PositionDto
                    {
                        Id = dp.Position!.Id,
                        NameUz = dp.Position!.NameUz ?? "",
                        NameRu = dp.Position!.NameRu ?? "",
                        NameEn = dp.Position!.NameEn ?? ""
                    }).ToListAsync();

                doctorDto = new DoctorDto
                {
                    Id = user.Doctor.Id,
                    Gender=user.Doctor.Gender,
                    Phone=user.Doctor.Phone,
                    Avatar = user.Doctor.Avatar,
                    SureName=user.Doctor.SureName,
                    FirstName = user.Doctor.FirstName,
                    LastName = user.Doctor.LastName,
                    Positions = positions
                };
            }

            // Clinic DTO tayyorlash
            ClinicDto? clinicDto = null;
            if (user.Clinic != null)
            {
                clinicDto = new ClinicDto
                {
                    Id = user.Clinic.Id,
                    ClinicName = user.Clinic.ClinicName,
                    IsActive = user.Clinic.IsActive,
                    ClinicDetail = user.Clinic.ClinicDetail == null ? null : new ClinicDetailDto
                    {
                        Id = user.Clinic.ClinicDetail.Id,
                        Address = user.Clinic.ClinicDetail.Address,
                        BankAccaunt = user.Clinic.ClinicDetail.BankAccaunt,
                        BankName = user.Clinic.ClinicDetail.BankName,
                        MFO = user.Clinic.ClinicDetail.MFO,
                        License = user.Clinic.ClinicDetail.License,
                        INN = user.Clinic.ClinicDetail.INN,
                    }
                };
            }

            // UserResponseDto tayyorlash
            var userDto = new UserResponseDto
            {
                Id = user.Id,
                RoleId= user.RoleId,
                Email = user.Email,
                Role=new RolesDTO
                {
                    Id=user.Role.Id,
                    NameUz=user.Role.NameUz,
                    NameRu=user.Role.NameRu,
                    NameEn=user.Role.NameEn,
                },
                Doctor = doctorDto,
                Clinic = clinicDto
            };

            return userDto;
        }
    }
}
