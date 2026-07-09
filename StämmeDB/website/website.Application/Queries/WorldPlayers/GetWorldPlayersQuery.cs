using website.Application.CQRS;
using website.Domain.Models.WorldPlayers;

namespace website.Application.Queries.WorldPlayers
{
    public sealed record GetWorldPlayersQuery(WorldPlayerSearchModel Search)
        : IRequest<IReadOnlyList<WorldPlayerModel>>;
}
