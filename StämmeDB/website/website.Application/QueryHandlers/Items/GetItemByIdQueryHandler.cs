using website.Application.CQRS;
using website.Application.Queries.Items;
using website.Application.Repositories;
using website.Domain.Models;

namespace website.Application.QueryHandlers.Items
{
    public sealed class GetItemByIdQueryHandler
        : IRequestHandler<GetItemByIdQuery, ItemModel?>
    {
        private readonly IItemRepository _repository;

        public GetItemByIdQueryHandler(IItemRepository repository)
        {
            _repository = repository;
        }

        public Task<ItemModel?> HandleAsync(
            GetItemByIdQuery request,
            CancellationToken cancellationToken = default)
        {
            return _repository.GetByIdAsync(request.Id, cancellationToken);
        }
    }
}
