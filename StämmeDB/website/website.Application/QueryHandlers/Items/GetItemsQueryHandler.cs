using website.Application.CQRS;
using website.Application.Queries.Items;
using website.Application.Repositories;
using website.Domain.Models;

namespace website.Application.QueryHandlers.Items
{
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
}
