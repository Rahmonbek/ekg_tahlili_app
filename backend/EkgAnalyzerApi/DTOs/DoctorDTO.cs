using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;


public class DoctorDTOResponse
{
    public bool Status { get; set; }
    public string? Message { get; set; }

    public DoctorDTOResponseData? Doctor { get; set; }
}
public class DoctorDTORequest
{
    public int? Id { get; set; }
    public string Username { get; set; }
    public string Password { get; set; }
    public int RoleId { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string SureName { get; set; }
    public string Phone { get; set; }
    public string Birthdate { get; set; }
    public bool Gender { get; set; }

    public List<IdDTO> Positions { get; set; }

}

public class DoctorDTOResponseData
{
    public int? Id { get; set; }
    public string Username { get; set; }
    public string Password { get; set; }
    public int RoleId { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string SureName { get; set; }
    public string Phone { get; set; }
    public string Birthdate { get; set; }
    public bool Gender { get; set; }

    public List<PositionDto> Positions { get; set; }

}

public class IdDTO
{
    public int Id { get; set; }
}