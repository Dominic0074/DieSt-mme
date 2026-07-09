using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using website.Application.AppUsers;
using website.Domain.Models.AppUsers;

namespace website.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class AuthController : ControllerBase
    {
        private readonly IAppUserAuthenticationService _authService;

        public AuthController(IAppUserAuthenticationService authService)
        {
            _authService = authService;
        }

        [HttpGet("me")]
        [ProducesResponseType<AuthSessionResponse>(StatusCodes.Status200OK)]
        public ActionResult<AuthSessionResponse> Me()
        {
            if (User.Identity?.IsAuthenticated != true)
            {
                return Ok(AuthSessionResponse.Anonymous());
            }

            return Ok(new AuthSessionResponse
            {
                IsAuthenticated = true,
                User = new AuthUserResponse
                {
                    Id = Guid.Parse(
                        User.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? Guid.Empty.ToString()),
                    Email = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty
                }
            });
        }

        [HttpPost("register")]
        [ProducesResponseType<AuthSessionResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<AuthSessionResponse>> Register(
            AuthRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _authService.RegisterAsync(
                request.Email,
                request.Password,
                cancellationToken);

            if (!result.Succeeded || result.User is null)
            {
                AddAuthError(result.ErrorCode);
                return ValidationProblem(ModelState);
            }

            await SignInAsync(result.User);

            return Ok(ToSession(result.User));
        }

        [HttpPost("login")]
        [ProducesResponseType<AuthSessionResponse>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<AuthSessionResponse>> Login(
            AuthRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _authService.LoginAsync(
                request.Email,
                request.Password,
                cancellationToken);

            if (!result.Succeeded || result.User is null)
            {
                return Unauthorized(new
                {
                    message = "E-Mail oder Passwort ist falsch."
                });
            }

            await SignInAsync(result.User);

            return Ok(ToSession(result.User));
        }

        [Authorize]
        [HttpPost("logout")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(
                CookieAuthenticationDefaults.AuthenticationScheme);

            return NoContent();
        }

        private async Task SignInAsync(AppUserModel user)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Email, user.LoginEmail),
                new(ClaimTypes.Name, user.LoginEmail)
            };
            var identity = new ClaimsIdentity(
                claims,
                CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties
                {
                    IsPersistent = true,
                    IssuedUtc = DateTimeOffset.UtcNow
                });
        }

        private void AddAuthError(string errorCode)
        {
            var message = errorCode switch
            {
                "InvalidEmail" => "Bitte gib eine gueltige E-Mail-Adresse ein.",
                "WeakPassword" =>
                    "Das Passwort muss mindestens 12 Zeichen lang sein und Grossbuchstaben, Kleinbuchstaben, Zahlen und Sonderzeichen enthalten.",
                "EmailAlreadyExists" =>
                    "Fuer diese E-Mail-Adresse existiert bereits ein Konto.",
                _ => "Die Anmeldung konnte nicht verarbeitet werden."
            };

            ModelState.AddModelError(string.Empty, message);
        }

        private static AuthSessionResponse ToSession(AppUserModel user)
        {
            return new AuthSessionResponse
            {
                IsAuthenticated = true,
                User = new AuthUserResponse
                {
                    Id = user.Id,
                    Email = user.LoginEmail
                }
            };
        }
    }

    public sealed record AuthRequest(
        string Email,
        string Password);

    public sealed class AuthSessionResponse
    {
        public bool IsAuthenticated { get; set; }

        public AuthUserResponse? User { get; set; }

        public static AuthSessionResponse Anonymous()
        {
            return new AuthSessionResponse
            {
                IsAuthenticated = false
            };
        }
    }

    public sealed class AuthUserResponse
    {
        public Guid Id { get; set; }

        public string Email { get; set; } = string.Empty;
    }
}
