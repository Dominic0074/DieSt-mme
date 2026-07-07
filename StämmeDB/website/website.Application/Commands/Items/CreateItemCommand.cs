using website.Application.CQRS;
using website.Domain.Models;

namespace website.Application.Commands.Items
{
    public sealed record CreateItemCommand(string Name) : IRequest<ItemModel>;
}
