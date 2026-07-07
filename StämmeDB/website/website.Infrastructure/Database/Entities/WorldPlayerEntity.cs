namespace website.Infrastructure.Database.Entities
{
    public sealed class WorldPlayerEntity
    {
        public Guid Id { get; set; }

        public string World { get; set; } = string.Empty;

        public long GamePlayerId { get; set; }

        public string Name { get; set; } = string.Empty;

        public long? GameAllyId { get; set; }

        public int? VillageCount { get; set; }

        public int? Points { get; set; }

        public int? Rank { get; set; }

        public DateTime? ApiUpdatedAtUtc { get; set; }

        public DateTime? FirstSeenInReportAtUtc { get; set; }

        public DateTime? LastSeenInReportAtUtc { get; set; }
    }
}
