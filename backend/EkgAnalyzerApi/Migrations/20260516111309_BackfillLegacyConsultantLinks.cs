using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class BackfillLegacyConsultantLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO clinic_consultants
                    (clinic_id, consultant_doctor_id, linked_at, linked_by_invitation_id, status, total_consultations, last_consultation_at)
                SELECT
                    c.clinic_id,
                    c.consultant_doctor_id,
                    MIN(c.created_at) AS linked_at,
                    NULL AS linked_by_invitation_id,
                    'active' AS status,
                    COUNT(*) FILTER (WHERE c.status IN ('accepted', 'scheduled', 'concluded')) AS total_consultations,
                    MAX(c.created_at) FILTER (WHERE c.status IN ('accepted', 'scheduled', 'concluded')) AS last_consultation_at
                FROM consultations c
                WHERE c.status IN ('accepted', 'scheduled', 'concluded')
                  AND NOT EXISTS (
                      SELECT 1
                      FROM clinic_consultants cc
                      WHERE cc.clinic_id = c.clinic_id
                        AND cc.consultant_doctor_id = c.consultant_doctor_id
                  )
                GROUP BY c.clinic_id, c.consultant_doctor_id;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
