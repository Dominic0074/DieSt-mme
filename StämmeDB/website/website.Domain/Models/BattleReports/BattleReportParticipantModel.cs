namespace website.Domain.Models.BattleReports
{
    public sealed class BattleReportParticipantModel
    {
        public long? GamePlayerId { get; set; }

        public string PlayerName { get; set; } = string.Empty;

        public long GameVillageId { get; set; }

        public string VillageName { get; set; } = string.Empty;

        public int X { get; set; }

        public int Y { get; set; }

        public int Continent { get; set; }
    }
}
