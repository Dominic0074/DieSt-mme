using DorfBuilder.Application.CQRS;
using DorfBuilder.Application.Repositories;
using DorfBuilder.Domain.Models;

namespace DorfBuilder.Application.Items;

public sealed class GetItemsQueryHandler
    : IRequestHandler<GetItemsQuery, IReadOnlyList<ItemModel>>
{
    private readonly IItemRepository _repository;

    public GetItemsQueryHandler(IItemRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<ItemModel>> HandleAsync(
        GetItemsQuery request,
        CancellationToken cancellationToken = default)
    {
        return _repository.GetAllAsync(cancellationToken);
    }
}

public sealed class CreateItemCommandHandler
    : IRequestHandler<CreateItemCommand, ItemModel>
{
    private readonly IItemRepository _repository;

    public CreateItemCommandHandler(IItemRepository repository)
    {
        _repository = repository;
    }

    public Task<ItemModel> HandleAsync(
        CreateItemCommand request,
        CancellationToken cancellationToken = default)
    {
        var name = request.Name.Trim();
        if (name.Length == 0)
        {
            throw new ArgumentException("Der Name darf nicht leer sein.");
        }

        return _repository.AddAsync(name, cancellationToken);
    }
}

public sealed class DeleteItemCommandHandler
    : IRequestHandler<DeleteItemCommand>
{
    private readonly IItemRepository _repository;

    public DeleteItemCommandHandler(IItemRepository repository)
    {
        _repository = repository;
    }

    public Task HandleAsync(
        DeleteItemCommand request,
        CancellationToken cancellationToken = default)
    {
        return _repository.DeleteAsync(request.Id, cancellationToken);
    }
}

