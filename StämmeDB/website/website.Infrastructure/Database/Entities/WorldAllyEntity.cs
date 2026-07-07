namespace website.Infrastructure.Database.Entities
{
    public sealed class WorldAllyEntity
    {
        public Guid Id { get; set; }

        public string World { get; set; } = string.Empty;

        public long GameAllyId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Tag { get; set; } = string.Empty;

        public int? MemberCount { get; set; }

        public int? Points { get; set; }

        public int? Rank { get; set; }

        public DateTime ApiUpdatedAtUtc { get; set; }
    }
}
