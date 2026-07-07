using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using website.Application.BattleReports;
using website.Domain.Models.BattleReports;
using website.Infrastructure.Database;
using website.Infrastructure.Database.Entities;

namespace website.Infrastructure.Repositories
{
    internal sealed class SqliteBattleReportImportRepository
        : IBattleReportImportRepository
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public SqliteBattleReportImportRepository(
            IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<BattleReportImportResultModel> ImportAsync(
            ParsedBattleReportModel report,
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);

            var existingReport = await context.BattleReports
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    entity => entity.World == report.World
                        && entity.GameReportId == report.GameReportId,
                    cancellationToken);

            if (existingReport is not null)
            {
                return new BattleReportImportResultModel
                {
                    BattleReportId = existingReport.Id,
                    World = existingReport.World,
                    GameReportId = existingReport.GameReportId,
                    WasCreated = false,
                    AnalysisPipelineTriggered = false
                };
            }

            await using var transaction =
                await context.Database.BeginTransactionAsync(cancellationToken);

            await UpsertPlayerReferenceAsync(
                context,
                report.World,
                report.Attacker,
                report.BattleTimeUtc,
                cancellationToken);
            await UpsertPlayerReferenceAsync(
                context,
                report.World,
                report.Defender,
                report.BattleTimeUtc,
                cancellationToken);
            await UpsertVillageReferenceAsync(
                context,
                report.World,
                report.Attacker,
                report.BattleTimeUtc,
                cancellationToken);
            await UpsertVillageReferenceAsync(
                context,
                report.World,
                report.Defender,
                report.BattleTimeUtc,
                cancellationToken);
            foreach (var army in report.DefenderArmiesInOtherVillages ?? [])
            {
                if (army is null)
                {
                    continue;
                }

                await UpsertVillageReferenceAsync(
                    context,
                    report.World,
                    army.Village,
                    report.BattleTimeUtc,
                    cancellationToken);
            }

            var entity = new BattleReportEntity
            {
                Id = Guid.NewGuid(),
                World = report.World,
                GameReportId = report.GameReportId,
                Subject = report.Subject,
                BattleTimeUtc = report.BattleTimeUtc,
                ForwardedAtUtc = report.ForwardedAtUtc,
                ForwardedByGamePlayerId = report.ForwardedByGamePlayerId,
                Outcome = ParseOutcome(report.Outcome),
                AttackerLuckPercent = report.AttackerLuckPercent,
                MoralePercent = report.MoralePercent,
                LoyaltyBefore = report.LoyaltyBefore,
                LoyaltyAfter = report.LoyaltyAfter,
                AttackerGamePlayerId = report.Attacker.GamePlayerId,
                DefenderGamePlayerId = report.Defender.GamePlayerId,
                AttackingGameVillageId = report.Attacker.GameVillageId,
                DefendingGameVillageId = report.Defender.GameVillageId,
                LootWood = 0,
                LootClay = 0,
                LootIron = 0,
                CarryCapacityUsed = 0,
                CarryCapacityTotal = 0,
                SourceHash = string.IsNullOrWhiteSpace(report.SourceHash)
                    ? ComputeImportHash(report)
                    : report.SourceHash,
                ExportCode = report.ExportCode,
                ImportedAtUtc = DateTime.UtcNow
            };

            foreach (var army in report.Armies ?? [])
            {
                if (army is null)
                {
                    continue;
                }

                entity.Armies.Add(ToEntity(
                    army,
                    MapSide(army.Type),
                    MapKind(army.Type)));
            }

            if (report.DefenderTravelingArmy is not null)
            {
                entity.Armies.Add(ToEntity(
                    report.DefenderTravelingArmy,
                    BattleReportSide.Defender,
                    BattleReportArmyKind.Traveling));
            }

            foreach (var army in report.DefenderArmiesInOtherVillages ?? [])
            {
                if (army?.Army is null)
                {
                    continue;
                }

                entity.Armies.Add(ToEntity(
                    army.Army,
                    BattleReportSide.Defender,
                    BattleReportArmyKind.OtherVillage,
                    army.Village));
            }

