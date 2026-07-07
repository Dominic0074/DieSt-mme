namespace website.Infrastructure.Database.Entities
{
    public sealed class BattleReportEntity
    {
        public Guid Id { get; set; }

        public string World { get; set; } = string.Empty;

        public long GameReportId { get; set; }

        public string Subject { get; set; } = string.Empty;

        public DateTime BattleTimeUtc { get; set; }

        public DateTime? ForwardedAtUtc { get; set; }

        public long? ForwardedByGamePlayerId { get; set; }

        public BattleReportOutcome Outcome { get; set; }

        public decimal? AttackerLuckPercent { get; set; }

        public decimal? MoralePercent { get; set; }

        public int? LoyaltyBefore { get; set; }

        public int? LoyaltyAfter { get; set; }

        public long? AttackerGamePlayerId { get; set; }

        public long? DefenderGamePlayerId { get; set; }

        public long AttackingGameVillageId { get; set; }

        public long DefendingGameVillageId { get; set; }

        public int LootWood { get; set; }

        public int LootClay { get; set; }

        public int LootIron { get; set; }

        public int CarryCapacityUsed { get; set; }

        public int CarryCapacityTotal { get; set; }

        public string SourceHash { get; set; } = string.Empty;

        public string? ExportCode { get; set; }

        public DateTime ImportedAtUtc { get; set; }

        public ICollection<BattleReportArmyEntity> Armies { get; set; } =
            new List<BattleReportArmyEntity>();
    }
}
