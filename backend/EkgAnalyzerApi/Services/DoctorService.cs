using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class DoctorService
    {
        private readonly MedDataDB _context;
        private int _adminRoleId;
        private int _directorRoleId;
        private int _superAdminRoleId;
        public DoctorService(MedDataDB context)
        {
            _context = context;
            _adminRoleId = 2;
            _directorRoleId = 3;
            _superAdminRoleId = 1;

        }

        public async Task<DoctorListDTO> GetDoctorsAsync(int pageNumber, int user_id)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Id == user_id);

            if (user == null)
                return new DoctorListDTO();

            if (user.RoleId != _adminRoleId && user.RoleId != _directorRoleId)
                return new DoctorListDTO();

            const int pageSize = 10;

            var doctorsQuery = _context.Users
                .Where(u => u.RoleId != _adminRoleId && u.RoleId != _superAdminRoleId && u.ClinicId == user.ClinicId)
                .Include(u => u.Role)
                .Include(u => u.Doctor)
                    .ThenInclude(d => d.DoctorPositions)
                        .ThenInclude(dp => dp.Position);

            var totalDoctors = await doctorsQuery.CountAsync();
            var totalPages = (int)Math.Ceiling(totalDoctors / (double)pageSize);

            var doctors = await doctorsQuery
                .OrderBy(u => u.Id)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new DoctorDTOResponseData
                {
                    Id = u.Id,
                    Username = u.Username,
                    Password = u.PasswordPlain,
                    RoleId = u.RoleId,
                    FirstName = u.Doctor.FirstName,
                    LastName = u.Doctor.LastName,
                    SureName = u.Doctor.SureName,
                    Phone = u.Doctor.Phone,
                    Gender = u.Doctor.Gender,
                    Role=new RolesDTO
                    {
                        Id = u.Role.Id,
                        NameUz=u.Role.NameUz,
                        NameRu=u.Role.NameRu,
                        NameEn=u.Role.NameEn,
                    },
                    Positions = u.Doctor.DoctorPositions
                        .Select(dp => new PositionDto
                        {
                            Id = dp.Position.Id,
                            RoleId = dp.Position.RoleId,
                            NameUz = dp.Position.NameUz,
                            NameRu = dp.Position.NameRu,
                            NameEn = dp.Position.NameEn
                        })
                        .ToList()
                })
                .ToListAsync();

            return new DoctorListDTO
            {
                data = doctors,
                TotalCount = totalDoctors,
                TotalPages = totalPages
            };
        }



        public async Task<ParamsStaffDTO?> GetRolesForAddStaff(int role_id)
        {
            if (role_id != _adminRoleId && role_id != _directorRoleId)
            {
                return null;
            }

            var roles = _context.Roles.Where(r => r.Id != _superAdminRoleId && r.Id != _adminRoleId).Select(r => new RolesDTO
            {
                Id = r.Id,
                NameUz = r.NameUz,
                NameRu = r.NameRu,
                NameEn = r.NameEn,

            }).ToList();

            var positions = _context.Positions.Where(r => r.RoleId != _superAdminRoleId && r.RoleId != _adminRoleId).Select(r => new PositionDto
            {
                Id = r.Id,
                RoleId = r.RoleId,
                NameUz = r.NameUz,
                NameRu = r.NameRu,
                NameEn = r.NameEn,

            }).ToList();

            return new ParamsStaffDTO
            {
                Roles= roles,
                Positions= positions,
            };
        }
        public async Task<DoctorDTOResponse> SaveDoctorData(int user_id, DoctorDTORequest dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Id == user_id);
            var doctor = new Doctor();
            
            if (user == null)
                return Fail("user_not_found");

            if (user.RoleId != _adminRoleId && user.RoleId != _directorRoleId)
                return Fail("user_has_not_permission");

            if (dto.Id == null)
            {
                var new_user = new User
                {
                    Id = dto.UserId ?? 0,
                };
                if (dto.Username != null)
                {
                    var existingUser = await _context.Users
                 .FirstOrDefaultAsync(x => x.Username == dto.Username);

                    if (existingUser != null)
                        return Fail("username_already_exists");

                   new_user = new User
                    {
                        Username = dto.Username,
                        PasswordPlain = dto.Password ?? "000",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password??"000"),
                        Status = true,
                        RoleId = dto.RoleId,
                        ClinicId = user.ClinicId
                    };

                    _context.Users.Add(new_user);
                    await _context.SaveChangesAsync();
                }




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
                await _context.SaveChangesAsync();
               
                foreach (var position in dto.Positions)
                {
                    var new_position = new DoctorPosition
                    {
                        DoctorId = doctor.Id,
                        PositionId = position.Id
                    };
                    _context.DoctorPositions.Add(new_position);
                }
                await _context.SaveChangesAsync();
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
                if (dto.Username != null && doctor.User.Username != dto.Username)
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

                if (dto.Positions != null)
                {
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
                    await _context.SaveChangesAsync();
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
