namespace website.Domain.Models.AppUsers
{
    public sealed class AuthResultModel
    {
        public bool Succeeded { get; set; }

        public string ErrorCode { get; set; } = string.Empty;

        public AppUserModel? User { get; set; }

        public static AuthResultModel Success(AppUserModel user)
        {
            return new AuthResultModel
            {
                Succeeded = true,
                User = user
            };
        }

        public static AuthResultModel Failure(string errorCode)
        {
            return new AuthResultModel
            {
                Succeeded = false,
                ErrorCode = errorCode
            };
        }
    }
}
