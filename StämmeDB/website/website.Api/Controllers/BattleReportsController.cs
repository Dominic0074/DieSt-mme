using Microsoft.AspNetCore.Mvc;
using website.Application.Commands.BattleReports;
using website.Application.CQRS;
using website.Application.Queries.BattleReports;
using website.Domain.Models.BattleReports;

namespace website.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class BattleReportsController : ControllerBase
    {
        private readonly IRequestSender _requestSender;

        public BattleReportsController(IRequestSender requestSender)
        {
            _requestSender = requestSender;
        }

        [HttpGet]
        [ProducesResponseType<IReadOnlyList<BattleReportModel>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<BattleReportModel>>> GetBattleReports(
            [FromQuery] Guid? id,
            [FromQuery] long? gameReportId,
            [FromQuery] long? playerId,
            [FromQuery] string? playerName,
            [FromQuery] long? villageId,
            [FromQuery] string? villageName,
            CancellationToken cancellationToken)
        {
            var reports = await _requestSender.SendAsync(
                new GetBattleReportsQuery(new BattleReportSearchModel
                {
                    Id = id,
                    GameReportId = gameReportId,
                    PlayerId = playerId,
                    PlayerName = playerName,
                    VillageId = villageId,
                    VillageName = villageName
                }),
                cancellationToken);

            return Ok(reports);
        }

        [HttpGet("{id:guid}")]
        [ProducesResponseType<IReadOnlyList<BattleReportModel>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<BattleReportModel>>> GetBattleReportsById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var reports = await _requestSender.SendAsync(
                new GetBattleReportsQuery(new BattleReportSearchModel
                {
                    Id = id
                }),
                cancellationToken);

            return Ok(reports);
        }

        [HttpPost("import")]
        [ProducesResponseType<BattleReportImportResultModel>(StatusCodes.Status200OK)]
        [ProducesResponseType<BattleReportImportResultModel>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<BattleReportImportResultModel>> Import(
            ParsedBattleReportModel? request,
            CancellationToken cancellationToken)
        {
            if (request is null)
            {
                ModelState.AddModelError(
                    string.Empty,
                    "Der Bericht darf nicht leer sein.");
                return ValidationProblem(ModelState);
            }

            ValidateImportRequest(request);
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            try
            {
                var result = await _requestSender.SendAsync(
                    new ImportBattleReportCommand(request),
                    cancellationToken);

                if (!result.WasCreated)
                {
                    return Ok(result);
                }

                return StatusCode(StatusCodes.Status201Created, result);
            }
            catch (FormatException exception)
            {
                ModelState.AddModelError(
                    string.Empty,
                    exception.Message);
                return ValidationProblem(ModelState);
            }
            catch (ArgumentException exception)
            {
                ModelState.AddModelError(
                    string.Empty,
                    exception.Message);
                return ValidationProblem(ModelState);
            }
        }

        private void ValidateImportRequest(ParsedBattleReportModel request)
        {
            if (string.IsNullOrWhiteSpace(request.World))
            {
                ModelState.AddModelError(
                    nameof(request.World),
                    "Die Welt darf nicht leer sein.");
            }

            if (request.GameReportId <= 0)
            {
                ModelState.AddModelError(
                    nameof(request.GameReportId),
                    "Die Berichts-ID muss groesser als 0 sein.");
            }

            if (request.BattleTimeUtc == default)
            {
                ModelState.AddModelError(
                    nameof(request.BattleTimeUtc),
                    "Die Kampfzeit muss gesetzt sein.");
            }

            ValidateParticipant(request.Attacker, nameof(request.Attacker));
            ValidateParticipant(request.Defender, nameof(request.Defender));
            ValidateArmies(request.Armies ?? []);
            ValidateUnitBlock(
                request.DefenderTravelingArmy,
                nameof(request.DefenderTravelingArmy));
            ValidateDefenderArmiesInOtherVillages(
                request.DefenderArmiesInOtherVillages ?? []);
        }

        private void ValidateParticipant(
            BattleReportParticipantModel participant,
            string fieldName)
        {
            if (participant.GameVillageId <= 0)
            {
                ModelState.AddModelError(
                    $"{fieldName}.{nameof(participant.GameVillageId)}",
                    "Die Dorf-ID muss groesser als 0 sein.");
            }

            if (string.IsNullOrWhiteSpace(participant.VillageName))
            {
                ModelState.AddModelError(
                    $"{fieldName}.{nameof(participant.VillageName)}",
                    "Der Dorfname darf nicht leer sein.");
            }

            if (participant.X < 0 || participant.Y < 0)
            {
                ModelState.AddModelError(
                    $"{fieldName}.Coordinates",
                    "Die Koordinaten duerfen nicht negativ sein.");
            }
        }

        private void ValidateArmies(IReadOnlyCollection<BattleReportArmyModel?> armies)
        {
            var seenTypes = new HashSet<BattleReportArmyType>();
            var index = 0;

            foreach (var army in armies)
            {
                var fieldName = $"{nameof(ParsedBattleReportModel.Armies)}[{index}]";
                if (army is null)
                {
                    index++;
                    continue;
                }

                if (!Enum.IsDefined(army.Type))
                {
                    ModelState.AddModelError(
                        $"{fieldName}.{nameof(army.Type)}",
                        "Erlaubte Werte: Attacker, Defender, Away.");
                }
                else if (!seenTypes.Add(army.Type))
                {
                    ModelState.AddModelError(
                        $"{fieldName}.{nameof(army.Type)}",
                        "Jeder Einheitenblock darf nur einmal vorkommen.");
                }

                ValidateUnitPair(
                    army.SpearCount,
                    army.SpearLosses,
                    $"{fieldName}.Spear");
                ValidateUnitPair(
                    army.SwordCount,
                    army.SwordLosses,
                    $"{fieldName}.Sword");
                ValidateUnitPair(
                    army.AxeCount,
                    army.AxeLosses,
                    $"{fieldName}.Axe");
                ValidateUnitPair(
                    army.ArcherCount,
                    army.ArcherLosses,
                    $"{fieldName}.Archer");
                ValidateUnitPair(
                    army.SpyCount,
                    army.SpyLosses,
                    $"{fieldName}.Spy");
                ValidateUnitPair(
                    army.LightCount,
                    army.LightLosses,
                    $"{fieldName}.Light");
                ValidateUnitPair(
                    army.MountedArcherCount,
                    army.MountedArcherLosses,
                    $"{fieldName}.MountedArcher");
                ValidateUnitPair(
                    army.HeavyCount,
                    army.HeavyLosses,
                    $"{fieldName}.Heavy");
                ValidateUnitPair(
                    army.RamCount,
                    army.RamLosses,
                    $"{fieldName}.Ram");
                ValidateUnitPair(
                    army.CatapultCount,
                    army.CatapultLosses,
                    $"{fieldName}.Catapult");
                ValidateUnitPair(
                    army.KnightCount,
                    army.KnightLosses,
                    $"{fieldName}.Knight");
                ValidateUnitPair(
                    army.SnobCount,
                    army.SnobLosses,
                    $"{fieldName}.Snob");
                ValidateUnitPair(
                    army.MilitiaCount,
                    army.MilitiaLosses,
                    $"{fieldName}.Militia");

                index++;
            }
        }

        private void ValidateDefenderArmiesInOtherVillages(
            IReadOnlyCollection<BattleReportVillageArmyModel?> armies)
        {
            var seenVillages = new HashSet<long>();
            var index = 0;

            foreach (var army in armies)
            {
                var fieldName =
                    $"{nameof(ParsedBattleReportModel.DefenderArmiesInOtherVillages)}[{index}]";
                if (army is null)
                {
                    index++;
                    continue;
                }

                ValidateParticipant(
                    army.Village,
                    $"{fieldName}.{nameof(army.Village)}");

                if (!seenVillages.Add(army.Village.GameVillageId))
                {
                    ModelState.AddModelError(
                        $"{fieldName}.{nameof(army.Village)}.{nameof(army.Village.GameVillageId)}",
                        "Jedes externe Verteidigerdorf darf nur einmal vorkommen.");
                }

                ValidateUnitBlock(
                    army.Army,
                    $"{fieldName}.{nameof(army.Army)}");

                index++;
            }
        }

        private void ValidateUnitBlock(
            BattleReportArmyModel? army,
            string fieldName)
        {
            if (army is null)
            {
                return;
            }

            ValidateUnitPair(
                army.SpearCount,
                army.SpearLosses,
                $"{fieldName}.Spear");
            ValidateUnitPair(
                army.SwordCount,
                army.SwordLosses,
                $"{fieldName}.Sword");
            ValidateUnitPair(
                army.AxeCount,
                army.AxeLosses,
                $"{fieldName}.Axe");
            ValidateUnitPair(
                army.ArcherCount,
                army.ArcherLosses,
                $"{fieldName}.Archer");
            ValidateUnitPair(
                army.SpyCount,
                army.SpyLosses,
                $"{fieldName}.Spy");
            ValidateUnitPair(
                army.LightCount,
                army.LightLosses,
                $"{fieldName}.Light");
            ValidateUnitPair(
                army.MountedArcherCount,
                army.MountedArcherLosses,
                $"{fieldName}.MountedArcher");
            ValidateUnitPair(
                army.HeavyCount,
                army.HeavyLosses,
                $"{fieldName}.Heavy");
            ValidateUnitPair(
                army.RamCount,
                army.RamLosses,
                $"{fieldName}.Ram");
            ValidateUnitPair(
                army.CatapultCount,
                army.CatapultLosses,
                $"{fieldName}.Catapult");
            ValidateUnitPair(
                army.KnightCount,
                army.KnightLosses,
                $"{fieldName}.Knight");
            ValidateUnitPair(
                army.SnobCount,
                army.SnobLosses,
                $"{fieldName}.Snob");
            ValidateUnitPair(
                army.MilitiaCount,
                army.MilitiaLosses,
                $"{fieldName}.Militia");
        }

        private void ValidateUnitPair(int? count, int? losses, string fieldName)
        {
            if ((count.HasValue && count.Value < 0)
                || (losses.HasValue && losses.Value < 0))
            {
                ModelState.AddModelError(
                    fieldName,
                    "Einheiten und Verluste duerfen nicht negativ sein.");
            }

            if (count.HasValue && losses.HasValue && losses.Value > count.Value)
            {
                ModelState.AddModelError(
                    fieldName,
                    "Verluste duerfen nicht groesser als die Anzahl sein.");
            }
        }
    }
}
