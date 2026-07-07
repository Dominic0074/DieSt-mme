using System.Reflection;
using System.Runtime.ExceptionServices;

namespace website.Application.CQRS
{
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
            ArgumentNullException.ThrowIfNull(request);

            var handlerType = typeof(IRequestHandler<>).MakeGenericType(request.GetType());
            return Invoke(handlerType, request, cancellationToken) as Task
                ?? throw CreateInvalidReturnTypeException(request.GetType());
        }

        public Task<TResponse> SendAsync<TResponse>(
            IRequest<TResponse> request,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request);

            var handlerType = typeof(IRequestHandler<,>)
                .MakeGenericType(request.GetType(), typeof(TResponse));

            return Invoke(handlerType, request, cancellationToken) as Task<TResponse>
                ?? throw CreateInvalidReturnTypeException(request.GetType());
        }

        private object? Invoke(
            Type handlerType,
            object request,
            CancellationToken cancellationToken)
        {
            var handler = _serviceProvider.GetService(handlerType)
                ?? throw CreateHandlerException(request.GetType());
            var method = handlerType.GetMethod("HandleAsync")
                ?? throw new InvalidOperationException(
                    $"Handler für {request.GetType().Name} besitzt keine HandleAsync-Methode.");

            try
            {
                return method.Invoke(handler, [request, cancellationToken]);
            }
            catch (TargetInvocationException exception)
                when (exception.InnerException is not null)
            {
                ExceptionDispatchInfo.Capture(exception.InnerException).Throw();
                throw;
            }
        }

        private static InvalidOperationException CreateHandlerException(Type requestType)
        {
            return new InvalidOperationException(
                $"Kein Handler für {requestType.Name} registriert.");
        }

        private static InvalidOperationException CreateInvalidReturnTypeException(
            Type requestType)
        {
            return new InvalidOperationException(
                $"Handler für {requestType.Name} hat keinen passenden Task zurückgegeben.");
        }
    }
}
