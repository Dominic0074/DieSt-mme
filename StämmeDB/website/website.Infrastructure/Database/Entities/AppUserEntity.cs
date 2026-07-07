namespace website.Infrastructure.Database.Entities
{
    public sealed class AppUserEntity
    {
        public Guid Id { get; set; }

        public string LoginEmail { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public DateTime CreatedAtUtc { get; set; }

        public DateTime? LastLoginAtUtc { get; set; }
    }
}
