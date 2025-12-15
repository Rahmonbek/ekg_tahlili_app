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

       
    }
}
