using website.Domain.Models.BattleReports;

namespace website.Application.BattleReports
{
    public interface IBattleReportReadRepository
    {
        Task<IReadOnlyList<BattleReportModel>> SearchAsync(
            BattleReportSearchModel search,
            CancellationToken cancellationToken = default);
    }
}
