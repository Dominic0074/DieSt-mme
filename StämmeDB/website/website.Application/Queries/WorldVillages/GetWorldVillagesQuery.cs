using website.Application.CQRS;
using website.Domain.Models.WorldVillages;

namespace website.Application.Queries.WorldVillages
{
    public sealed record GetWorldVillagesQuery(WorldVillageSearchModel Search)
        : IRequest<IReadOnlyList<WorldVillageModel>>;
}
