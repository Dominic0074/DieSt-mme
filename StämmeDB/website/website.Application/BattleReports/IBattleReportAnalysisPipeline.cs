namespace website.Application.BattleReports
{
    public interface IBattleReportAnalysisPipeline
    {
        Task AnalyzeAsync(
            Guid battleReportId,
            CancellationToken cancellationToken = default);
    }
}
