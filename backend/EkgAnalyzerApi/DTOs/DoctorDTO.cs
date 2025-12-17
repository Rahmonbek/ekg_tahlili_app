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

public class DoctorListDTO
{
    public List<DoctorDTOResponseData> data { get; set; } = new List<DoctorDTOResponseData>();
    public int TotalCount { get; set; }       // umumiy doktorlar soni
    public int TotalPages { get; set; }       // sahifalar soni
}

public class ParamsStaffDTO
{
    public List<RolesDTO> Roles { get; set; }
    public List<PositionDto> Positions { get; set; }
}
public class DoctorDTORequest
{
    public int? Id { get; set; }
    public int? UserId { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public int RoleId { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string SureName { get; set; }
    public string Phone { get; set; }
    public bool Gender { get; set; }

    public List<IdDTO>? Positions { get; set; }

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
    public bool Gender { get; set; }

    public List<PositionDto> Positions { get; set; }
    public RolesDTO? Role { get; set; }

}

public class IdDTO
{
    public int Id { get; set; }
}