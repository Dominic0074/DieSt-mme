namespace website.Infrastructure.Database.Entities
{
    public sealed class ItemEntity
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}
