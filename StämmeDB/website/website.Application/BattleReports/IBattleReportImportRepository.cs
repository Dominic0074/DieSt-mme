using website.Domain.Models.BattleReports;

namespace website.Application.BattleReports
{
    public interface IBattleReportImportRepository
    {
        Task<BattleReportImportResultModel> ImportAsync(
            ParsedBattleReportModel report,
            CancellationToken cancellationToken = default);
    }
}
