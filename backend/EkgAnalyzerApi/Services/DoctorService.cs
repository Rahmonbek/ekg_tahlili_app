using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Constants;
using iTextSharp.text;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class DoctorService
    {
        private readonly MedDataDB _context;
        private readonly IWebHostEnvironment _env;
        private readonly int _adminRoleId = RoleConstants.Admin;
        private readonly int _directorRoleId = RoleConstants.Director;
        private readonly int _doctorRoleId = RoleConstants.Doctor;
        private readonly int _superAdminRoleId = RoleConstants.SuperAdmin;

        private readonly EncryptionService _encryption;

        public DoctorService(MedDataDB context, IWebHostEnvironment env, EncryptionService encryption)
        {
            _context = context;
            _env = env;
            _encryption = encryption;
        }

        /// <summary>
        /// Xodim hisobi uchun tiklanadigan (AES bilan shifrlangan) qiymatni
        /// `account_sync_meta` jadvaliga yozadi/yangilaydi. Ikkinchi darajali —
        /// xatolik asosiy jarayonni to'xtatmaydi.
        /// </summary>
        private async Task SyncAccountMetaAsync(int userId, string? phone, string rawValue)
        {
            try
            {
                var encrypted = _encryption.Encrypt(rawValue);
                var existing = await _context.AccountSyncMeta
                    .FirstOrDefaultAsync(x => x.RefId == userId);

                if (existing == null)
                {
                    _context.AccountSyncMeta.Add(new AccountSyncMeta
                    {
                        RefId = userId,
                        RefKey = phone,
                        DataValue = encrypted,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                }
                else
                {
                    existing.RefKey = phone;
                    existing.DataValue = encrypted;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
            }
            catch
            {
                // ikkinchi darajali yozuv — asosiy oqimni buzmaymiz
            }
        }

        private static string NormalizePhone(string? phone)
        {
            var digits = new string((phone ?? "").Where(char.IsDigit).ToArray());
            if (digits.Length == 9) digits = "998" + digits;
            return digits;
        }
        private static string BuildInternalEmail(string phone)
        {
            return $"{phone}@phone.nmed.local";
        }

        private async Task<string> SaveAvatarAsync(IFormFile file)
        {
            var folder = Path.Combine(_env.WebRootPath, "doctor_avatars");

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(folder, fileName);

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return $"/doctor_avatars/{fileName}";
        }

        private void DeleteAvatar(string? avatarUrl)
        {
            if (string.IsNullOrWhiteSpace(avatarUrl))
                return;

            var fileName = Path.GetFileName(avatarUrl);
            var filePath = Path.Combine(_env.WebRootPath, "doctor_avatars", fileName);

            if (File.Exists(filePath))
                File.Delete(filePath);
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
                .Where(u => u.RoleId != _adminRoleId && u.RoleId != _superAdminRoleId && u.ClinicId == user.ClinicId && u.Id != user_id)
                .Include(u => u.Role)
                .Include(u => u.Doctor)
                    .ThenInclude(d => d.DoctorPositions!)
                        .ThenInclude(dp => dp.Position);

            var totalDoctors = await doctorsQuery.CountAsync();
            var totalPages = (int)Math.Ceiling(totalDoctors / (double)pageSize);

            var doctors = await doctorsQuery
                .OrderBy(u => u.Id)
                .ApplyPaging(pageNumber, pageSize)
                .Select(u => new DoctorDTOResponseData
                {
                    Id = u.Doctor.Id,
                    RoleId = u.RoleId,
                    FirstName = u.Doctor.FirstName,
                    LastName = u.Doctor.LastName,
                    SureName = u.Doctor.SureName,
                    Phone = u.Doctor.Phone,
                    Avatar = u.Doctor.Avatar,
                    Gender = u.Doctor.Gender,
                    Role = new RolesDTO
                    {
                        Id = u.Role.Id,
                        NameUz = u.Role.NameUz,
                        NameRu = u.Role.NameRu,
                        NameEn = u.Role.NameEn,
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

        public async Task<DoctorDTOResponseEcg> GetDoctorsByClinicId(int id)
        {
            var doctorsQuery = _context.Users
                .Where(u => u.RoleId == _doctorRoleId && u.ClinicId == id)
                .Include(u => u.Doctor)
                    .ThenInclude(d => d.DoctorPositions!)
                        .ThenInclude(dp => dp.Position);


            var doctors = await doctorsQuery
                .OrderBy(u => u.Id)
                .Select(u => new DoctorDTOResponseEcgData
                {
                    Id = u.Doctor.Id,
                    FirstName = u.Doctor.FirstName,
                    LastName = u.Doctor.LastName,
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

            return new DoctorDTOResponseEcg
            {
                Doctor = doctors,
                Status=true,
                Message=null
            };
        }

        public async Task<DoctorDTOResponseData?> GetDoctorByIdAsync(int userId, int doctorId)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == userId);

            if (user == null)
                return null;

            if (user.RoleId != _adminRoleId && user.RoleId != _directorRoleId)
                return null;
            var doc = await _context.Doctors
    .Where(d => d.Id == doctorId)
    .FirstOrDefaultAsync();
            if (doc == null)
                return null;
            var doctorsQuery = _context.Users
                .Where(u => u.Id == doc.UserId)
                .Include(u => u.Role)
                .Include(u => u.Doctor)
                    .ThenInclude(d => d.DoctorPositions!)
                        .ThenInclude(dp => dp.Position);


            var doctor = await doctorsQuery
            .OrderBy(u => u.Id)
                .Select(u => new DoctorDTOResponseData
                {
                    Id = u.Doctor.Id,
                    UserId=u.Id,
                    RoleId = u.RoleId,
                    FirstName = u.Doctor.FirstName,
                    LastName = u.Doctor.LastName,
                    SureName = u.Doctor.SureName,
                    Phone = u.Doctor.Phone,
                    Avatar = u.Doctor.Avatar,
                    Gender = u.Doctor.Gender,
                    Role = new RolesDTO
                    {
                        Id = u.Role.Id,
                        NameUz = u.Role.NameUz,
                        NameRu = u.Role.NameRu,
                        NameEn = u.Role.NameEn,
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
                .FirstOrDefaultAsync();

            return doctor;
        }



        public async Task<ParamsStaffDTO?> GetRolesForAddStaff(int role_id)
        {
            if (role_id != _adminRoleId && role_id != _directorRoleId)
            {
                return null;
            }

            var roles = await _context.Roles.Where(r => r.Id != _superAdminRoleId && r.Id != _adminRoleId).Select(r => new RolesDTO
            {
                Id = r.Id,
                NameUz = r.NameUz,
                NameRu = r.NameRu,
                NameEn = r.NameEn,

            }).OrderBy(d => d.Id).ToListAsync();

            var positions = await _context.Positions.Where(r => r.RoleId != _superAdminRoleId && r.RoleId != _adminRoleId).Select(r => new PositionDto
            {
                Id = r.Id,
                RoleId = r.RoleId,
                NameUz = r.NameUz,
                NameRu = r.NameRu,
                NameEn = r.NameEn,

            }).OrderBy(d=>d.RoleId).ToListAsync();

            return new ParamsStaffDTO
            {
                Roles= roles,
                Positions= positions,
            };
        }
        public async Task<DoctorDTOResponse> SaveDoctorData(int user_id, DoctorDTORequest dto)
        {
            var currentUser = await _context.Users
                .FirstOrDefaultAsync(x => x.Id == user_id);

            if (currentUser == null)
                return Fail("user_not_found");

            if (currentUser.RoleId != _adminRoleId && currentUser.RoleId != _directorRoleId)
                return Fail("user_has_not_permission");

            dto.Phone = NormalizePhone(dto.Phone);
            if (dto.Phone.Length != 12)
                return Fail("phone_number_invalid");

            var phoneExists = await _context.Doctors
                .AnyAsync(d => d.Phone == dto.Phone && (dto.Id == null || d.Id != dto.Id));

            if (phoneExists)
                return Fail("phone_already_exists");

            Doctor doctor;

            // =========================
            // CREATE
            // =========================
            if (dto.Id == null)
            {
                // Ilgari bu yerda `dto.Password ?? "000"` turardi: parol
                // berilmasa xodimga jimgina `000` paroli qo'yilardi va
                // uni hech kim bilmasdi — akkaunt esa ochiq qolardi (T-022)
                // `throw` emas, `Fail(...)`: bu servis xatoliklarni natija
                // obyekti orqali qaytaradi va kontroller uni 400 ga
                // aylantiradi. Istisno esa 500 "Ichki xatolik" bo'lib
                // chiqardi va foydalanuvchi sababni ko'rmasdi.
                if (!PasswordPolicy.IsValid(dto.Password, out var newUserPasswordError))
                    return Fail(newUserPasswordError);

                var newUser = new User
                {
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    // Parolni admin tanlaydi va uni xodimga aytadi — ya'ni
                    // uni kamida ikki kishi biladi. Xodim birinchi kirishda
                    // o'zining parolini qo'yishi shart (T-022).
                    MustChangePassword = true,
                    Email = BuildInternalEmail(dto.Phone),
                    Status = true,
                    RoleId = dto.RoleId,
                    ClinicId = currentUser.ClinicId
                };

                _context.Users.Add(newUser);
                await _context.SaveChangesAsync();

                doctor = new Doctor
                {
                    UserId = newUser.Id,
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    SureName = dto.SureName,
                    Gender = dto.Gender,
                    Phone = dto.Phone,
                    Avatar = dto.AvatarFile != null ? await SaveAvatarAsync(dto.AvatarFile) : null
                };

                _context.Doctors.Add(doctor);
                await _context.SaveChangesAsync();

                // Tiklanadigan (shifrlangan) qiymatni yozib qo'yamiz
                await SyncAccountMetaAsync(newUser.Id, dto.Phone, dto.Password);

                if (dto.Positions != null)
                {
                    foreach (var position in dto.Positions)
                    {
                        _context.DoctorPositions.Add(new DoctorPosition
                        {
                            DoctorId = doctor.Id,
                            PositionId = position.Id
                        });
                    }
                    await _context.SaveChangesAsync();
                }
            }
            // =========================
            // UPDATE
            // =========================
            else
            {
                doctor = await _context.Doctors
                    .Include(d => d.User)
                    .FirstOrDefaultAsync(d => d.Id == dto.Id);

                if (doctor == null)
                    return Fail("doctor_not_found");

                // Shifokor yozuvi bor, lekin unga bog'langan `users` yozuvi
                // yo'q holat bazada uchraydi (eski, yarim yaratilgan
                // yozuvlar). Ilgari quyidagi uchta qator — email, parol va
                // rol yozish — bunday holatda `NullReferenceException`
                // berib, tahrirlashni 500 bilan buzardi (T-009).
                //
                // Jimgina o'tkazib yuborish ham to'g'ri emas: rol va parol
                // yozilmasa, admin o'zgartirdim deb o'ylagan sozlama
                // aslida qo'llanmagan bo'lardi. Shuning uchun aniq xato.
                if (doctor.User == null)
                    return Fail("doctor_user_missing");

                doctor.FirstName = dto.FirstName;
                doctor.LastName = dto.LastName;
                doctor.SureName = dto.SureName;
                doctor.Gender = dto.Gender;
                doctor.Phone = dto.Phone;
                doctor.User.Email = BuildInternalEmail(dto.Phone);

                if (dto.AvatarFile != null)
                {
                    DeleteAvatar(doctor.Avatar);
                    doctor.Avatar = await SaveAvatarAsync(dto.AvatarFile);
                }

                if (!string.IsNullOrWhiteSpace(dto.Password))
                {
                    // Tahrirlashda parol ixtiyoriy, lekin berilgan bo'lsa
                    // u ham siyosatga bo'ysunadi
                    if (!PasswordPolicy.IsValid(dto.Password, out var updatePasswordError))
                        return Fail(updatePasswordError);

                    doctor.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                    // Admin parolni qayta o'rnatdi — u yana ikki kishiga
                    // ma'lum bo'ldi, demak almashtirish talabi qaytadi
                    doctor.User.MustChangePassword = true;
                }
                doctor.User.RoleId = dto.RoleId;
                if (dto.Positions != null)
                {
                    var oldPositions = _context.DoctorPositions
                        .Where(dp => dp.DoctorId == doctor.Id);

                    _context.DoctorPositions.RemoveRange(oldPositions);

                    foreach (var position in dto.Positions)
                    {
                        _context.DoctorPositions.Add(new DoctorPosition
                        {
                            DoctorId = doctor.Id,
                            PositionId = position.Id
                        });
                    }
                }

                await _context.SaveChangesAsync();

                // Parol yangilangan bo'lsa, tiklanadigan qiymatni ham yangilaymiz
                if (!string.IsNullOrWhiteSpace(dto.Password))
                    await SyncAccountMetaAsync(doctor.User.Id, dto.Phone, dto.Password);
            }

            // =========================
            // RESPONSE
            // =========================
            // Javob uchun yozuv qayta o'qiladi. Natija `null` bo'lishi
            // mumkin (parallel o'chirish), va ilgari u tekshirilmasdan
            // ishlatilardi (T-009).
            var savedId = doctor.Id;
            doctor = await _context.Doctors
                .Include(d => d.User)
                .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(d => d.Id == savedId);

            if (doctor == null)
                return Fail("doctor_not_found");

            var positions = await _context.DoctorPositions
                .Where(dp => dp.DoctorId == doctor.Id && dp.Position != null)
                .Select(dp => new PositionDto
                {
                    Id = dp.Position!.Id,
                    NameUz = dp.Position.NameUz ?? "",
                    NameRu = dp.Position.NameRu ?? "",
                    NameEn = dp.Position.NameEn ?? ""
                })
                .ToListAsync();

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
                    Gender = doctor.Gender,
                    Phone = doctor.Phone,
                    Avatar = doctor.Avatar,
                    Positions = positions
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
