using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database.Configurations
{
    internal sealed class BattleReportArmyEntityConfiguration
        : IEntityTypeConfiguration<BattleReportArmyEntity>
    {
        private static readonly string[] UnitNames =
        [
            "Spear",
            "Sword",
            "Axe",
            "Archer",
            "Spy",
            "Light",
            "MountedArcher",
            "Heavy",
            "Ram",
            "Catapult",
            "Knight",
            "Snob",
            "Militia"
        ];

        public void Configure(EntityTypeBuilder<BattleReportArmyEntity> builder)
        {
            builder.ToTable(
                "BattleReportArmies",
                table =>
                {
                    foreach (var unitName in UnitNames)
                    {
                        table.HasCheckConstraint(
                            $"CK_BattleReportArmies_{unitName}",
                            BuildUnitConstraint(unitName));
                    }
                });

            builder.HasKey(army => army.Id);
            builder.Property(army => army.Side)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();
            builder.Property(army => army.Kind)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            builder.HasIndex(army => new
                {
                    army.BattleReportId,
                    army.Side,
                    army.Kind
                })
                .IsUnique();

            builder.HasOne(army => army.BattleReport)
                .WithMany(report => report.Armies)
                .HasForeignKey(army => army.BattleReportId)
                .OnDelete(DeleteBehavior.Cascade);
        }

        private static string BuildUnitConstraint(string unitName)
        {
            var count = $"\"{unitName}Count\"";
            var losses = $"\"{unitName}Losses\"";

            return $"({count} IS NULL OR {count} >= 0) AND " +
                $"({losses} IS NULL OR {losses} >= 0) AND " +
                $"({count} IS NULL OR {losses} IS NULL OR {losses} <= {count})";
        }
    }
}
