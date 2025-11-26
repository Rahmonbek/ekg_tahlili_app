using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
public class EkgDataDB : DbContext
{
    public EkgDataDB(DbContextOptions<EkgDataDB> options)
        : base(options)
    {
    }

    //public DbSet<User> Users { get; set; }
}
