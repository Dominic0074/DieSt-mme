namespace website.Domain.Models.BattleReports
{
    public sealed class BattleReportModel
    {
        public Guid Id { get; set; }

        public string World { get; set; } = string.Empty;

        public long GameReportId { get; set; }

        public string Subject { get; set; } = string.Empty;

        public DateTime BattleTimeUtc { get; set; }

        public DateTime? ForwardedAtUtc { get; set; }

        public long? ForwardedByGamePlayerId { get; set; }

        public string Outcome { get; set; } = "Unknown";

        public decimal? AttackerLuckPercent { get; set; }

        public decimal? MoralePercent { get; set; }

        public int? LoyaltyBefore { get; set; }

        public int? LoyaltyAfter { get; set; }

        public BattleReportParticipantModel Attacker { get; set; } = new();

        public BattleReportParticipantModel Defender { get; set; } = new();

        public int LootWood { get; set; }

        public int LootClay { get; set; }

        public int LootIron { get; set; }

        public int CarryCapacityUsed { get; set; }

        public int CarryCapacityTotal { get; set; }

        public IReadOnlyList<BattleReportArmySnapshotModel> Armies { get; set; } =
            [];

        public string SourceHash { get; set; } = string.Empty;

        public string? ExportCode { get; set; }

        public DateTime ImportedAtUtc { get; set; }
    }
}
