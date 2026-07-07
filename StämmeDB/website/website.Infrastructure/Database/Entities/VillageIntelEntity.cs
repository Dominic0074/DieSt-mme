namespace website.Infrastructure.Database.Entities
{
    public sealed class VillageIntelEntity
    {
        public Guid Id { get; set; }

        public string World { get; set; } = string.Empty;

        public long GameVillageId { get; set; }

        public DateTime CreatedAtUtc { get; set; }

        public DateTime UpdatedAtUtc { get; set; }

        public DateTime AggregatedFromUtc { get; set; }

        public DateTime AggregatedToUtc { get; set; }

        public DateTime LastAggregatedAtUtc { get; set; }

        public int AggregatedReportCount { get; set; }

        public DateTime? BuildingsObservedAtUtc { get; set; }

        public int? HeadquartersLevel { get; set; }

        public int? BarracksLevel { get; set; }

        public int? StableLevel { get; set; }

        public int? WorkshopLevel { get; set; }

        public int? AcademyLevel { get; set; }

        public int? SmithyLevel { get; set; }

        public int? RallyPointLevel { get; set; }

        public int? StatueLevel { get; set; }

        public int? MarketLevel { get; set; }

        public int? TimberCampLevel { get; set; }

        public int? ClayPitLevel { get; set; }

        public int? IronMineLevel { get; set; }

        public int? FarmLevel { get; set; }

        public int? WarehouseLevel { get; set; }

        public int? HidingPlaceLevel { get; set; }

        public int? WallLevel { get; set; }

        public int? ChurchLevel { get; set; }

        public int? WatchtowerLevel { get; set; }

        public DateTime? TroopsObservedAtUtc { get; set; }

        public int? SpearCount { get; set; }

        public int? SwordCount { get; set; }

        public int? AxeCount { get; set; }

        public int? ArcherCount { get; set; }

        public int? SpyCount { get; set; }

        public int? LightCount { get; set; }

        public int? MountedArcherCount { get; set; }

        public int? HeavyCount { get; set; }

        public int? RamCount { get; set; }

        public int? CatapultCount { get; set; }

        public int? KnightCount { get; set; }

        public int? SnobCount { get; set; }

        public int? MilitiaCount { get; set; }
    }
}
