using Microsoft.EntityFrameworkCore;
using website.Application.Repositories;
using website.Domain.Models;
using website.Infrastructure.Database;
using website.Infrastructure.Extensions;

namespace website.Infrastructure.Repositories
{
    internal sealed class SqliteItemRepository : IItemRepository
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public SqliteItemRepository(IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<ItemModel?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            var entity = await context.Items
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    item => item.Id == id,
                    cancellationToken);

            return entity?.ToModel();
        }

        public async Task<IReadOnlyList<ItemModel>> GetAllAsync(
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            var entities = await context.Items
                .AsNoTracking()
                .OrderByDescending(item => item.CreatedAt)
                .ToListAsync(cancellationToken);

            return entities
                .Select(entity => entity.ToModel())
                .ToList();
        }

        public async Task<ItemModel> AddAsync(
            string name,
            CancellationToken cancellationToken = default)
        {
            var model = new ItemModel
            {
                Id = Guid.NewGuid(),
                Name = name.Length <= 200 ? name : name[..200],
                CreatedAt = DateTime.UtcNow
            };
            var entity = model.ToEntity();

            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);
            context.Items.Add(entity);
            await context.SaveChangesAsync(cancellationToken);

            return entity.ToModel();
        }

        public async Task DeleteAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);
            var entity = await context.Items.FindAsync([id], cancellationToken);

            if (entity is null)
            {
                return;
            }

            context.Items.Remove(entity);
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
