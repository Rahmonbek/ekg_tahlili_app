using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;

public class UserDTO
{
    public int Id { get; set; }
    public string Email { get; set; } = default!;
    public int? ClinicId { get; set; }
    public bool Status { get; set; } = false;

}