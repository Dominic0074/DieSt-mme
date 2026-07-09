using website.Application.CQRS;
using website.Application.Queries.WorldPlayers;
using website.Application.WorldPlayers;
using website.Domain.Models.WorldPlayers;

namespace website.Application.QueryHandlers.WorldPlayers
{
    public sealed class GetWorldPlayersQueryHandler
        : IRequestHandler<GetWorldPlayersQuery, IReadOnlyList<WorldPlayerModel>>
    {
        private readonly IWorldPlayerReadRepository _repository;

        public GetWorldPlayersQueryHandler(
            IWorldPlayerReadRepository repository)
        {
            _repository = repository;
        }

        public Task<IReadOnlyList<WorldPlayerModel>> HandleAsync(
            GetWorldPlayersQuery request,
            CancellationToken cancellationToken = default)
        {
            return _repository.SearchAsync(
                request.Search,
                cancellationToken);
        }
    }
}
