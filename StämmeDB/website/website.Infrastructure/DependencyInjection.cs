using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using website.Application.BattleReports;
using website.Application.CommandHandlers.BattleReports;
using website.Application.CommandHandlers.Items;
using website.Application.Commands.BattleReports;
using website.Application.Commands.Items;
using website.Application.CQRS;
using website.Application.Queries.BattleReports;
using website.Application.Queries.Items;
using website.Application.QueryHandlers.BattleReports;
using website.Application.QueryHandlers.Items;
using website.Application.Repositories;
using website.Domain.Models;
using website.Domain.Models.BattleReports;
using website.Infrastructure.Database;
using website.Infrastructure.Repositories;

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
            services.AddTransient<IItemRepository, SqliteItemRepository>();
            services.AddTransient<
                IBattleReportImportRepository,
                SqliteBattleReportImportRepository>();
            services.AddTransient<
                IBattleReportReadRepository,
                SqliteBattleReportReadRepository>();
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