            context.BattleReports.Add(entity);
            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new BattleReportImportResultModel
            {
                BattleReportId = entity.Id,
                World = entity.World,
                GameReportId = entity.GameReportId,
                WasCreated = true,
                AnalysisPipelineTriggered = false
            };
        }

        private static async Task UpsertPlayerReferenceAsync(
            AppDbContext context,
            string world,
            BattleReportParticipantModel participant,
            DateTime seenAtUtc,
            CancellationToken cancellationToken)
        {
            if (participant.GamePlayerId is null)
            {
                return;
            }

            var entity = await context.WorldPlayers.SingleOrDefaultAsync(
                player => player.World == world
                    && player.GamePlayerId == participant.GamePlayerId.Value,
                cancellationToken);

            if (entity is null)
            {
                context.WorldPlayers.Add(new WorldPlayerEntity
                {
                    Id = Guid.NewGuid(),
                    World = world,
                    GamePlayerId = participant.GamePlayerId.Value,
                    Name = participant.PlayerName,
                    FirstSeenInReportAtUtc = seenAtUtc,
                    LastSeenInReportAtUtc = seenAtUtc
                });
                return;
            }

            entity.Name = participant.PlayerName;
            entity.FirstSeenInReportAtUtc ??= seenAtUtc;
            entity.LastSeenInReportAtUtc = Max(
                entity.LastSeenInReportAtUtc,
                seenAtUtc);
        }

        private static async Task UpsertVillageReferenceAsync(
            AppDbContext context,
            string world,
            BattleReportParticipantModel participant,
            DateTime seenAtUtc,
            CancellationToken cancellationToken)
        {
            var entity = await context.WorldVillages.SingleOrDefaultAsync(
                village => village.World == world
                    && village.GameVillageId == participant.GameVillageId,
                cancellationToken);

            if (entity is null)
            {
                context.WorldVillages.Add(new WorldVillageEntity
                {
                    Id = Guid.NewGuid(),
                    World = world,
                    GameVillageId = participant.GameVillageId,
                    Name = participant.VillageName,
                    X = participant.X,
                    Y = participant.Y,
                    Continent = participant.Continent,
                    GamePlayerId = participant.GamePlayerId,
                    FirstSeenInReportAtUtc = seenAtUtc,
                    LastSeenInReportAtUtc = seenAtUtc
                });
                return;
            }

            entity.Name = participant.VillageName;
            entity.X = participant.X;
            entity.Y = participant.Y;
            entity.Continent = participant.Continent;
            entity.GamePlayerId = participant.GamePlayerId;
            entity.FirstSeenInReportAtUtc ??= seenAtUtc;
            entity.LastSeenInReportAtUtc = Max(
                entity.LastSeenInReportAtUtc,
                seenAtUtc);
        }

        private static DateTime Max(DateTime? current, DateTime value)
        {
            return current.HasValue && current.Value > value
                ? current.Value
                : value;
        }

        private static BattleReportOutcome ParseOutcome(string value)
        {
            return Enum.TryParse<BattleReportOutcome>(value, out var outcome)
                ? outcome
                : BattleReportOutcome.Unknown;
        }

        private static BattleReportArmyEntity ToEntity(
            BattleReportArmyModel model,
            BattleReportSide side,
            BattleReportArmyKind kind,
            BattleReportParticipantModel? sourceVillage = null)
        {
            return new BattleReportArmyEntity
            {
                Id = Guid.NewGuid(),
                Side = side,
                Kind = kind,
                SourceGamePlayerId = sourceVillage?.GamePlayerId,
                SourceGameVillageId = sourceVillage?.GameVillageId,
                SourceVillageName = sourceVillage?.VillageName ?? string.Empty,
                SourceVillageX = sourceVillage?.X,
                SourceVillageY = sourceVillage?.Y,
                SourceVillageContinent = sourceVillage?.Continent,
                SpearCount = model.SpearCount,
                SpearLosses = model.SpearLosses,
                SwordCount = model.SwordCount,
                SwordLosses = model.SwordLosses,
                AxeCount = model.AxeCount,
                AxeLosses = model.AxeLosses,
                ArcherCount = model.ArcherCount,
                ArcherLosses = model.ArcherLosses,
                SpyCount = model.SpyCount,
                SpyLosses = model.SpyLosses,
                LightCount = model.LightCount,
                LightLosses = model.LightLosses,
                MountedArcherCount = model.MountedArcherCount,
                MountedArcherLosses = model.MountedArcherLosses,
                HeavyCount = model.HeavyCount,
                HeavyLosses = model.HeavyLosses,
                RamCount = model.RamCount,
                RamLosses = model.RamLosses,
                CatapultCount = model.CatapultCount,
                CatapultLosses = model.CatapultLosses,
                KnightCount = model.KnightCount,
                KnightLosses = model.KnightLosses,
                SnobCount = model.SnobCount,
                SnobLosses = model.SnobLosses,
                MilitiaCount = model.MilitiaCount,
                MilitiaLosses = model.MilitiaLosses
            };
        }

        private static BattleReportSide MapSide(BattleReportArmyType type)
        {
            return type switch
            {
                BattleReportArmyType.Attacker => BattleReportSide.Attacker,
                BattleReportArmyType.Defender => BattleReportSide.Defender,
                BattleReportArmyType.Away => BattleReportSide.Defender,
                _ => throw new ArgumentException(
                    $"Unbekannter BattleReportArmy-Type '{type}'.")
            };
        }

        private static BattleReportArmyKind MapKind(BattleReportArmyType type)
        {
            return type switch
            {
                BattleReportArmyType.Attacker => BattleReportArmyKind.Combat,
                BattleReportArmyType.Defender => BattleReportArmyKind.Combat,
                BattleReportArmyType.Away => BattleReportArmyKind.Away,
                _ => throw new ArgumentException(
                    $"Unbekannter BattleReportArmy-Type '{type}'.")
            };
        }

        private static string ComputeImportHash(ParsedBattleReportModel report)
        {
            var source = $"{report.World}:{report.GameReportId}";
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(source));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }
    }
}
