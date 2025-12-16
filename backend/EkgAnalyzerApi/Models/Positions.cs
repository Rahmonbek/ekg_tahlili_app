using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("positions")]
public class Position
{
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("role_id")]
        public int? RoleId { get; set; }

        [Column("sort")]
        public int? Sort { get; set; }

        [Column("name_uz")]
        public string? NameUz { get; set; }

        [Column("name_ru")]
        public string? NameRu { get; set; }

        [Column("name_en")]
        public string? NameEn { get; set; }
        public ICollection<DoctorPosition> DoctorPositions { get; set; }
        = new List<DoctorPosition>();

    }
}