using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using EkgAnalyzerApi.Models;

namespace EkgAnalyzerApi.Data
{
    public class MedDataDB : DbContext
    {
        public MedDataDB(DbContextOptions<MedDataDB> options)
            : base(options)
        {
        }

        public DbSet<Patient> Patients { get; set; }
        
        public DbSet<PatientAnalysis> PatientAnalysis { get; set; }

        public DbSet<Complaints> Complaints { get; set; }

        public override int SaveChanges()
        {
            UpdateTimestamps();
            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateTimestamps();
            return await base.SaveChangesAsync(cancellationToken);
        }

        private void UpdateTimestamps()
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.Entity is Patient &&
                            (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entityEntry in entries)
            {
                ((Patient)entityEntry.Entity).UpdatedAt = DateTime.UtcNow;

                if (entityEntry.State == EntityState.Added)
                {
                    ((Patient)entityEntry.Entity).CreatedAt = DateTime.UtcNow;
                }
            }
        }
    }
}
