using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Database.Configurations
{
    internal sealed class VillageIntelEntityConfiguration
        : IEntityTypeConfiguration<VillageIntelEntity>
    {
        private static readonly string[] BuildingLevelNames =
        [
            "Headquarters",
            "Barracks",
            "Stable",
            "Workshop",
            "Academy",
            "Smithy",
            "RallyPoint",
            "Statue",
            "Market",
            "TimberCamp",
            "ClayPit",
            "IronMine",
            "Farm",
            "Warehouse",
            "HidingPlace",
            "Wall",
            "Church",
            "Watchtower"
        ];

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

        public void Configure(EntityTypeBuilder<VillageIntelEntity> builder)
        {
            builder.ToTable(
                "VillageIntel",
                table =>
                {
                    table.HasCheckConstraint(
                        "CK_VillageIntel_AggregationWindow",
                        "\"AggregatedFromUtc\" <= \"AggregatedToUtc\"");
                    table.HasCheckConstraint(
                        "CK_VillageIntel_AggregatedReportCount",
                        "\"AggregatedReportCount\" >= 0");

                    foreach (var buildingName in BuildingLevelNames)
                    {
                        table.HasCheckConstraint(
                            $"CK_VillageIntel_{buildingName}Level",
                            BuildNullableNonNegativeConstraint(
                                $"{buildingName}Level"));
                    }

                    foreach (var unitName in UnitNames)
                    {
                        table.HasCheckConstraint(
                            $"CK_VillageIntel_{unitName}Count",
                            BuildNullableNonNegativeConstraint(
                                $"{unitName}Count"));
                    }
                });

            builder.HasKey(villageIntel => villageIntel.Id);
            builder.Property(villageIntel => villageIntel.World)
                .HasMaxLength(20)
                .IsRequired();

            builder.HasIndex(villageIntel => new
                {
                    villageIntel.World,
                    villageIntel.GameVillageId
                })
                .IsUnique();
        }

        private static string BuildNullableNonNegativeConstraint(
            string columnName)
        {
            var column = $"\"{columnName}\"";

            return $"{column} IS NULL OR {column} >= 0";
        }
    }
}
