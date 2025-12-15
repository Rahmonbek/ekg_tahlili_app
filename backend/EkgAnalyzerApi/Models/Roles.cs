using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("roles")]
public class Role
{
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("role_name_uz")]
        public string? RoleNameUz { get; set; }

        [Column("role_name_ru")]
        public string? RoleNameRu { get; set; }

        [Column("role_name_en")]
        public string? RoleNameEn { get; set; }
       

    }
}