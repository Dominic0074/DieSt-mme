using Microsoft.EntityFrameworkCore;
using DorfBuilder.Application.Repositories;
using DorfBuilder.Domain.Models;

namespace DorfBuilder.Infrastructure.Database;

internal sealed class SqliteItemRepository : IItemRepository
{
    private readonly IDbContextFactory<AppDbContext> _contextFactory;

    public SqliteItemRepository(IDbContextFactory<AppDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    public async Task<IReadOnlyList<ItemModel>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        await using var context =
            await _contextFactory.CreateDbContextAsync(cancellationToken);

        return await context.Items
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => new ItemModel(item.Id, item.Name, item.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<ItemModel> AddAsync(
        string name,
        CancellationToken cancellationToken = default)
    {
        var entity = new ItemEntity
        {
            Id = Guid.NewGuid(),
            Name = name.Length <= 200 ? name : name[..200],
            CreatedAt = DateTime.UtcNow
        };

        await using var context =
            await _contextFactory.CreateDbContextAsync(cancellationToken);
        context.Items.Add(entity);
        await context.SaveChangesAsync(cancellationToken);

        return new ItemModel(entity.Id, entity.Name, entity.CreatedAt);
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

