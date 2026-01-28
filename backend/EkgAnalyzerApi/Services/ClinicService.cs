using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class ClinicService
    {
        private readonly MedDataDB _context;
        private int _adminRoleId;
        private int _directorRoleId;
        private int _superAdminRoleId;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpContextAccessor _http;

        public ClinicService(MedDataDB context, IWebHostEnvironment env,
        IHttpContextAccessor http)
        {
            _context = context;
            _env = env;
            _http = http;
            _adminRoleId = 2;
            _directorRoleId = 3;
            _superAdminRoleId = 1;
        }
        public async Task<ClinicDetail> CreateUpdateClinicDetail(ClinicDetailUpsertDto dto)
        {
            ClinicDetail detail;

            // ================= CREATE =================
            if (dto.Id == 0)
            {
                detail = new ClinicDetail
                {
                    ClinicId = dto.ClinicId,
                    BankAccaunt = dto.BankAccaunt,
                    MFO = dto.MFO,
                    BankName = dto.BankName,
                    DistrictId=dto.DistrictId,
                    INN = dto.INN,
                    Address = dto.Address,
                    License = dto.LicenseFile != null
                        ? await SaveLicense(dto.LicenseFile)
                        : null
                };

                _context.ClinicDetails.Add(detail);
            }
            // ================= UPDATE =================
            else
            {
                detail = await _context.ClinicDetails
                    .FirstOrDefaultAsync(x => x.Id == dto.Id)
                    ?? throw new Exception("Clinic detail topilmadi");

                detail.BankAccaunt = dto.BankAccaunt;
                detail.MFO = dto.MFO;
                detail.BankName = dto.BankName;
                detail.INN = dto.INN;
                detail.DistrictId = dto.DistrictId;
                detail.Address = dto.Address;
                detail.UpdatedAt = DateTime.UtcNow;

                if (dto.LicenseFile != null)
                {
                    DeleteOldLicense(detail.License);
                    detail.License = await SaveLicense(dto.LicenseFile);
                }
            }

            await _context.SaveChangesAsync();
            return detail;
        }

        // ================= HELPERS =================

        private async Task<string> SaveLicense(IFormFile file)
        {
            var folder = Path.Combine(_env.WebRootPath, "clinic_licenses");

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var path = Path.Combine(folder, fileName);

            using var stream = new FileStream(path, FileMode.Create);
            await file.CopyToAsync(stream);

            var req = _http.HttpContext!.Request;
            return $"/clinic_licenses/{fileName}";
        }

        private void DeleteOldLicense(string? licenseUrl)
        {
            if (string.IsNullOrEmpty(licenseUrl)) return;

            var fileName = Path.GetFileName(licenseUrl);
            var path = Path.Combine(_env.WebRootPath, "clinic_licenses", fileName);

            if (File.Exists(path))
                File.Delete(path);
        }
        public async Task UpsertClinicPhonesAsync(ClinicPhoneUpsertDto dto)
        {
            // Bazadagi mavjud telefonlar
            var existingPhones = await _context.ClinicPhoneNumbers
                .Where(x => x.ClinicId == dto.ClinicId)
                .ToListAsync();

            // DTO dan kelgan ID lar
            var dtoIds = dto.PhoneNumbers
                .Where(x => x.Id !=null)
                .Select(x => x.Id)
                .ToList();

            // ================= DELETE =================
            // DTO da yo‘q bo‘lgan telefonlarni o‘chiramiz
            var toDelete = existingPhones
                .Where(x => !dtoIds.Contains(x.Id))
                .ToList();

            if (toDelete.Any())
                _context.ClinicPhoneNumbers.RemoveRange(toDelete);

            // ================= ADD / UPDATE =================
            foreach (var phoneDto in dto.PhoneNumbers)
            {
                // YANGI TELEFON
                if (phoneDto.Id == null)
                {
                    _context.ClinicPhoneNumbers.Add(new ClinicPhoneNumber
                    {
                        ClinicId = dto.ClinicId,
                        PhoneNumber = phoneDto.PhoneNumber
                    });
                }
                // MAVJUD TELEFON
                else
                {
                    var phone = existingPhones
                        .FirstOrDefault(x => x.Id == phoneDto.Id);

                    if (phone != null)
                    {
                        phone.PhoneNumber = phoneDto.PhoneNumber;
                        phone.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            await _context.SaveChangesAsync();
        }
        public async Task<Clinic> UpsertAsync(ClinicUpsertDto dto)
        {
            Clinic clinic;

            // ================= CREATE =================
            if (dto.Id == null || dto.Id == 0)
            {
                if (dto.ClinicLogo == null)
                    throw new Exception("Logo majburiy");

                clinic = new Clinic
                {
                    ClinicName = dto.ClinicName,
                    ClinicLogo = await SaveLogo(dto.ClinicLogo)
                };

                _context.Clinics.Add(clinic);
            }
            // ================= UPDATE =================
            else
            {
                clinic = await _context.Clinics
                    .FirstOrDefaultAsync(x => x.Id == dto.Id.Value)
                    ?? throw new Exception("Clinic topilmadi");

                clinic.ClinicName = dto.ClinicName;

                if (dto.ClinicLogo != null)
                {
                    DeleteOldLogo(clinic.ClinicLogo);
                    clinic.ClinicLogo = await SaveLogo(dto.ClinicLogo);
                }
            }

            await _context.SaveChangesAsync();
            return clinic;
        }

        // ================= HELPERS =================

        private async Task<string> SaveLogo(IFormFile file)
        {
            var folder = Path.Combine(_env.WebRootPath, "clinicbrands");

            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var path = Path.Combine(folder, fileName);

            using var stream = new FileStream(path, FileMode.Create);
            await file.CopyToAsync(stream);

            var request = _http.HttpContext!.Request;
            return $"/clinicbrands/{fileName}";
        }

        private void DeleteOldLogo(string logoUrl)
        {
            if (string.IsNullOrEmpty(logoUrl)) return;

            var fileName = Path.GetFileName(logoUrl);
            var path = Path.Combine(_env.WebRootPath, "clinicbrands", fileName);

            if (File.Exists(path))
                File.Delete(path);
        }
        public async Task<ClinicDTO> GetClinicByIdAsync(int user_id, int id)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Id == user_id);

            if (user == null)
                return new ClinicDTO();

            if (user.RoleId != _adminRoleId && user.RoleId != _directorRoleId)
                return new ClinicDTO();

            var clinic = await _context.Clinics.Include(c => c.ClinicDetail).ThenInclude(x=>x.District).ThenInclude(r => r.Region)
    .Where(c => c.Id == id)
    .Select(c => new ClinicDTO
    {
        Id = c.Id,
        ClinicName = c.ClinicName,
        ClinicLogo = c.ClinicLogo,

        ClinicDetail = c.ClinicDetail == null ? null : new ClinicDetailDTO
        {
            Id = c.ClinicDetail.Id,
            ClinicId = c.ClinicDetail.ClinicId,
            BankAccaunt = c.ClinicDetail.BankAccaunt,
            MFO = c.ClinicDetail.MFO,
            BankName = c.ClinicDetail.BankName,
            INN = c.ClinicDetail.INN,
            License = c.ClinicDetail.License,
            Address = c.ClinicDetail.Address,
            Region=c.ClinicDetail.District.Region,
            District = c.ClinicDetail.District
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
