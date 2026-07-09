using website.Domain.Models.WorldVillages;

namespace website.Application.WorldVillages
{
    public interface IWorldVillageReadRepository
    {
        Task<IReadOnlyList<WorldVillageModel>> SearchAsync(
            WorldVillageSearchModel search,
            CancellationToken cancellationToken = default);
    }
}
