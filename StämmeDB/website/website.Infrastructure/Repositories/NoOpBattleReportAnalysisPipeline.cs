using website.Application.BattleReports;

namespace website.Infrastructure.Repositories
{
    internal sealed class NoOpBattleReportAnalysisPipeline
        : IBattleReportAnalysisPipeline
    {
        public Task AnalyzeAsync(
            Guid battleReportId,
            CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }
}
