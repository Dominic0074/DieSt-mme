using website.Application.BattleReports;
using website.Application.Commands.BattleReports;
using website.Application.CQRS;
using website.Domain.Models.BattleReports;

namespace website.Application.CommandHandlers.BattleReports
{
    public sealed class ImportBattleReportCommandHandler
        : IRequestHandler<ImportBattleReportCommand, BattleReportImportResultModel>
    {
        private readonly IBattleReportImportRepository _repository;
        private readonly IBattleReportAnalysisPipeline _analysisPipeline;

        public ImportBattleReportCommandHandler(
            IBattleReportImportRepository repository,
            IBattleReportAnalysisPipeline analysisPipeline)
        {
            _repository = repository;
            _analysisPipeline = analysisPipeline;
        }

        public async Task<BattleReportImportResultModel> HandleAsync(
            ImportBattleReportCommand request,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request.Report);

            var result = await _repository.ImportAsync(
                request.Report,
                cancellationToken);

            if (!result.WasCreated)
            {
                return result;
            }

            await _analysisPipeline.AnalyzeAsync(
                result.BattleReportId,
                cancellationToken);
            result.AnalysisPipelineTriggered = true;

            return result;
        }
    }
}
