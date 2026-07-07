using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database.Configurations
{
    internal sealed class BattleReportEntityConfiguration
        : IEntityTypeConfiguration<BattleReportEntity>
    {
        public void Configure(EntityTypeBuilder<BattleReportEntity> builder)
        {
            builder.ToTable(
                "BattleReports",
                table =>
                {
                    table.HasCheckConstraint(
                        "CK_BattleReports_DifferentVillages",
                        "\"AttackingGameVillageId\" <> \"DefendingGameVillageId\"");
                    table.HasCheckConstraint(
                        "CK_BattleReports_Loot",
                        "\"LootWood\" >= 0 AND \"LootClay\" >= 0 AND \"LootIron\" >= 0");
                    table.HasCheckConstraint(
                        "CK_BattleReports_CarryCapacity",
                        "\"CarryCapacityUsed\" >= 0 AND \"CarryCapacityTotal\" >= 0 " +
                        "AND \"CarryCapacityUsed\" <= \"CarryCapacityTotal\"");
                });

            builder.HasKey(report => report.Id);
            builder.Property(report => report.World)
                .HasMaxLength(20)
                .IsRequired();
            builder.Property(report => report.Subject)
                .HasMaxLength(500)
                .IsRequired();
            builder.Property(report => report.Outcome)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();
            builder.Property(report => report.AttackerLuckPercent)
                .HasPrecision(5, 2);
            builder.Property(report => report.MoralePercent)
                .HasPrecision(5, 2);
            builder.Property(report => report.SourceHash)
                .HasMaxLength(64)
                .IsFixedLength()
                .IsRequired();
            builder.Property(report => report.ExportCode);

            builder.HasIndex(report => new
                {
                    report.World,
                    report.GameReportId
                })
                .IsUnique();
            builder.HasIndex(report => new
                {
                    report.AttackingGameVillageId,
                    report.BattleTimeUtc
                });
            builder.HasIndex(report => new
                {
                    report.DefendingGameVillageId,
                    report.BattleTimeUtc
                });
            builder.HasIndex(report => new
                {
                    report.World,
                    report.AttackerGamePlayerId
                });
            builder.HasIndex(report => new
                {
                    report.World,
                    report.DefenderGamePlayerId
                });
            builder.HasIndex(report => new
                {
                    report.World,
                    report.ForwardedByGamePlayerId
                });

        }
    }
}
