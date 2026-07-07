namespace website.Application.CQRS
{
    public interface IRequestSender
    {
        Task SendAsync<TRequest>(
            TRequest request,
            CancellationToken cancellationToken = default)
            where TRequest : IRequest;

        Task<TResponse> SendAsync<TResponse>(
            IRequest<TResponse> request,
            CancellationToken cancellationToken = default);
    }

}
