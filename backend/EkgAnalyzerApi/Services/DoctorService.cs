using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class DoctorService
    {
        private readonly MedDataDB _context;

        public DoctorService(MedDataDB context)
        {
            _context = context;
        }

        public async Task<DoctorDTOResponse> SaveDoctorData(int user_id, DoctorDTORequest dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Id == user_id);
            var doctor = new Doctor();
            
            if (user == null)
                return Fail("user_not_found");

            if (user.RoleId != 2 && user.RoleId != 3)
                return Fail("user_has_not_permission");

            if (dto.Id == null)
            {
                // Yangi doktor qo'shish
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(x => x.Username == dto.Username);

                if (existingUser != null)
                    return Fail("username_already_exists");

                var new_user = new User
                {
                    Username = dto.Username,
                    PasswordPlain = dto.Password,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Status = true,
                    RoleId = dto.RoleId,
                    ClinicId = user.ClinicId
                };

                _context.Users.Add(new_user);

                doctor = new Doctor
                {
                    UserId = new_user.Id,
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    SureName = dto.SureName,
                    Gender = dto.Gender,
                    Phone = dto.Phone
                };

                _context.Doctors.Add(doctor);

                foreach (var position in dto.Positions)
                {
                    var new_position = new DoctorPosition
                    {
                        DoctorId = doctor.Id,
                        PositionId = position.Id
                    };
                    _context.DoctorPositions.Add(new_position);
                }
                doctor = await _context.Doctors
                   .Include(d => d.User)
                   .FirstOrDefaultAsync(d => d.Id == dto.Id);
            }
            else
            {
                // Mavjud doktorni yangilash
                doctor = await _context.Doctors
                    .Include(d => d.User)
                    .FirstOrDefaultAsync(d => d.Id == dto.Id);

                if (doctor == null)
                    return Fail("doctor_not_found");

                // Doktor ma'lumotlarini yangilash
                doctor.FirstName = dto.FirstName;
                doctor.LastName = dto.LastName;
                doctor.SureName = dto.SureName;
                doctor.Gender = dto.Gender;
                doctor.Phone = dto.Phone;

                // Username yangilash, agar o'zgargan bo'lsa
                if (doctor.User.Username != dto.Username)
                {
                    var usernameExists = await _context.Users
                        .AnyAsync(u => u.Username == dto.Username && u.Id != doctor.UserId);

                    if (usernameExists)
                        return Fail("username_already_exists");

                    doctor.User.Username = dto.Username;
                }

                // Password yangilash, agar berilgan bo'lsa
                if (!string.IsNullOrEmpty(dto.Password))
                {
                    doctor.User.PasswordPlain = dto.Password;
                    doctor.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                }

                // Doktor pozitsiyalarini yangilash
                var existingPositions = _context.DoctorPositions
                    .Where(dp => dp.DoctorId == doctor.Id);
                _context.DoctorPositions.RemoveRange(existingPositions);

                foreach (var position in dto.Positions)
                {
                    var new_position = new DoctorPosition
                    {
                        DoctorId = doctor.Id,
                        PositionId = position.Id
                    };
                    _context.DoctorPositions.Add(new_position);
                }
            }

            await _context.SaveChangesAsync();
            var positions = await _context.DoctorPositions
                   .Where(dp => dp.DoctorId == doctor.Id)
                   .Include(dp => dp.Position)
                   .Select(dp => new PositionDto
                   {
                       Id = dp.Position!.Id,
                       NameUz = dp.Position!.NameUz ?? "",
                       NameRu = dp.Position!.NameRu ?? "",
                       NameEn = dp.Position!.NameEn ?? ""
                   }).ToListAsync();
            return new DoctorDTOResponse
            {
                Status = true,
                Message = "doctor_saved_success",
                Doctor = new DoctorDTOResponseData
                {
                    Id = doctor.Id,
                    FirstName = doctor.FirstName,
                    LastName = doctor.LastName,
                    SureName = doctor.SureName,
                    Gender= doctor.Gender,
                    Phone= doctor.Phone,
                    Username=doctor.User.Username,
                    Password=doctor.User.PasswordPlain,
                    Positions=positions

                }
            };
        }

        private DoctorDTOResponse Fail(string message)
        {
            return new DoctorDTOResponse {
                Status=false,
                Message = message,
                Doctor=null
            }
            ;
        }

    }
}
