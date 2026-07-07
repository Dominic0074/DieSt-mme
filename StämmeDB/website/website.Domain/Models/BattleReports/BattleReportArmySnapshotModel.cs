namespace website.Domain.Models.BattleReports
{
    public sealed class BattleReportArmySnapshotModel : BattleReportArmyModel
    {
        public string Side { get; set; } = string.Empty;

        public string Kind { get; set; } = string.Empty;

        public BattleReportParticipantModel? SourceVillage { get; set; }
    }
}
