using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260525113000_UsePhoneNumberForVerificationCodes")]
    public partial class UsePhoneNumberForVerificationCodes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'varification_codes'
                          AND column_name = 'email'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'varification_codes'
                          AND column_name = 'phone_number'
                    ) THEN
                        ALTER TABLE varification_codes RENAME COLUMN email TO phone_number;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'varification_codes'
                          AND column_name = 'phone_number'
                    ) THEN
                        ALTER TABLE varification_codes ADD COLUMN phone_number text;
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'varification_codes'
                          AND column_name = 'phone'
                    ) THEN
                        UPDATE varification_codes
                        SET phone_number = phone
                        WHERE phone IS NOT NULL
                          AND phone <> ''
                          AND (
                              phone_number IS NULL
                              OR phone_number = ''
                              OR phone_number LIKE '%@phone.nmed.local'
                          );

                        ALTER TABLE varification_codes DROP COLUMN phone;
                    END IF;

                    UPDATE varification_codes
                    SET phone_number = ''
                    WHERE phone_number IS NULL;

                    ALTER TABLE varification_codes
                    ALTER COLUMN phone_number SET NOT NULL;
                END
                $$;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'varification_codes'
                          AND column_name = 'phone_number'
                    ) AND NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'varification_codes'
                          AND column_name = 'email'
                    ) THEN
                        ALTER TABLE varification_codes RENAME COLUMN phone_number TO email;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'varification_codes'
                          AND column_name = 'phone'
                    ) THEN
                        ALTER TABLE varification_codes ADD COLUMN phone text;
                    END IF;
                END
                $$;
                """);
        }
    }
}
