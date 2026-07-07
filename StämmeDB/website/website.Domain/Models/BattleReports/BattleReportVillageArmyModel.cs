namespace website.Domain.Models.BattleReports
{
    public sealed class BattleReportVillageArmyModel
    {
        public BattleReportParticipantModel Village { get; set; } = new();

        public BattleReportArmyModel? Army { get; set; }
    }
}
