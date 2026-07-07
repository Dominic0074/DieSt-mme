using website.Application.CQRS;
using website.Domain.Models;

namespace website.Application.Queries.Items
{
    public sealed record GetItemByIdQuery(Guid Id) : IRequest<ItemModel?>;
}
