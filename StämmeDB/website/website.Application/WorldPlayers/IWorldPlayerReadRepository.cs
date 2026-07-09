using website.Domain.Models.WorldPlayers;

namespace website.Application.WorldPlayers
{
    public interface IWorldPlayerReadRepository
    {
        Task<IReadOnlyList<WorldPlayerModel>> SearchAsync(
            WorldPlayerSearchModel search,
            CancellationToken cancellationToken = default);
    }
}
