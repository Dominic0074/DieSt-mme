using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using DorfBuilder.Application.CQRS;
using DorfBuilder.Application.Items;
using DorfBuilder.Application.Repositories;
using DorfBuilder.Domain.Models;
using DorfBuilder.Infrastructure.Database;

namespace DorfBuilder.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services)
    {
        var appData = Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData);
        var databaseDirectory = Path.Combine(appData, "DorfBuilder");
        Directory.CreateDirectory(databaseDirectory);
        var connectionString =
            $"Data Source={Path.Combine(databaseDirectory, "app.db")}";

        services.AddDbContextFactory<AppDbContext>(
            options => options.UseSqlite(connectionString));
        services.AddSingleton<DatabaseInitializer>();
        services.AddTransient<IItemRepository, SqliteItemRepository>();

        services.AddTransient<
            IRequestHandler<GetItemsQuery, IReadOnlyList<ItemModel>>,
            GetItemsQueryHandler>();
        services.AddTransient<
            IRequestHandler<CreateItemCommand, ItemModel>,
            CreateItemCommandHandler>();
        services.AddTransient<
            IRequestHandler<DeleteItemCommand>,
            DeleteItemCommandHandler>();
        services.AddSingleton<IRequestSender, ReflectionRequestSender>();

        return services;
    }
}
