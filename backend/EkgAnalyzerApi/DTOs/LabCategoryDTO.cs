using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;

// DTO class
public class LabBigCategoryDto
{
    public int Id { get; set; }
    public string? NameUz { get; set; }
    public string? NameRu { get; set; }
    public string? NameEn { get; set; }
    public List<LabCategoryDto>? Categories { get; set; }
}

public class LabCategoryDto
{
    public int Id { get; set; }
    public string? NameUz { get; set; }
    public string? NameRu { get; set; }
    public string? NameEn { get; set; }
}
