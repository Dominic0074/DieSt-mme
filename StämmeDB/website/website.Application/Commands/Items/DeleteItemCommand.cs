using website.Application.CQRS;

namespace website.Application.Commands.Items
{
    public sealed record DeleteItemCommand(Guid Id) : IRequest;
}
