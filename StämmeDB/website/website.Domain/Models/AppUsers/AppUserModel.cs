namespace website.Domain.Models.AppUsers
{
    public sealed class AppUserModel
    {
        public Guid Id { get; set; }

        public string LoginEmail { get; set; } = string.Empty;

        public DateTime CreatedAtUtc { get; set; }

        public DateTime? LastLoginAtUtc { get; set; }
    }
}
