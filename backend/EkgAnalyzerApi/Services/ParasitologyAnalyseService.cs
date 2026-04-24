using System.Net.Http.Headers;
using System.Text.Json;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    public class ParasitologyAnalyseService
    {
        private readonly MedDataDB _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ParasitologyAnalyseService> _logger;
        private readonly IWebHostEnvironment _env;

        public ParasitologyAnalyseService(
            MedDataDB context,
            IHttpClientFactory httpClientFactory,
            ILogger<ParasitologyAnalyseService> logger,
            IWebHostEnvironment env)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _env = env;
        }

        public async Task<ParasitologyAnalyseDTO> SaveAndAnalyzeAsync(
            IFormFile file,
            ParasitologyAnalyseCreateDto dto,
            string jwtToken)
        {
            var filePath = await SaveFileAsync(file);

            var analysis = new ParasitologyAnalyses
            {
                PatcientId = dto.PatcientId,
                ClinicId = dto.ClinicId,
                CreatedDoctorId = dto.CreatedDoctorId,
                FilePath = filePath,
                MicroscopyMethod = dto.MicroscopyMethod,
                Magnification = dto.Magnification,
                EggCountPerField = dto.EggCountPerField,
                AnalysisStatus = "pending",
                Lang = dto.Lang,
                AnalysisDate = dto.AnalysisDate,
            };
            _context.ParasitologyAnalyses.Add(analysis);
            await _context.SaveChangesAsync();

            if (dto.DoctorIds != null)
            {
                foreach (var doctorId in dto.DoctorIds)
                {
                    _context.ParasitologyAnalysisDoctors.Add(new ParasitologyAnalysisDoctors
                    {
                        ParasitologyAnalysisId = analysis.Id,
                        DoctorId = doctorId
                    });
                }
                await _context.SaveChangesAsync();
            }

            await RunAiAndSaveAsync(analysis, file, dto, jwtToken);

            return await GetByIdAsync(analysis.Id);
        }

        public async Task<ParasitologyAnalyseDTO?> SendToAiAsync(int id, string jwtToken)
        {
            var analysis = await _context.ParasitologyAnalyses
                .Include(a => a.Patcient)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (analysis == null) return null;
            if (analysis.AnalysisStatus != "not_analyzed")
                return null;

            var fullPath = Path.Combine(_env.WebRootPath, analysis.FilePath!.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(fullPath))
            {
                _logger.LogWarning("Parazitologiya fayl topilmadi: {Path}", fullPath);
                return null;
            }

            var fileBytes = await File.ReadAllBytesAsync(fullPath);
            var fileName = Path.GetFileName(fullPath);

            var dto = new ParasitologyAnalyseCreateDto
            {
                PatcientId = analysis.PatcientId,
                ClinicId = analysis.ClinicId ?? 0,
                CreatedDoctorId = analysis.CreatedDoctorId,
                MicroscopyMethod = analysis.MicroscopyMethod,
                Magnification = analysis.Magnification,
                EggCountPerField = analysis.EggCountPerField,
                Lang = analysis.Lang ?? "uz",
            };

            var patcient = analysis.Patcient;
            var age = patcient != null
                ? (int)((DateTime.UtcNow - patcient.BirthDate.ToDateTime(TimeOnly.MinValue)).TotalDays / 365.25)
                : 0;

            await RunAiWithBytesAsync(analysis, fileBytes, fileName, dto, age,
                patcient?.Gender == true ? "erkak" : "ayol", jwtToken);

            return await GetByIdAsync(analysis.Id);
        }

        public async Task<PagedResult<ParasitologyAnalyseDTO>> GetByPatientIdAsync(int patientId, int page = 1, int pageSize = 5)
        {
            var query = _context.ParasitologyAnalyses
                .Where(a => a.PatcientId == patientId);

            var total = await query.CountAsync();

            var ids = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => a.Id)
                .ToListAsync();

            var items = new List<ParasitologyAnalyseDTO>();
            foreach (var id in ids)
                items.Add(await GetByIdAsync(id));

            return new PagedResult<ParasitologyAnalyseDTO>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PagedResult<ParasitologyAnalyseListDTO>> GetByClinicAsync(
            int clinicId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            string? status = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null,
            int? jiddiylik = null,
            bool? hasDiagnosis = null)
        {
            var query = _context.ParasitologyAnalyses
                .Where(a => a.ClinicId == clinicId)
                .Include(a => a.Patcient)
                .Include(a => a.CreatedDoctor)
                .AsQueryable();

            query = ApplyParasitologyFilters(query, search, status, dateFrom, dateTo, jiddiylik, clinicId, hasDiagnosis);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ParasitologyAnalyseListDTO
                {
                    Id = a.Id,
                    AnalysisStatus = a.AnalysisStatus,
                    JiddiylikDarajasi = a.JiddiylikDarajasi,
                    CreatedAt = a.CreatedAt,
                    AnalysisDate = a.AnalysisDate,
                    Patcient = a.Patcient == null ? null : new PatcientForECG
                    {
                        Id = a.Patcient.Id,
                        BirthDate = a.Patcient.BirthDate,
                        Gender = a.Patcient.Gender,
                        FirstName = a.Patcient.FirstName,
                        LastName = a.Patcient.LastName,
                        SureName = a.Patcient.SureName,
                        Passport = a.Patcient.Passport
                    },
                    CreatedDoctor = a.CreatedDoctor == null ? null : new DoctorForECGData
                    {
                        Id = a.CreatedDoctor.Id,
                        FirstName = a.CreatedDoctor.FirstName,
                        LastName = a.CreatedDoctor.LastName,
                        SureName = a.CreatedDoctor.SureName
                    }
                })
                .ToListAsync();

            return new PagedResult<ParasitologyAnalyseListDTO>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PagedResult<ParasitologyAnalyseListDTO>> GetByDoctorAsync(
            int doctorId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            string? status = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null,
            int? jiddiylik = null,
            bool? hasDiagnosis = null)
        {
            var query = _context.ParasitologyAnalyses
                .Where(a => a.Doctors!.Any(d => d.DoctorId == doctorId))
                .Include(a => a.Patcient)
                .Include(a => a.CreatedDoctor)
                .Include(a => a.Doctors)
                .AsQueryable();

            query = ApplyParasitologyFilters(query, search, status, dateFrom, dateTo, jiddiylik, null, hasDiagnosis);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ParasitologyAnalyseListDTO
                {
                    Id = a.Id,
                    AnalysisStatus = a.AnalysisStatus,
                    JiddiylikDarajasi = a.JiddiylikDarajasi,
                    CreatedAt = a.CreatedAt,
                    AnalysisDate = a.AnalysisDate,
                    Patcient = a.Patcient == null ? null : new PatcientForECG
                    {
                        Id = a.Patcient.Id,
                        BirthDate = a.Patcient.BirthDate,
                        Gender = a.Patcient.Gender,
                        FirstName = a.Patcient.FirstName,
                        LastName = a.Patcient.LastName,
                        SureName = a.Patcient.SureName,
                        Passport = a.Patcient.Passport
                    },
                    CreatedDoctor = a.CreatedDoctor == null ? null : new DoctorForECGData
                    {
                        Id = a.CreatedDoctor.Id,
                        FirstName = a.CreatedDoctor.FirstName,
                        LastName = a.CreatedDoctor.LastName,
                        SureName = a.CreatedDoctor.SureName
                    }
                })
                .ToListAsync();

            return new PagedResult<ParasitologyAnalyseListDTO>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<PagedResult<ParasitologyAnalyseListDTO>> GetByNurseAsync(
            int doctorId,
            int page = 1,
            int pageSize = 10,
            string? search = null,
            string? status = null,
            DateTime? dateFrom = null,
            DateTime? dateTo = null,
            int? jiddiylik = null,
            bool? hasDiagnosis = null)
        {
            var query = _context.ParasitologyAnalyses
                .Where(a => a.CreatedDoctorId == doctorId)
                .Include(a => a.Patcient)
                .Include(a => a.CreatedDoctor)
                .AsQueryable();

            query = ApplyParasitologyFilters(query, search, status, dateFrom, dateTo, jiddiylik, null, hasDiagnosis);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ParasitologyAnalyseListDTO
                {
                    Id = a.Id,
                    AnalysisStatus = a.AnalysisStatus,
                    JiddiylikDarajasi = a.JiddiylikDarajasi,
                    CreatedAt = a.CreatedAt,
                    AnalysisDate = a.AnalysisDate,
                    Patcient = a.Patcient == null ? null : new PatcientForECG
                    {
                        Id = a.Patcient.Id,
                        BirthDate = a.Patcient.BirthDate,
                        Gender = a.Patcient.Gender,
                        FirstName = a.Patcient.FirstName,
                        LastName = a.Patcient.LastName,
                        SureName = a.Patcient.SureName,
                        Passport = a.Patcient.Passport
                    },
                    CreatedDoctor = a.CreatedDoctor == null ? null : new DoctorForECGData
                    {
                        Id = a.CreatedDoctor.Id,
                        FirstName = a.CreatedDoctor.FirstName,
                        LastName = a.CreatedDoctor.LastName,
                        SureName = a.CreatedDoctor.SureName
                    }
                })
                .ToListAsync();

            return new PagedResult<ParasitologyAnalyseListDTO>
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        private IQueryable<ParasitologyAnalyses> ApplyParasitologyFilters(
            IQueryable<ParasitologyAnalyses> query,
            string? search,
            string? status,
            DateTime? dateFrom,
            DateTime? dateTo,
            int? jiddiylik,
            int? clinicId,
            bool? hasDiagnosis)
        {
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(a => a.AnalysisStatus == status);

            if (dateFrom.HasValue)
            {
                var utcFrom = DateTime.SpecifyKind(dateFrom.Value, DateTimeKind.Utc);
                query = query.Where(a => (a.AnalysisDate ?? a.CreatedAt) >= utcFrom);
            }

            if (dateTo.HasValue)
            {
                var utcTo = DateTime.SpecifyKind(dateTo.Value.Date.AddDays(1), DateTimeKind.Utc);
                query = query.Where(a => (a.AnalysisDate ?? a.CreatedAt) <= utcTo);
            }

            if (jiddiylik.HasValue)
                query = query.Where(a => a.JiddiylikDarajasi == jiddiylik.Value);

            if (hasDiagnosis.HasValue)
            {
                if (hasDiagnosis.Value)
                {
                    query = query.Where(e => _context.AnalysisDiagnoses.Any(d => d.AnalysisType == "para" && d.AnalysisId == e.Id));
                }
                else
                {
                    query = query.Where(e => !_context.AnalysisDiagnoses.Any(d => d.AnalysisType == "para" && d.AnalysisId == e.Id));
                }
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var sLower = search.Trim().ToLower();
                var isPassport = System.Text.RegularExpressions.Regex.IsMatch(search.Replace(" ", ""), @"^[A-Za-z]{2}\d+$");
                if (isPassport && clinicId.HasValue)
                {
                    // Passport search — executed in memory
                    var normalizedSearch = search.Replace(" ", "").ToUpper();
                    var clinicPatientIds = _context.ParasitologyAnalyses
                        .Where(a => a.ClinicId == clinicId)
                        .Select(a => a.PatcientId)
                        .Distinct()
                        .ToList();
                    var patients = _context.Patcients
                        .Where(p => clinicPatientIds.Contains(p.Id))
                        .Select(p => new { p.Id, p.Passport })
                        .ToList();
                    var matchingIds = patients
                        .Where(p => p.Passport != null && p.Passport.Replace(" ", "").ToUpper().Contains(normalizedSearch))
                        .Select(p => p.Id)
                        .ToList();
                    query = query.Where(a => matchingIds.Contains(a.PatcientId));
                }
                else
                {
                    query = query.Where(a =>
                        (a.Patcient.FirstName != null && a.Patcient.FirstName.ToLower().Contains(sLower)) ||
                        (a.Patcient.LastName != null && a.Patcient.LastName.ToLower().Contains(sLower)) ||
                        (a.Patcient.SureName != null && a.Patcient.SureName.ToLower().Contains(sLower)));
                }
            }

            return query;
        }

        public async Task<ParasitologyStatisticsDto> GetStatisticsAsync(
            string? viloyat, string? tuman, string? yiloyAy,
            string? helminthType, DateTime? dateFrom, DateTime? dateTo)
        {
            var query = _context.ParasitologyResults.AsQueryable();

            if (!string.IsNullOrWhiteSpace(viloyat))
                query = query.Where(r => r.Viloyat == viloyat);

            if (!string.IsNullOrWhiteSpace(tuman))
                query = query.Where(r => r.Tuman == tuman);

            if (!string.IsNullOrWhiteSpace(helminthType))
                query = query.Where(r => r.HelminthType == helminthType);

            if (dateFrom.HasValue)
                query = query.Where(r => r.AnalysisDate >= DateOnly.FromDateTime(dateFrom.Value));

            if (dateTo.HasValue)
                query = query.Where(r => r.AnalysisDate <= DateOnly.FromDateTime(dateTo.Value));

            if (!string.IsNullOrWhiteSpace(yiloyAy) && DateTime.TryParse(yiloyAy + "-01", out var parsedMonth))
            {
                var d = DateOnly.FromDateTime(parsedMonth);
                query = query.Where(r => r.AnalysisDate.HasValue &&
                    r.AnalysisDate.Value.Year == d.Year &&
                    r.AnalysisDate.Value.Month == d.Month);
            }

            var results = await query.ToListAsync();

            var analysisIds = results.Select(r => r.ParasitologyAnalysisId).Distinct().ToList();
            var jamiTahlillar = await _context.ParasitologyAnalyses
                .Where(a => dateFrom == null || (a.AnalysisDate ?? a.CreatedAt) >= dateFrom)
                .Where(a => dateTo == null || (a.AnalysisDate ?? a.CreatedAt) <= dateTo)
                .CountAsync();

            var gijjaTopilgan = analysisIds.Count;
            var topilmagan = jamiTahlillar - gijjaTopilgan;

            var engKopTurlar = results
                .GroupBy(r => new { r.HelminthType, r.HelminthNameUz })
                .Select(g => new HelminthStatDto
                {
                    Tur = g.Key.HelminthType,
                    UzNomi = g.Key.HelminthNameUz,
                    Soni = g.Count(),
                    Foizi = jamiTahlillar > 0 ? Math.Round((decimal)g.Count() / jamiTahlillar * 100, 1) : 0
                })
                .OrderByDescending(x => x.Soni)
                .Take(10)
                .ToList();

            var viloyatlarBoyicha = results
                .Where(r => !string.IsNullOrWhiteSpace(r.Viloyat))
                .GroupBy(r => r.Viloyat)
                .Select(g => new ViloyatStatDto
                {
                    Viloyat = g.Key,
                    Soni = g.Count(),
                    OgirSoni = g.Count(r => r.InfectionLevel == "heavy")
                })
                .OrderByDescending(x => x.Soni)
                .ToList();

            var yoshGuruhlari = results
                .Where(r => !string.IsNullOrWhiteSpace(r.PatientAgeGroup))
                .GroupBy(r => r.PatientAgeGroup)
                .Select(g => new YoshGuruhStatDto
                {
                    Guruh = g.Key,
                    Soni = g.Count(),
                    Foizi = results.Count > 0 ? Math.Round((decimal)g.Count() / results.Count * 100, 1) : 0
                })
                .ToList();

            var oylikDinamika = await _context.ParasitologyAnalyses
                .Where(a => dateFrom == null || a.CreatedAt >= dateFrom)
                .Where(a => dateTo == null || a.CreatedAt <= dateTo)
                .GroupBy(a => new { a.CreatedAt!.Value.Year, a.CreatedAt.Value.Month })
                .Select(g => new OylikDinamikaDto
                {
                    Oy = $"{g.Key.Year}-{g.Key.Month:D2}",
                    Soni = g.Count(),
                    Topilgan = g.Count(a => a.AnalysisStatus == "analyzed" && a.JiddiylikDarajasi != null)
                })
                .OrderBy(x => x.Oy)
                .ToListAsync();

            return new ParasitologyStatisticsDto
            {
                JamiTahlillar = jamiTahlillar,
                GijjaTopilgan = gijjaTopilgan,
                Topilmagan = Math.Max(topilmagan, 0),
                EngKopTurlar = engKopTurlar,
                ViloyatlarBoyicha = viloyatlarBoyicha,
                YoshGuruhlari = yoshGuruhlari,
                OylikDinamika = oylikDinamika
            };
        }

        private async Task<string> SaveFileAsync(IFormFile file)
        {
            var folderName = DateTime.UtcNow.ToString("yyyyMM");
            var uploadDir = Path.Combine(_env.WebRootPath, "uploads", "parasitology", folderName);
            Directory.CreateDirectory(uploadDir);

            var safeName = file.FileName.Replace(" ", "_");
            var uniqueName = GetUniqueFileName(uploadDir, safeName);
            var fullPath = Path.Combine(uploadDir, uniqueName);

            using var stream = new FileStream(fullPath, FileMode.Create);
            await file.CopyToAsync(stream);

            return $"/uploads/parasitology/{folderName}/{uniqueName}";
        }

        private static string GetUniqueFileName(string directory, string fileName)
        {
            if (!File.Exists(Path.Combine(directory, fileName)))
                return fileName;

            var name = Path.GetFileNameWithoutExtension(fileName);
            var ext = Path.GetExtension(fileName);
            int counter = 1;
            while (true)
            {
                var candidate = $"{name}_{counter}{ext}";
                if (!File.Exists(Path.Combine(directory, candidate)))
                    return candidate;
                counter++;
            }
        }

        private async Task RunAiAndSaveAsync(
            ParasitologyAnalyses analysis,
            IFormFile file,
            ParasitologyAnalyseCreateDto dto,
            string jwtToken)
        {
            var bytes = new byte[file.Length];
            using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms);
                bytes = ms.ToArray();
            }

            var patcient = await _context.Patcients.FindAsync(dto.PatcientId);
            var age = patcient != null
                ? (int)((DateTime.UtcNow - patcient.BirthDate.ToDateTime(TimeOnly.MinValue)).TotalDays / 365.25)
                : 0;
            var gender = patcient?.Gender == true ? "erkak" : "ayol";

            await RunAiWithBytesAsync(analysis, bytes, file.FileName, dto, age, gender, jwtToken);
        }

        private async Task RunAiWithBytesAsync(
            ParasitologyAnalyses analysis,
            byte[] fileBytes,
            string fileName,
            ParasitologyAnalyseCreateDto dto,
            int age,
            string gender,
            string jwtToken)
        {
            try
            {
                var client = _httpClientFactory.CreateClient("PythonApi");
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", jwtToken);

                using var form = new MultipartFormDataContent();
                var fileContent = new ByteArrayContent(fileBytes);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue(
                    fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ? "image/png" : "image/jpeg");
                form.Add(fileContent, "file", fileName);
                form.Add(new StringContent(dto.MicroscopyMethod ?? "direct_smear"), "microscopy_method");
                form.Add(new StringContent(dto.Magnification ?? "400x"), "magnification");
                form.Add(new StringContent(gender), "gender");
                form.Add(new StringContent(age.ToString()), "age");
                form.Add(new StringContent((dto.EggCountPerField ?? 0).ToString()), "egg_count_per_field");
                form.Add(new StringContent(dto.Lang), "lang");

                var response = await client.PostAsync("/analyze-parasitology", form);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Python API xatolik {StatusCode}: {Content}", response.StatusCode, content);
                    analysis.AnalysisStatus = "failed";
                    analysis.AiResponse = content;
                    await _context.SaveChangesAsync();
                    return;
                }

                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;

                if (root.TryGetProperty("xato", out _))
                {
                    analysis.AnalysisStatus = "failed";
                    analysis.AiResponse = content;
                    await _context.SaveChangesAsync();
                    return;
                }

                if (!root.TryGetProperty("ai_response", out var aiResponseEl))
                {
                    analysis.AnalysisStatus = "failed";
                    analysis.AiResponse = content;
                    await _context.SaveChangesAsync();
                    return;
                }

                analysis.AiResponse = aiResponseEl.GetRawText();
                analysis.AnalysisStatus = "analyzed";

                if (aiResponseEl.TryGetProperty("jami_jiddiylik", out var jiddiylik))
                    analysis.JiddiylikDarajasi = jiddiylik.TryGetInt32(out var j) ? j : null;

                await _context.SaveChangesAsync();

                if (aiResponseEl.TryGetProperty("aniqlangan_turlar", out var turlar) &&
                    turlar.ValueKind == JsonValueKind.Array)
                {
                    foreach (var tur in turlar.EnumerateArray())
                    {
                        var result = new ParasitologyResults
                        {
                            ParasitologyAnalysisId = analysis.Id,
                            HelminthType = tur.TryGetProperty("lotin_nomi", out var ln) ? ln.GetString() : null,
                            HelminthNameUz = tur.TryGetProperty("uz_nomi", out var uz) ? uz.GetString() : null,
                            HelminthNameRu = tur.TryGetProperty("ru_nomi", out var ru) ? ru.GetString() : null,
                            HelminthNameEn = tur.TryGetProperty("en_nomi", out var en) ? en.GetString() : null,
                            Confidence = tur.TryGetProperty("ishonch_darajasi", out var conf)
                                && conf.TryGetDecimal(out var cd) ? cd : null,
                            InfectionLevel = tur.TryGetProperty("infektsiya_darajasi", out var il) ? il.GetString() : null,
                            AnalysisDate = DateOnly.FromDateTime(DateTime.UtcNow),
                            PatientGender = gender == "erkak",
                        };

                        var patcient = await _context.Patcients.FindAsync(analysis.PatcientId);
                        if (patcient != null)
                        {
                            var ageYears = (int)((DateTime.UtcNow - patcient.BirthDate.ToDateTime(TimeOnly.MinValue)).TotalDays / 365.25);
                            result.PatientAgeGroup = ageYears <= 5 ? "0-5"
                                : ageYears <= 14 ? "6-14"
                                : ageYears <= 60 ? "15-60"
                                : "60+";
                        }

                        _context.ParasitologyResults.Add(result);
                    }
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Parazitologiya AI tahlil xatolik, analysis_id={Id}", analysis.Id);
                analysis.AnalysisStatus = "failed";
                analysis.AiResponse = ex.Message;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<ParasitologyAnalyseDTO> GetByIdAsync(int id)
        {
            var e = await _context.ParasitologyAnalyses
                .Include(a => a.Patcient)
                .Include(a => a.Clinic).ThenInclude(c => c!.ClinicDetail).ThenInclude(d => d!.District)
                .Include(a => a.Clinic).ThenInclude(c => c!.ClinicPhoneNumber)
                .Include(a => a.CreatedDoctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
                .Include(a => a.Doctors!).ThenInclude(d => d.Doctor).ThenInclude(d => d.User).ThenInclude(u => u.Role)
                .Include(a => a.Results)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (e == null)
                return new ParasitologyAnalyseDTO { Id = id };

            return new ParasitologyAnalyseDTO
            {
                Id = e.Id,
                PatcientId = e.PatcientId,
                ClinicId = e.ClinicId,
                CreatedDoctorId = e.CreatedDoctorId,
                FilePath = e.FilePath,
                MicroscopyMethod = e.MicroscopyMethod,
                Magnification = e.Magnification,
                EggCountPerField = e.EggCountPerField,
                AiResponse = e.AiResponse,
                AnalysisStatus = e.AnalysisStatus,
                JiddiylikDarajasi = e.JiddiylikDarajasi,
                Lang = e.Lang,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt,
                Patcient = e.Patcient == null ? null : new PatcientForECG
                {
                    Id = e.Patcient.Id,
                    BirthDate = e.Patcient.BirthDate,
                    Gender = e.Patcient.Gender,
                    FirstName = e.Patcient.FirstName,
                    LastName = e.Patcient.LastName,
                    SureName = e.Patcient.SureName,
                    Passport = e.Patcient.Passport
                },
                CreatedDoctor = e.CreatedDoctor == null ? null : new DoctorForECGData
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
                Clinic = e.Clinic == null ? null : new ClinicForECG
                {
                    Id = e.Clinic.Id,
                    ClinicLogo = e.Clinic.ClinicLogo,
                    ClinicName = e.Clinic.ClinicName,
                    District = e.Clinic.ClinicDetail?.District,
                    Address = e.Clinic.ClinicDetail?.Address,
                    PhoneNumbers = e.Clinic.ClinicPhoneNumber?.Select(p => p.PhoneNumber).ToList()
                },
                Doctors = e.Doctors?.Select(d => new DoctorForECGData
                {
                    Id = d.Doctor.Id,
                    FirstName = d.Doctor.FirstName,
                    LastName = d.Doctor.LastName,
                    SureName = d.Doctor.SureName,
                    Phone = d.Doctor.Phone,
                    Role = new RolesDTO
                    {
                        Id = d.Doctor.User.Role.Id,
                        NameUz = d.Doctor.User.Role.NameUz,
                        NameEn = d.Doctor.User.Role.NameEn,
                        NameRu = d.Doctor.User.Role.NameRu
                    }
                }).ToList(),
                Results = e.Results?.Select(r => new ParasitologyResultDto
                {
                    Id = r.Id,
                    HelminthType = r.HelminthType,
                    HelminthNameUz = r.HelminthNameUz,
                    HelminthNameRu = r.HelminthNameRu,
                    HelminthNameEn = r.HelminthNameEn,
                    Confidence = r.Confidence,
                    InfectionLevel = r.InfectionLevel
                }).ToList()
            };
        }
    }
}
