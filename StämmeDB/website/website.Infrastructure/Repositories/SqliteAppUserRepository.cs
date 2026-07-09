using Microsoft.EntityFrameworkCore;
using website.Application.AppUsers;
using website.Domain.Models.AppUsers;
using website.Infrastructure.Database;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Repositories
{
    internal sealed class SqliteAppUserRepository : IAppUserRepository
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public SqliteAppUserRepository(
            IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<AppUserRecord?> FindByNormalizedEmailAsync(
            string normalizedEmail,
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            var entity = await context.AppUsers
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    user => user.NormalizedEmail == normalizedEmail,
                    cancellationToken);

            return entity is null ? null : ToRecord(entity);
        }

        public async Task<AppUserModel> AddAsync(
            string loginEmail,
            string normalizedEmail,
            string passwordHash,
            CancellationToken cancellationToken = default)
        {
            var entity = new AppUserEntity
            {
                Id = Guid.NewGuid(),
                LoginEmail = loginEmail,
                NormalizedEmail = normalizedEmail,
                PasswordHash = passwordHash,
                CreatedAtUtc = DateTime.UtcNow
            };

            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            context.AppUsers.Add(entity);
            await context.SaveChangesAsync(cancellationToken);

            return ToModel(entity);
        }

        public async Task UpdateLastLoginAsync(
            Guid userId,
            DateTime loginAtUtc,
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            var entity = await context.AppUsers.FindAsync(
                [userId],
                cancellationToken);

            if (entity is null)
            {
                return;
            }

            entity.LastLoginAtUtc = loginAtUtc;
            await context.SaveChangesAsync(cancellationToken);
        }

        private static AppUserRecord ToRecord(AppUserEntity entity)
        {
            return new AppUserRecord
            {
                Id = entity.Id,
                LoginEmail = entity.LoginEmail,
                NormalizedEmail = entity.NormalizedEmail,
                PasswordHash = entity.PasswordHash,
                CreatedAtUtc = entity.CreatedAtUtc,
                LastLoginAtUtc = entity.LastLoginAtUtc
            };
        }

        private static AppUserModel ToModel(AppUserEntity entity)
        {
            return new AppUserModel
            {
                Id = entity.Id,
                LoginEmail = entity.LoginEmail,
                CreatedAtUtc = entity.CreatedAtUtc,
                LastLoginAtUtc = entity.LastLoginAtUtc
            };
        }
    }
}
