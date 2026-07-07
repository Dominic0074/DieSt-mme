using website.Application.CQRS;
using website.Domain.Models.BattleReports;

namespace website.Application.Queries.BattleReports
{
    public sealed record GetBattleReportsQuery(BattleReportSearchModel Search)
        : IRequest<IReadOnlyList<BattleReportModel>>;
}
