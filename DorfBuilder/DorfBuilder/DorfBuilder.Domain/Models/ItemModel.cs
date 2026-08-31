namespace DorfBuilder.Domain.Models;

public sealed record ItemModel(
    Guid Id,
    string Name,
    DateTime CreatedAt);

