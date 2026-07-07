using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace website.E2E.Tests.BattleReports;

public sealed class BattleReportsApiE2ETests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [Fact]
    public async Task Import_Then_GetAll_ReturnsImportedBattleReport()
    {
        await using var app = new BattleReportsApiFactory();
        using var client = CreateClient(app);

        var imported = await ImportFixtureAsync(client);

        var reports = await GetReportsAsync(client, "/api/BattleReports");

        var report = Assert.Single(reports);
        Assert.Equal(imported.BattleReportId, report.Id);
        Assert.Equal(2742569, report.GameReportId);
        Assert.Equal("de256", report.World);
        Assert.Equal("AttackerWon", report.Outcome);
        Assert.Equal(19, report.LoyaltyBefore);
        Assert.Equal(-11, report.LoyaltyAfter);
        Assert.Equal(1576973896, report.Attacker.GamePlayerId);
        Assert.Equal(854, report.Attacker.GameVillageId);
        Assert.Equal(1577321598, report.Defender.GamePlayerId);
        Assert.Equal(679, report.Defender.GameVillageId);

        Assert.Contains(report.Armies, army =>
            army.Side == "Defender"
            && army.Kind == "Traveling"
            && army.SpearCount == 334
            && army.SwordCount == 325);
        Assert.Contains(report.Armies, army =>
            army.Side == "Defender"
            && army.Kind == "OtherVillage"
            && army.SourceVillage?.GameVillageId == 667
            && army.SpyCount == 20);
    }

    [Theory]
    [InlineData("/api/BattleReports?gameReportId=2742569")]
    [InlineData("/api/BattleReports?playerId=1576973896")]
    [InlineData("/api/BattleReports?playerName=Kreativ")]
    [InlineData("/api/BattleReports?villageId=667")]
    [InlineData("/api/BattleReports?villageName=jesse145")]
    public async Task GetBattleReports_WithSearchFilter_ReturnsMatchingBattleReport(
        string requestUri)
    {
        await using var app = new BattleReportsApiFactory();
        using var client = CreateClient(app);

        var imported = await ImportFixtureAsync(client);

        var reports = await GetReportsAsync(client, requestUri);

        var report = Assert.Single(reports);
        Assert.Equal(imported.BattleReportId, report.Id);
        Assert.Equal(2742569, report.GameReportId);
    }

    [Fact]
    public async Task GetBattleReports_ByInternalId_ReturnsMatchingBattleReport()
    {
        await using var app = new BattleReportsApiFactory();
        using var client = CreateClient(app);

        var imported = await ImportFixtureAsync(client);

        var reports = await GetReportsAsync(
            client,
            $"/api/BattleReports/{imported.BattleReportId}");

        var report = Assert.Single(reports);
        Assert.Equal(imported.BattleReportId, report.Id);
        Assert.Equal(2742569, report.GameReportId);
    }

    [Fact]
    public async Task GetBattleReports_WithUnknownPlayer_ReturnsEmptyList()
    {
        await using var app = new BattleReportsApiFactory();
        using var client = CreateClient(app);

        await ImportFixtureAsync(client);

        var reports = await GetReportsAsync(
            client,
            "/api/BattleReports?playerName=does-not-exist");

        Assert.Empty(reports);
    }

    private static async Task<BattleReportImportResult> ImportFixtureAsync(
        HttpClient client)
    {
        var request = await File.ReadAllTextAsync(
            Path.Combine(
                AppContext.BaseDirectory,
                "fixtures",
                "battle-reports",
                "de256-report-2742569.json"));

        using var content = new StringContent(
            request,
            Encoding.UTF8,
            "application/json");
        using var response = await client.PostAsync(
            "/api/BattleReports/import",
            content);

        Assert.True(
            response.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK,
            $"Expected 200 OK or 201 Created, got {(int)response.StatusCode} {response.StatusCode}.");

        var result = await response.Content
            .ReadFromJsonAsync<BattleReportImportResult>(JsonOptions);

        return Assert.IsType<BattleReportImportResult>(result);
    }

    private static HttpClient CreateClient(BattleReportsApiFactory app)
    {
        return app.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
    }

    private static async Task<IReadOnlyList<BattleReportResponse>> GetReportsAsync(
        HttpClient client,
        string requestUri)
    {
        using var response = await client.GetAsync(requestUri);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var reports = await response.Content
            .ReadFromJsonAsync<List<BattleReportResponse>>(JsonOptions);

        return Assert.IsType<List<BattleReportResponse>>(reports);
    }

    private sealed class BattleReportsApiFactory : WebApplicationFactory<Program>
    {
        private readonly string _databasePath = Path.Combine(
            Path.GetTempPath(),
            $"website-e2e-{Guid.NewGuid():N}.db");

        protected override void ConfigureWebHost(
            Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, configuration) =>
            {
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] =
                        $"Data Source={_databasePath}"
                });
            });
        }

        public override async ValueTask DisposeAsync()
        {
            await base.DisposeAsync();

            TryDelete(_databasePath);
            TryDelete($"{_databasePath}-shm");
            TryDelete($"{_databasePath}-wal");
        }

        private static void TryDelete(string path)
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }

    private sealed record BattleReportImportResult(
        Guid BattleReportId,
        string World,
        long GameReportId,
        bool WasCreated,
        bool AnalysisPipelineTriggered);

    private sealed record BattleReportResponse(
        Guid Id,
        string World,
        long GameReportId,
        string Subject,
        DateTime BattleTimeUtc,
        DateTime? ForwardedAtUtc,
        long? ForwardedByGamePlayerId,
        string Outcome,
        decimal? AttackerLuckPercent,
        decimal? MoralePercent,
        int? LoyaltyBefore,
        int? LoyaltyAfter,
        BattleReportParticipantResponse Attacker,
        BattleReportParticipantResponse Defender,
        IReadOnlyList<BattleReportArmyResponse> Armies);

    private sealed record BattleReportParticipantResponse(
        long? GamePlayerId,
        string PlayerName,
        long GameVillageId,
        string VillageName,
        int X,
        int Y,
        int Continent);

    private sealed record BattleReportArmyResponse(
        string Side,
        string Kind,
        BattleReportParticipantResponse? SourceVillage,
        int? SpearCount,
        int? SwordCount,
        int? SpyCount);
}
