using Microsoft.EntityFrameworkCore;
using website.Application.WorldVillages;
using website.Domain.Models.WorldVillages;
using website.Infrastructure.Database;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Repositories
{
    internal sealed class SqliteWorldVillageReadRepository
        : IWorldVillageReadRepository
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public SqliteWorldVillageReadRepository(
            IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<IReadOnlyList<WorldVillageModel>> SearchAsync(
            WorldVillageSearchModel search,
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            var query = context.WorldVillages
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search.World))
            {
                query = query.Where(village => village.World == search.World.Trim());
            }

            if (search.GameVillageId.HasValue)
            {
                query = query.Where(
                    village => village.GameVillageId == search.GameVillageId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search.Name))
            {
                var pattern = $"%{EscapeLikePattern(search.Name.Trim())}%";
                query = query.Where(village =>
                    EF.Functions.Like(village.Name, pattern, "\\"));
            }

            if (search.X.HasValue)
            {
                query = query.Where(village => village.X == search.X.Value);
            }

            if (search.Y.HasValue)
            {
                query = query.Where(village => village.Y == search.Y.Value);
            }

            if (search.Continent.HasValue)
            {
                query = query.Where(
                    village => village.Continent == search.Continent.Value);
            }

            if (search.GamePlayerId.HasValue)
            {
                query = query.Where(
                    village => village.GamePlayerId == search.GamePlayerId.Value);
            }

            var villages = await query
                .OrderBy(village => village.World)
                .ThenBy(village => village.X)
                .ThenBy(village => village.Y)
                .ToListAsync(cancellationToken);

            return villages.Select(ToModel).ToList();
        }

        private static WorldVillageModel ToModel(WorldVillageEntity entity)
        {
            return new WorldVillageModel
            {
                Id = entity.Id,
                World = entity.World,
                GameVillageId = entity.GameVillageId,
                Name = entity.Name,
                X = entity.X,
                Y = entity.Y,
                Continent = entity.Continent,
                GamePlayerId = entity.GamePlayerId,
                Points = entity.Points,
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
