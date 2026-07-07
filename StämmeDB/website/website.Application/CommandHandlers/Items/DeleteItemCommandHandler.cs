using website.Application.Commands.Items;
using website.Application.CQRS;
using website.Application.Repositories;

namespace website.Application.CommandHandlers.Items
{
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
}
