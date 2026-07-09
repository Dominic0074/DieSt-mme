using Microsoft.AspNetCore.Mvc;
using website.Application.CQRS;
using website.Application.Queries.WorldVillages;
using website.Domain.Models.WorldVillages;

namespace website.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class WorldVillagesController : ControllerBase
    {
        private readonly IRequestSender _requestSender;

        public WorldVillagesController(IRequestSender requestSender)
        {
            _requestSender = requestSender;
        }

        [HttpGet]
        [ProducesResponseType<IReadOnlyList<WorldVillageModel>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<WorldVillageModel>>> GetWorldVillages(
            [FromQuery] string? world,
            [FromQuery] long? gameVillageId,
            [FromQuery] string? name,
            [FromQuery] int? x,
            [FromQuery] int? y,
            [FromQuery] int? continent,
            [FromQuery] long? gamePlayerId,
            CancellationToken cancellationToken)
        {
            var villages = await _requestSender.SendAsync(
                new GetWorldVillagesQuery(new WorldVillageSearchModel
                {
                    World = world,
                    GameVillageId = gameVillageId,
                    Name = name,
                    X = x,
                    Y = y,
                    Continent = continent,
                    GamePlayerId = gamePlayerId
                }),
                cancellationToken);

            return Ok(villages);
        }
    }
}
