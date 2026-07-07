using website.Application.CQRS;
using website.Domain.Models.BattleReports;

namespace website.Application.Commands.BattleReports
{
    public sealed record ImportBattleReportCommand(ParsedBattleReportModel Report)
        : IRequest<BattleReportImportResultModel>;
}
