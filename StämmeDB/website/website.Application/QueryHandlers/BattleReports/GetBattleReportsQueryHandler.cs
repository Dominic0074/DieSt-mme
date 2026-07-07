using website.Application.BattleReports;
using website.Application.CQRS;
using website.Application.Queries.BattleReports;
using website.Domain.Models.BattleReports;

namespace website.Application.QueryHandlers.BattleReports
{
    public sealed class GetBattleReportsQueryHandler
        : IRequestHandler<GetBattleReportsQuery, IReadOnlyList<BattleReportModel>>
    {
        private readonly IBattleReportReadRepository _repository;

        public GetBattleReportsQueryHandler(
            IBattleReportReadRepository repository)
        {
            _repository = repository;
        }

        public Task<IReadOnlyList<BattleReportModel>> HandleAsync(
            GetBattleReportsQuery request,
            CancellationToken cancellationToken = default)
        {
            return _repository.SearchAsync(
                request.Search,
                cancellationToken);
        }
    }
}
