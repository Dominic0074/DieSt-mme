using website.Application.Commands.Items;
using website.Application.CQRS;
using website.Application.Repositories;
using website.Domain.Models;

namespace website.Application.CommandHandlers.Items
{
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
}
