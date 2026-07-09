using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using website.Application.AppUsers;
using website.Application.BattleReports;
using website.Application.CommandHandlers.BattleReports;
using website.Application.CommandHandlers.Items;
using website.Application.Commands.BattleReports;
using website.Application.Commands.Items;
using website.Application.CQRS;
using website.Application.Queries.BattleReports;
using website.Application.Queries.Items;
using website.Application.Queries.WorldPlayers;
using website.Application.Queries.WorldVillages;
using website.Application.QueryHandlers.BattleReports;
using website.Application.QueryHandlers.Items;
using website.Application.QueryHandlers.WorldPlayers;
using website.Application.QueryHandlers.WorldVillages;
using website.Application.Repositories;
using website.Application.WorldPlayers;
using website.Application.WorldVillages;
using website.Domain.Models;
using website.Domain.Models.BattleReports;
using website.Domain.Models.WorldPlayers;
using website.Domain.Models.WorldVillages;
using website.Infrastructure.Database;
using website.Infrastructure.Repositories;
using website.Infrastructure.Security;

namespace website.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            string connectionString)
        {
            services.AddDbContextFactory<AppDbContext>(
                options => options.UseSqlite(connectionString));
            services.AddSingleton<DatabaseInitializer>();
            services.AddScoped<IPasswordHasher, Pbkdf2PasswordHasher>();
            services.AddScoped<
                IAppUserAuthenticationService,
                AppUserAuthenticationService>();
            services.AddTransient<IAppUserRepository, SqliteAppUserRepository>();
            services.AddTransient<IItemRepository, SqliteItemRepository>();
            services.AddTransient<
                IBattleReportImportRepository,
                SqliteBattleReportImportRepository>();
            services.AddTransient<
                IBattleReportReadRepository,
                SqliteBattleReportReadRepository>();
            services.AddTransient<
                IWorldPlayerReadRepository,
                SqliteWorldPlayerReadRepository>();
            services.AddTransient<
                IWorldVillageReadRepository,
                SqliteWorldVillageReadRepository>();
            services.AddTransient<
                IBattleReportAnalysisPipeline,
                NoOpBattleReportAnalysisPipeline>();

            services.AddTransient<
                IRequestHandler<
                    ImportBattleReportCommand,
                    BattleReportImportResultModel>,
                ImportBattleReportCommandHandler>();
            services.AddTransient<
                IRequestHandler<
                    GetBattleReportsQuery,
                    IReadOnlyList<BattleReportModel>>,
                GetBattleReportsQueryHandler>();
            services.AddTransient<
                IRequestHandler<
                    GetWorldPlayersQuery,
                    IReadOnlyList<WorldPlayerModel>>,
                GetWorldPlayersQueryHandler>();
            services.AddTransient<
                IRequestHandler<
                    GetWorldVillagesQuery,
                    IReadOnlyList<WorldVillageModel>>,
                GetWorldVillagesQueryHandler>();
            services.AddTransient<
                IRequestHandler<GetItemsQuery, IReadOnlyList<ItemModel>>,
                GetItemsQueryHandler>();
            services.AddTransient<
                IRequestHandler<GetItemByIdQuery, ItemModel?>,
                GetItemByIdQueryHandler>();
            services.AddTransient<
                IRequestHandler<CreateItemCommand, ItemModel>,
                CreateItemCommandHandler>();
            services.AddTransient<
                IRequestHandler<DeleteItemCommand>,
                DeleteItemCommandHandler>();
            services.AddScoped<IRequestSender, ReflectionRequestSender>();

            return services;
        }
    }
}
