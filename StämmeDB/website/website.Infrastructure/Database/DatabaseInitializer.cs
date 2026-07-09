using Microsoft.EntityFrameworkCore;
using System.Data.Common;

namespace website.Infrastructure.Database
{
    public sealed class DatabaseInitializer
    {
        private readonly IDbContextFactory<AppDbContext> _contextFactory;

        public DatabaseInitializer(IDbContextFactory<AppDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task InitializeAsync(
            CancellationToken cancellationToken = default)
        {
            await using var context =
                await _contextFactory.CreateDbContextAsync(cancellationToken);
            await context.Database.EnsureCreatedAsync(cancellationToken);
            await EnsureAppUsersSchemaAsync(context, cancellationToken);
        }

        private static async Task EnsureAppUsersSchemaAsync(
            AppDbContext context,
            CancellationToken cancellationToken)
        {
            var connection = context.Database.GetDbConnection();
            await OpenConnectionAsync(connection, cancellationToken);

            if (!await TableExistsAsync(connection, "AppUsers", cancellationToken))
            {
                return;
            }

            if (!await ColumnExistsAsync(
                    connection,
                    "AppUsers",
                    "NormalizedEmail",
                    cancellationToken))
            {
                await context.Database.ExecuteSqlRawAsync(
                    "ALTER TABLE \"AppUsers\" ADD COLUMN \"NormalizedEmail\" TEXT NOT NULL DEFAULT '';",
                    cancellationToken);
                await context.Database.ExecuteSqlRawAsync(
                    "UPDATE \"AppUsers\" SET \"NormalizedEmail\" = UPPER(\"LoginEmail\") WHERE \"NormalizedEmail\" = '';",
                    cancellationToken);
            }

            await context.Database.ExecuteSqlRawAsync(
                "CREATE UNIQUE INDEX IF NOT EXISTS \"IX_AppUsers_NormalizedEmail\" ON \"AppUsers\" (\"NormalizedEmail\");",
                cancellationToken);
        }

        private static async Task OpenConnectionAsync(
            DbConnection connection,
            CancellationToken cancellationToken)
        {
            if (connection.State != System.Data.ConnectionState.Open)
            {
                await connection.OpenAsync(cancellationToken);
            }
        }

        private static async Task<bool> TableExistsAsync(
            DbConnection connection,
            string tableName,
            CancellationToken cancellationToken)
        {
            await using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT COUNT(*) FROM \"sqlite_master\" WHERE \"type\" = 'table' AND \"name\" = $tableName;";

            var parameter = command.CreateParameter();
            parameter.ParameterName = "$tableName";
            parameter.Value = tableName;
            command.Parameters.Add(parameter);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt32(result) > 0;
        }

        private static async Task<bool> ColumnExistsAsync(
            DbConnection connection,
            string tableName,
            string columnName,
            CancellationToken cancellationToken)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA table_info(\"{tableName}\");";

            await using var reader = await command.ExecuteReaderAsync(
                cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                if (string.Equals(
                        reader.GetString(1),
                        columnName,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
