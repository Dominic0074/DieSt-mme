namespace website.Infrastructure.Database.Entities
{
    public sealed class WorldVillageEntity
    {
        public Guid Id { get; set; }

        public string World { get; set; } = string.Empty;

        public long GameVillageId { get; set; }

        public string Name { get; set; } = string.Empty;

        public int X { get; set; }

        public int Y { get; set; }

        public int Continent { get; set; }

        public long? GamePlayerId { get; set; }

        public int? Points { get; set; }

        public DateTime? ApiUpdatedAtUtc { get; set; }

        public DateTime? FirstSeenInReportAtUtc { get; set; }

        public DateTime? LastSeenInReportAtUtc { get; set; }
    }
}
