using Microsoft.AspNetCore.Mvc;
using website.Application.Commands.Items;
using website.Application.CQRS;
using website.Application.Queries.Items;
using website.Domain.Models;

namespace website.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class ItemsController : ControllerBase
    {
        private readonly IRequestSender _requestSender;

        public ItemsController(IRequestSender requestSender)
        {
            _requestSender = requestSender;
        }

        [HttpGet]
        [ProducesResponseType<IReadOnlyList<ItemModel>>(StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<ItemModel>>> GetAll(
            CancellationToken cancellationToken)
        {
            var items = await _requestSender.SendAsync(
                new GetItemsQuery(),
                cancellationToken);

            return Ok(items);
        }

        [HttpGet("{id:guid}")]
        [ProducesResponseType<ItemModel>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ItemModel>> GetById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var item = await _requestSender.SendAsync(
                new GetItemByIdQuery(id),
                cancellationToken);

            return item is null ? NotFound() : Ok(item);
        }

        [HttpPost]
        [ProducesResponseType<ItemModel>(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<ItemModel>> Create(
            CreateItemRequest request,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                ModelState.AddModelError(
                    nameof(request.Name),
                    "Der Name darf nicht leer sein.");
                return ValidationProblem(ModelState);
            }

            var item = await _requestSender.SendAsync(
                new CreateItemCommand(request.Name),
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = item.Id },
                item);
        }

        [HttpDelete("{id:guid}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Delete(
            Guid id,
            CancellationToken cancellationToken)
        {
            await _requestSender.SendAsync(
                new DeleteItemCommand(id),
                cancellationToken);

            return NoContent();
        }
    }

    public sealed record CreateItemRequest(string Name);
}
