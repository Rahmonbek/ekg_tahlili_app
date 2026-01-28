using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;

public class PatcientDTO
{
    public string firstname { get; set; }
    public string lastname { get; set; }
    public string surename { get; set; }
    public string passport { get; set; }
    public string phone { get; set; }
    public string birthdate { get; set; }
    public string? address { get; set; }
    public int district_id { get; set; }
    public bool gender { get; set; }

}

public class PatcientDTOResponse
{
    public bool Status { get; set; }
    public string? Message { get; set; }

    public Patcient? Patcients { get; set; }
}

public class PatcientListDTO
{
    public List<Patcient> data { get; set; } = new List<Patcient>();
    public int TotalCount { get; set; }       // umumiy doktorlar soni
    public int TotalPages { get; set; }       // sahifalar soni
}