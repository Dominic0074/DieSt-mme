using Microsoft.EntityFrameworkCore;
using website.Infrastructure.Database.Configurations;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database
{
    public sealed class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<ItemEntity> Items => Set<ItemEntity>();

        public DbSet<AppUserEntity> AppUsers => Set<AppUserEntity>();

        public DbSet<BattleReportEntity> BattleReports =>
            Set<BattleReportEntity>();

        public DbSet<BattleReportArmyEntity> BattleReportArmies =>
            Set<BattleReportArmyEntity>();

        public DbSet<VillageIntelEntity> VillageIntel =>
            Set<VillageIntelEntity>();

        public DbSet<WorldAllyEntity> WorldAllies => Set<WorldAllyEntity>();

        public DbSet<WorldPlayerEntity> WorldPlayers =>
            Set<WorldPlayerEntity>();

        public DbSet<WorldVillageEntity> WorldVillages =>
            Set<WorldVillageEntity>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfiguration(new ItemEntityConfiguration());
            modelBuilder.ApplyConfiguration(new AppUserEntityConfiguration());
            modelBuilder.ApplyConfiguration(
                new BattleReportEntityConfiguration());
            modelBuilder.ApplyConfiguration(
                new BattleReportArmyEntityConfiguration());
            modelBuilder.ApplyConfiguration(
                new VillageIntelEntityConfiguration());
            modelBuilder.ApplyConfiguration(new WorldAllyEntityConfiguration());
            modelBuilder.ApplyConfiguration(
                new WorldPlayerEntityConfiguration());
            modelBuilder.ApplyConfiguration(
                new WorldVillageEntityConfiguration());
        }
    }
}
