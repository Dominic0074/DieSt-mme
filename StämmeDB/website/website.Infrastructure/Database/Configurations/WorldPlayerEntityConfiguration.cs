using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database.Configurations
{
    internal sealed class WorldPlayerEntityConfiguration
        : IEntityTypeConfiguration<WorldPlayerEntity>
    {
        public void Configure(EntityTypeBuilder<WorldPlayerEntity> builder)
        {
            builder.ToTable(
                "WorldPlayers",
                table =>
                {
                    table.HasCheckConstraint(
                        "CK_WorldPlayers_VillageCount",
                        "\"VillageCount\" IS NULL OR \"VillageCount\" >= 0");
                    table.HasCheckConstraint(
                        "CK_WorldPlayers_Points",
                        "\"Points\" IS NULL OR \"Points\" >= 0");
                    table.HasCheckConstraint(
                        "CK_WorldPlayers_Rank",
                        "\"Rank\" IS NULL OR \"Rank\" >= 0");
                    table.HasCheckConstraint(
                        "CK_WorldPlayers_ReportSeenWindow",
                        "\"FirstSeenInReportAtUtc\" IS NULL " +
                        "OR \"LastSeenInReportAtUtc\" IS NULL " +
                        "OR \"FirstSeenInReportAtUtc\" <= \"LastSeenInReportAtUtc\"");
                });

            builder.HasKey(player => player.Id);
            builder.Property(player => player.World)
                .HasMaxLength(20)
                .IsRequired();
            builder.Property(player => player.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.HasIndex(player => new
                {
                    player.World,
                    player.GamePlayerId
                })
                .IsUnique();
            builder.HasIndex(player => new
                {
                    player.World,
                    player.GameAllyId
                });
        }
    }
}
