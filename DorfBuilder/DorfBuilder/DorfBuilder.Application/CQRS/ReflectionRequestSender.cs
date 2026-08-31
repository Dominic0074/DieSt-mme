namespace DorfBuilder.Application.CQRS;

public sealed class ReflectionRequestSender : IRequestSender
{
    private readonly IServiceProvider _serviceProvider;

    public ReflectionRequestSender(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public Task SendAsync<TRequest>(
        TRequest request,
        CancellationToken cancellationToken = default)
        where TRequest : IRequest
    {
        var handlerType = typeof(IRequestHandler<>).MakeGenericType(request.GetType());
        return Invoke(handlerType, request, cancellationToken) as Task
            ?? throw CreateHandlerException(request.GetType());
    }

    public Task<TResponse> SendAsync<TResponse>(
        IRequest<TResponse> request,
        CancellationToken cancellationToken = default)
    {
        var handlerType = typeof(IRequestHandler<,>)
            .MakeGenericType(request.GetType(), typeof(TResponse));

        return Invoke(handlerType, request, cancellationToken) as Task<TResponse>
            ?? throw CreateHandlerException(request.GetType());
    }

    private object? Invoke(
        Type handlerType,
        object request,
        CancellationToken cancellationToken)
    {
        var handler = _serviceProvider.GetService(handlerType)
            ?? throw CreateHandlerException(request.GetType());
        var method = handlerType.GetMethod("HandleAsync")
            ?? throw CreateHandlerException(request.GetType());

        return method.Invoke(handler, [request, cancellationToken]);
    }

    private static InvalidOperationException CreateHandlerException(Type requestType)
    {
        return new InvalidOperationException(
            $"Kein Handler für {requestType.Name} registriert.");
    }
}

