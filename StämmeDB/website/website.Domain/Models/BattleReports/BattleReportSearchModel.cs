namespace website.Domain.Models.BattleReports
{
    public sealed class BattleReportSearchModel
    {
        public Guid? Id { get; set; }

        public long? GameReportId { get; set; }

        public long? PlayerId { get; set; }

        public string? PlayerName { get; set; }

        public long? VillageId { get; set; }

        public string? VillageName { get; set; }
    }
}
