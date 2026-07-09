using System.Security.Cryptography;
using website.Application.AppUsers;

namespace website.Infrastructure.Security
{
    internal sealed class Pbkdf2PasswordHasher : IPasswordHasher
    {
        private const string Algorithm = "pbkdf2-sha256";
        private const int SaltSize = 16;
        private const int KeySize = 32;
        private const int IterationCount = 600_000;

        public string HashPassword(string password)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(password);

            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            var key = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                IterationCount,
                HashAlgorithmName.SHA256,
                KeySize);

            return string.Join(
                '$',
                Algorithm,
                IterationCount.ToString(),
                Convert.ToBase64String(salt),
                Convert.ToBase64String(key));
        }

        public bool VerifyPassword(string password, string passwordHash)
        {
            if (string.IsNullOrWhiteSpace(password)
                || string.IsNullOrWhiteSpace(passwordHash))
            {
                return false;
            }

            var parts = passwordHash.Split('$');
            if (parts.Length != 4
                || parts[0] != Algorithm
                || !int.TryParse(parts[1], out var iterations))
            {
                return false;
            }

            try
            {
                var salt = Convert.FromBase64String(parts[2]);
                var expectedKey = Convert.FromBase64String(parts[3]);
                var actualKey = Rfc2898DeriveBytes.Pbkdf2(
                    password,
                    salt,
                    iterations,
                    HashAlgorithmName.SHA256,
                    expectedKey.Length);

                return CryptographicOperations.FixedTimeEquals(
                    actualKey,
                    expectedKey);
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}
