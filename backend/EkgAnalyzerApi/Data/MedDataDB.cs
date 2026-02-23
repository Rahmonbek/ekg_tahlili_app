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
        public DbSet<VerificationCode> VerificationCodes { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Regions> Regions { get; set; }
        public DbSet<Districts> Districts { get; set; }
        public DbSet<SmadAnalyses> SmadAnalyses { get; set; }
        public DbSet<HolterAnalyses> HolterAnalyses { get; set; }
        public DbSet<MedicalDiagnoses> MedicalDiagnose { get; set; }

        public DbSet<Doctor> Doctors { get; set; }
        public DbSet<DoctorPosition> DoctorPositions { get; set; }

        public DbSet<Position> Positions { get; set; }
        public DbSet<ClinicPhoneNumber> ClinicPhoneNumbers { get; set; }
        public DbSet<Clinic> Clinics { get; set; }
        public DbSet<LabAnalyses> LabAnalyse { get; set; }
        public DbSet<ECGAnalyses> ECGAnalyse { get; set; }
        public DbSet<ECGAnalyseDoctors> ECGAnalyseDoctor { get; set; }
        public DbSet<LabAnalyseDoctors> LabAnalyseDoctor { get; set; }
        public DbSet<SmadAnalyseDoctors> SmadAnalyseDoctor { get; set; }
        public DbSet<HolterAnalyseDoctors> HolterAnalyseDoctor { get; set; }
        public DbSet<ECGAnalyseComplaints> ECGAnalyseComplaint { get; set; }
        public DbSet<LabAnalyseCategories> LabAnalyseCategories { get; set; }
        public DbSet<ClinicDetail> ClinicDetails { get; set; }
        public DbSet<Patcient> Patcients { get; set; }
        public DbSet<Complaints> Complaints { get; set; }
        public DbSet<LabCategories> LabCategories { get; set; }
        public DbSet<LabValueTypes> LabValueTypes { get; set; }
        public DbSet<LabBigCategories> LabBigCategories { get; set; }

        public override int SaveChanges()
        {
            ApplyTimestamps();
            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ApplyTimestamps();
            return await base.SaveChangesAsync(cancellationToken);
        }

        private void ApplyTimestamps()
        {
            var timestampedEntities = ChangeTracker.Entries()
                .Where(e => e.Entity is ITimestamped &&
                            (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entry in timestampedEntities)
            {
                var entity = (ITimestamped)entry.Entity;
                entity.UpdatedAt = DateTime.UtcNow;

                if (entry.State == EntityState.Added)
                    entity.CreatedAt = DateTime.UtcNow;
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User - Doctor (1:1)
            modelBuilder.Entity<User>()
       .HasOne(u => u.Doctor)
       .WithOne(d => d.User)
       .HasForeignKey<Doctor>(d => d.UserId);

            // Doctor - DoctorPosition (1:n)
            modelBuilder.Entity<DoctorPosition>()
         .HasOne(dp => dp.Doctor)
         .WithMany(d => d.DoctorPositions)
         .HasForeignKey(dp => dp.DoctorId);

            // Position -> DoctorPosition (1:n)
            modelBuilder.Entity<DoctorPosition>()
                .HasOne(dp => dp.Position)
                .WithMany(p => p.DoctorPositions)
                .HasForeignKey(dp => dp.PositionId);


            // User - Clinic (n:1)
            modelBuilder.Entity<User>()
    .HasOne(u => u.Clinic)    // User navigatsiya property
    .WithMany(c => c.Users)   // Clinic navigatsiya property
    .HasForeignKey(u => u.ClinicId);

            // Clinic - ClinicDetail (1:1)
            modelBuilder.Entity<Clinic>()
                .HasOne(c => c.ClinicDetail)
                .WithOne()
                .HasForeignKey<ClinicDetail>(cd => cd.ClinicId);
        }
    }

    // Interface for timestamped entities
    public interface ITimestamped
    {
        DateTime? CreatedAt { get; set; }
        DateTime? UpdatedAt { get; set; }
    }
}
