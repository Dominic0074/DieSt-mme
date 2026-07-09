using Microsoft.AspNetCore.Mvc;
using website.Application.CQRS;
using website.Application.Queries.WorldPlayers;
using website.Domain.Models.WorldPlayers;

namespace website.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class WorldPlayersController : ControllerBase
    {
        private readonly IRequestSender _requestSender;

        public WorldPlayersController(IRequestSender requestSender)
        {
            _requestSender = requestSender;
        }

        [HttpGet]
        [ProducesResponseType<IReadOnlyList<WorldPlayerModel>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<WorldPlayerModel>>> GetWorldPlayers(
            [FromQuery] string? world,
            [FromQuery] long? gamePlayerId,
            [FromQuery] string? name,
            [FromQuery] long? gameAllyId,
            CancellationToken cancellationToken)
        {
            var players = await _requestSender.SendAsync(
                new GetWorldPlayersQuery(new WorldPlayerSearchModel
                {
                    World = world,
                    GamePlayerId = gamePlayerId,
                    Name = name,
                    GameAllyId = gameAllyId
                }),
                cancellationToken);

            return Ok(players);
        }
    }
}
