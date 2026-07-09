using website.Domain.Models.AppUsers;

namespace website.Application.AppUsers
{
    public interface IAppUserRepository
    {
        Task<AppUserRecord?> FindByNormalizedEmailAsync(
            string normalizedEmail,
            CancellationToken cancellationToken = default);

        Task<AppUserModel> AddAsync(
            string loginEmail,
            string normalizedEmail,
            string passwordHash,
            CancellationToken cancellationToken = default);

        Task UpdateLastLoginAsync(
            Guid userId,
            DateTime loginAtUtc,
            CancellationToken cancellationToken = default);
    }

    public sealed class AppUserRecord
    {
        public Guid Id { get; set; }

        public string LoginEmail { get; set; } = string.Empty;

        public string NormalizedEmail { get; set; } = string.Empty;

        public string PasswordHash { get; set; } = string.Empty;

        public DateTime CreatedAtUtc { get; set; }

        public DateTime? LastLoginAtUtc { get; set; }
    }
}
