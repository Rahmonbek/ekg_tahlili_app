using Microsoft.AspNetCore.Mvc;

namespace EkgAnalyzerApi.Controllers
{
    public class AuthController : Controller
    {
        public string GenerateCode()
        {
            return new Random().Next(1000, 9999).ToString();
        }
        public IActionResult Index()
        {
            return View();
        }
    }
}
