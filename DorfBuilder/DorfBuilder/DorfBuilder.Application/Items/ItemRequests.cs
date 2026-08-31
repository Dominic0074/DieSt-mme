using DorfBuilder.Application.CQRS;
using DorfBuilder.Domain.Models;

namespace DorfBuilder.Application.Items;

public sealed record GetItemsQuery : IRequest<IReadOnlyList<ItemModel>>;

public sealed record CreateItemCommand(string Name) : IRequest<ItemModel>;

public sealed record DeleteItemCommand(Guid Id) : IRequest;

