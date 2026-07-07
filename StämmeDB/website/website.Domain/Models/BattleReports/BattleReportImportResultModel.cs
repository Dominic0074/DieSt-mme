namespace website.Domain.Models.BattleReports
{
    public sealed class BattleReportImportResultModel
    {
        public Guid BattleReportId { get; set; }

        public string World { get; set; } = string.Empty;

        public long GameReportId { get; set; }

        public bool WasCreated { get; set; }

        public bool AnalysisPipelineTriggered { get; set; }
    }
}
