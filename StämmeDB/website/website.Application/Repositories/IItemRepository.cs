using website.Domain.Models;

namespace website.Application.Repositories
{
    public interface IItemRepository
    {
        Task<ItemModel?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<ItemModel>> GetAllAsync(
            CancellationToken cancellationToken = default);

        Task<ItemModel> AddAsync(
            string name,
            CancellationToken cancellationToken = default);

        Task DeleteAsync(
            Guid id,
            CancellationToken cancellationToken = default);
    }
}
