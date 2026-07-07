using Microsoft.EntityFrameworkCore;
using website.Application.BattleReports;
using website.Domain.Models.BattleReports;
using website.Infrastructure.Database;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Repositories
{
    internal sealed class SqliteBattleReportReadRepository
        : IBattleReportReadRepository
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public SqliteBattleReportReadRepository(
            IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<IReadOnlyList<BattleReportModel>> SearchAsync(
            BattleReportSearchModel search,
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            var query = context.BattleReports
                .AsNoTracking()
                .Include(report => report.Armies)
                .AsQueryable();

            if (search.Id.HasValue)
            {
                query = query.Where(report => report.Id == search.Id.Value);
            }

            if (search.GameReportId.HasValue)
            {
                query = query.Where(
                    report => report.GameReportId == search.GameReportId.Value);
            }

            if (search.PlayerId.HasValue)
            {
                query = query.Where(report =>
                    report.AttackerGamePlayerId == search.PlayerId.Value
                    || report.DefenderGamePlayerId == search.PlayerId.Value
                    || report.Armies.Any(army =>
                        army.SourceGamePlayerId == search.PlayerId.Value));
            }

            if (!string.IsNullOrWhiteSpace(search.PlayerName))
            {
                var playerName = search.PlayerName.Trim();
                var playerPattern = $"%{EscapeLikePattern(playerName)}%";

                query = query.Where(report =>
                    context.WorldPlayers.Any(player =>
                        player.World == report.World
                        && (player.GamePlayerId == report.AttackerGamePlayerId
                            || player.GamePlayerId == report.DefenderGamePlayerId
                            || report.Armies.Any(army =>
                                army.SourceGamePlayerId == player.GamePlayerId))
                        && EF.Functions.Like(
                            player.Name,
                            playerPattern,
                            "\\")));
            }

            if (search.VillageId.HasValue)
            {
                query = query.Where(report =>
                    report.AttackingGameVillageId == search.VillageId.Value
                    || report.DefendingGameVillageId == search.VillageId.Value
                    || report.Armies.Any(army =>
                        army.SourceGameVillageId == search.VillageId.Value));
            }

            if (!string.IsNullOrWhiteSpace(search.VillageName))
            {
                var villageName = search.VillageName.Trim();
                var villagePattern = $"%{EscapeLikePattern(villageName)}%";

                query = query.Where(report =>
                    context.WorldVillages.Any(village =>
                        village.World == report.World
                        && (village.GameVillageId == report.AttackingGameVillageId
                            || village.GameVillageId == report.DefendingGameVillageId
                            || report.Armies.Any(army =>
                                army.SourceGameVillageId == village.GameVillageId))
                        && EF.Functions.Like(
                            village.Name,
                            villagePattern,
                            "\\")));
            }

            var reports = await query
                .OrderByDescending(report => report.BattleTimeUtc)
                .ThenByDescending(report => report.ImportedAtUtc)
                .ToListAsync(cancellationToken);

            return await MapAsync(
                context,
                reports,
                cancellationToken);
        }

        private static async Task<IReadOnlyList<BattleReportModel>> MapAsync(
            AppDbContext context,
            IReadOnlyCollection<BattleReportEntity> reports,
            CancellationToken cancellationToken)
        {
            var reportWorlds = reports
                .Select(report => report.World)
                .Distinct()
                .ToList();
            var playerIds = reports
                .SelectMany(report => new long?[]
                {
                    report.AttackerGamePlayerId,
                    report.DefenderGamePlayerId
                }.Concat(report.Armies.Select(army => army.SourceGamePlayerId)))
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();
            var villageIds = reports
                .SelectMany(report => new long?[]
                {
                    report.AttackingGameVillageId,
                    report.DefendingGameVillageId
                }.Concat(report.Armies.Select(army => army.SourceGameVillageId)))
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .Distinct()
                .ToList();

            var players = await context.WorldPlayers
                .AsNoTracking()
                .Where(player => reportWorlds.Contains(player.World)
                    && playerIds.Contains(player.GamePlayerId))
                .ToListAsync(cancellationToken);
            var villages = await context.WorldVillages
                .AsNoTracking()
                .Where(village => reportWorlds.Contains(village.World)
                    && villageIds.Contains(village.GameVillageId))
                .ToListAsync(cancellationToken);

            return reports
                .Select(report => ToModel(report, players, villages))
                .ToList();
        }

        private static BattleReportModel ToModel(
            BattleReportEntity report,
            IReadOnlyCollection<WorldPlayerEntity> players,
            IReadOnlyCollection<WorldVillageEntity> villages)
        {
            return new BattleReportModel
            {
                Id = report.Id,
                World = report.World,
                GameReportId = report.GameReportId,
                Subject = report.Subject,
                BattleTimeUtc = report.BattleTimeUtc,
                ForwardedAtUtc = report.ForwardedAtUtc,
                ForwardedByGamePlayerId = report.ForwardedByGamePlayerId,
                Outcome = report.Outcome.ToString(),
                AttackerLuckPercent = report.AttackerLuckPercent,
                MoralePercent = report.MoralePercent,
                LoyaltyBefore = report.LoyaltyBefore,
                LoyaltyAfter = report.LoyaltyAfter,
                Attacker = ToParticipant(
                    report.World,
                    report.AttackerGamePlayerId,
                    report.AttackingGameVillageId,
                    players,
                    villages),
                Defender = ToParticipant(
                    report.World,
                    report.DefenderGamePlayerId,
                    report.DefendingGameVillageId,
                    players,
                    villages),
                LootWood = report.LootWood,
                LootClay = report.LootClay,
                LootIron = report.LootIron,
                CarryCapacityUsed = report.CarryCapacityUsed,
                CarryCapacityTotal = report.CarryCapacityTotal,
                Armies = report.Armies
                    .OrderBy(army => army.Side)
                    .ThenBy(army => army.Kind)
                    .ThenBy(army => army.SourceGameVillageId)
                    .Select(army => ToArmyModel(report.World, army, players, villages))
                    .ToList(),
                SourceHash = report.SourceHash,
                ExportCode = report.ExportCode,
                ImportedAtUtc = report.ImportedAtUtc
            };
        }

        private static BattleReportParticipantModel ToParticipant(
            string world,
            long? playerId,
            long villageId,
            IReadOnlyCollection<WorldPlayerEntity> players,
            IReadOnlyCollection<WorldVillageEntity> villages)
        {
            var player = playerId.HasValue
                ? players.SingleOrDefault(candidate => candidate.World == world
                    && candidate.GamePlayerId == playerId.Value)
                : null;
            var village = villages.SingleOrDefault(candidate =>
                candidate.World == world
                && candidate.GameVillageId == villageId);

            return new BattleReportParticipantModel
            {
                GamePlayerId = playerId,
                PlayerName = player?.Name ?? string.Empty,
                GameVillageId = villageId,
                VillageName = village?.Name ?? string.Empty,
                X = village?.X ?? 0,
                Y = village?.Y ?? 0,
                Continent = village?.Continent ?? 0
            };
        }

        private static BattleReportArmySnapshotModel ToArmyModel(
            string world,
            BattleReportArmyEntity army,
            IReadOnlyCollection<WorldPlayerEntity> players,
            IReadOnlyCollection<WorldVillageEntity> villages)
        {
            return new BattleReportArmySnapshotModel
            {
                Side = army.Side.ToString(),
                Kind = army.Kind.ToString(),
                SourceVillage = army.SourceGameVillageId.HasValue
                    ? ToParticipant(
                        world,
                        army.SourceGamePlayerId,
                        army.SourceGameVillageId.Value,
                        players,
                        villages)
                    : null,
                SpearCount = army.SpearCount,
                SpearLosses = army.SpearLosses,
                SwordCount = army.SwordCount,
                SwordLosses = army.SwordLosses,
                AxeCount = army.AxeCount,
                AxeLosses = army.AxeLosses,
                ArcherCount = army.ArcherCount,
                ArcherLosses = army.ArcherLosses,
                SpyCount = army.SpyCount,
                SpyLosses = army.SpyLosses,
                LightCount = army.LightCount,
                LightLosses = army.LightLosses,
                MountedArcherCount = army.MountedArcherCount,
                MountedArcherLosses = army.MountedArcherLosses,
                HeavyCount = army.HeavyCount,
                HeavyLosses = army.HeavyLosses,
                RamCount = army.RamCount,
                RamLosses = army.RamLosses,
                CatapultCount = army.CatapultCount,
                CatapultLosses = army.CatapultLosses,
                KnightCount = army.KnightCount,
                KnightLosses = army.KnightLosses,
                SnobCount = army.SnobCount,
                SnobLosses = army.SnobLosses,
                MilitiaCount = army.MilitiaCount,
                MilitiaLosses = army.MilitiaLosses
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
