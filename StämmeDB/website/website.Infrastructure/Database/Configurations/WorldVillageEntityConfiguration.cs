using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database.Configurations
{
    internal sealed class WorldVillageEntityConfiguration
        : IEntityTypeConfiguration<WorldVillageEntity>
    {
        public void Configure(EntityTypeBuilder<WorldVillageEntity> builder)
        {
            builder.ToTable(
                "WorldVillages",
                table =>
                {
                    table.HasCheckConstraint(
                        "CK_WorldVillages_Coordinates",
                        "\"X\" >= 0 AND \"Y\" >= 0");
                    table.HasCheckConstraint(
                        "CK_WorldVillages_Continent",
                        "\"Continent\" >= 0");
                    table.HasCheckConstraint(
                        "CK_WorldVillages_Points",
                        "\"Points\" IS NULL OR \"Points\" >= 0");
                    table.HasCheckConstraint(
                        "CK_WorldVillages_ReportSeenWindow",
                        "\"FirstSeenInReportAtUtc\" IS NULL " +
                        "OR \"LastSeenInReportAtUtc\" IS NULL " +
                        "OR \"FirstSeenInReportAtUtc\" <= \"LastSeenInReportAtUtc\"");
                });

            builder.HasKey(village => village.Id);
            builder.Property(village => village.World)
                .HasMaxLength(20)
                .IsRequired();
            builder.Property(village => village.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.HasIndex(village => new
                {
                    village.World,
                    village.GameVillageId
                })
                .IsUnique();
            builder.HasIndex(village => new
                {
                    village.World,
                    village.GamePlayerId
                });
            builder.HasIndex(village => new
                {
                    village.World,
                    village.X,
                    village.Y
                })
                .IsUnique();
        }
    }
}
