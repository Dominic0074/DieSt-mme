using Microsoft.EntityFrameworkCore;
using website.Application.WorldPlayers;
using website.Domain.Models.WorldPlayers;
using website.Infrastructure.Database;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Repositories
{
    internal sealed class SqliteWorldPlayerReadRepository
        : IWorldPlayerReadRepository
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public SqliteWorldPlayerReadRepository(
            IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<IReadOnlyList<WorldPlayerModel>> SearchAsync(
            WorldPlayerSearchModel search,
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            var query = context.WorldPlayers
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.World))
            {
                query = query.Where(player => player.World == search.World.Trim());
            }

            if (search.GamePlayerId.HasValue)
            {
                query = query.Where(
                    player => player.GamePlayerId == search.GamePlayerId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search.Name))
            {
                var pattern = $"%{EscapeLikePattern(search.Name.Trim())}%";
                query = query.Where(player =>
                    EF.Functions.Like(player.Name, pattern, "\\"));
            }

            if (search.GameAllyId.HasValue)
            {
                query = query.Where(
                    player => player.GameAllyId == search.GameAllyId.Value);
            }

            var players = await query
                .OrderBy(player => player.World)
                .ThenBy(player => player.Rank ?? int.MaxValue)
                .ThenBy(player => player.Name)
                .ToListAsync(cancellationToken);

            return players.Select(ToModel).ToList();
        }

        private static WorldPlayerModel ToModel(WorldPlayerEntity entity)
        {
            return new WorldPlayerModel
            {
                Id = entity.Id,
                World = entity.World,
                GamePlayerId = entity.GamePlayerId,
                Name = entity.Name,
                GameAllyId = entity.GameAllyId,
                VillageCount = entity.VillageCount,
                Points = entity.Points,
                Rank = entity.Rank,
                ApiUpdatedAtUtc = entity.ApiUpdatedAtUtc,
                FirstSeenInReportAtUtc = entity.FirstSeenInReportAtUtc,
                LastSeenInReportAtUtc = entity.LastSeenInReportAtUtc
            };
        }

        private static string EscapeLikePattern(string value)
        {
            return value
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");
        }
    }
}
