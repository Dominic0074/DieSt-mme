using Microsoft.EntityFrameworkCore;

namespace website.Infrastructure.Database
{
    public sealed class DatabaseInitializer
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public DatabaseInitializer(IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task InitializeAsync(
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);
            await context.Database.EnsureCreatedAsync(cancellationToken);
        }
    }
}
