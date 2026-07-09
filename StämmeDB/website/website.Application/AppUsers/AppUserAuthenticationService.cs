using System.Net.Mail;
using website.Domain.Models.AppUsers;

namespace website.Application.AppUsers
{
    public sealed class AppUserAuthenticationService
        : IAppUserAuthenticationService
    {
        private const int MinimumPasswordLength = 12;

        private readonly IAppUserRepository _repository;
        private readonly IPasswordHasher _passwordHasher;

        public AppUserAuthenticationService(
            IAppUserRepository repository,
            IPasswordHasher passwordHasher)
        {
            _repository = repository;
            _passwordHasher = passwordHasher;
        }

        public async Task<AuthResultModel> RegisterAsync(
            string email,
            string password,
            CancellationToken cancellationToken = default)
        {
            if (!TryNormalizeEmail(email, out var loginEmail, out var normalizedEmail))
            {
                return AuthResultModel.Failure("InvalidEmail");
            }

            if (!IsStrongPassword(password, loginEmail))
            {
                return AuthResultModel.Failure("WeakPassword");
            }

            var existingUser = await _repository.FindByNormalizedEmailAsync(
                normalizedEmail,
                cancellationToken);

            if (existingUser is not null)
            {
                return AuthResultModel.Failure("EmailAlreadyExists");
            }

            var passwordHash = _passwordHasher.HashPassword(password);
            var user = await _repository.AddAsync(
                loginEmail,
                normalizedEmail,
                passwordHash,
                cancellationToken);

            return AuthResultModel.Success(user);
        }

        public async Task<AuthResultModel> LoginAsync(
            string email,
            string password,
            CancellationToken cancellationToken = default)
        {
            if (!TryNormalizeEmail(email, out _, out var normalizedEmail))
            {
                return AuthResultModel.Failure("InvalidCredentials");
            }

            var user = await _repository.FindByNormalizedEmailAsync(
                normalizedEmail,
                cancellationToken);

            if (user is null
                || !_passwordHasher.VerifyPassword(password, user.PasswordHash))
            {
                return AuthResultModel.Failure("InvalidCredentials");
            }

            var loginAtUtc = DateTime.UtcNow;
            await _repository.UpdateLastLoginAsync(
                user.Id,
                loginAtUtc,
                cancellationToken);

            user.LastLoginAtUtc = loginAtUtc;

            return AuthResultModel.Success(ToModel(user));
        }

        private static bool TryNormalizeEmail(
            string email,
            out string loginEmail,
            out string normalizedEmail)
        {
            loginEmail = string.Empty;
            normalizedEmail = string.Empty;

            if (string.IsNullOrWhiteSpace(email))
            {
                return false;
            }

            try
            {
                var address = new MailAddress(email.Trim());
                loginEmail = address.Address;
                normalizedEmail = loginEmail.ToUpperInvariant();
                return true;
            }
            catch (FormatException)
            {
                return false;
            }
        }

        private static bool IsStrongPassword(string password, string email)
        {
            if (string.IsNullOrWhiteSpace(password)
                || password.Length < MinimumPasswordLength)
            {
                return false;
            }

            var hasLower = password.Any(char.IsLower);
            var hasUpper = password.Any(char.IsUpper);
            var hasDigit = password.Any(char.IsDigit);
            var hasSymbol = password.Any(character =>
                !char.IsLetterOrDigit(character));
            var localPart = email.Split('@')[0];
            var containsEmailPart = localPart.Length >= 4
                && password.Contains(
                    localPart,
                    StringComparison.OrdinalIgnoreCase);

            return hasLower
                && hasUpper
                && hasDigit
                && hasSymbol
                && !containsEmailPart;
        }

        private static AppUserModel ToModel(AppUserRecord user)
        {
            return new AppUserModel
            {
                Id = user.Id,
                LoginEmail = user.LoginEmail,
                CreatedAtUtc = user.CreatedAtUtc,
                LastLoginAtUtc = user.LastLoginAtUtc
            };
        }
    }
}
