namespace website.Domain.Models.BattleReports
{
    public sealed class ParsedBattleReportModel
    {
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

        public List<BattleReportArmyModel?> Armies { get; set; } = [];

        public BattleReportArmyModel? DefenderTravelingArmy { get; set; }

        public List<BattleReportVillageArmyModel?> DefenderArmiesInOtherVillages { get; set; } = [];

        public string SourceHash { get; set; } = string.Empty;

        public string? ExportCode { get; set; }
    }
}
