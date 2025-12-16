using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("doctor_position")]
public class DoctorPosition
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("doctor_id")]
        public int DoctorId { get; set; }
        public Doctor? Doctor { get; set; }

        [Column("position_id")]
        public int PositionId { get; set; }
        public Position Position { get; set; } = null!;
    }
}