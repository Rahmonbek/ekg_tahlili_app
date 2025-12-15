using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;

public class DoctorDTO
{
    public string firstname { get; set; }
    public string lastname { get; set; }
    public string surename { get; set; }
    public string passport { get; set; }
    public string phone { get; set; }
    public string birthdate { get; set; }
    public bool gender { get; set; }


}