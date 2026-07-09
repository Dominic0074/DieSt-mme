using website.Domain.Models.AppUsers;

namespace website.Application.AppUsers
{
    public interface IAppUserAuthenticationService
    {
        Task<AuthResultModel> RegisterAsync(
            string email,
            string password,
            CancellationToken cancellationToken = default);

        Task<AuthResultModel> LoginAsync(
            string email,
            string password,
            CancellationToken cancellationToken = default);
    }
}
