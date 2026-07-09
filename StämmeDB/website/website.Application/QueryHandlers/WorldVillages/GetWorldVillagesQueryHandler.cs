using website.Application.CQRS;
using website.Application.Queries.WorldVillages;
using website.Application.WorldVillages;
using website.Domain.Models.WorldVillages;

namespace website.Application.QueryHandlers.WorldVillages
{
    public sealed class GetWorldVillagesQueryHandler
        : IRequestHandler<GetWorldVillagesQuery, IReadOnlyList<WorldVillageModel>>
    {
        private readonly IWorldVillageReadRepository _repository;

        public GetWorldVillagesQueryHandler(
            IWorldVillageReadRepository repository)
        {
            _repository = repository;
        }

        public Task<IReadOnlyList<WorldVillageModel>> HandleAsync(
            GetWorldVillagesQuery request,
            CancellationToken cancellationToken = default)
        {
            return _repository.SearchAsync(
                request.Search,
                cancellationToken);
        }
    }
}
