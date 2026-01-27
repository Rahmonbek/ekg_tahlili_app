using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Drawing;

namespace EkgAnalyzerApi.Models
{
    [Table("patcients")]
    public class Patcient
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("passport")]
        public string Passport { get; set; }

        [Column("birthdate")]
        public DateOnly BirthDate { get; set; }

        [Column("firstname")]
        public string FirstName { get; set; }

        [Column("lastname")]
        public string LastName { get; set; }

        [Column("surename")]
        public string SureName { get; set; }

        [Column("gender")]
        public bool Gender { get; set; }

        [Column("phone")]
        public string Phone { get; set; }


        [Column("address")]
        public string? Address { get; set; }

        [Column("district_id")]
        public int? DistrictId { get; set; }

        public Districts? District { get; set; } = null!;


        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}