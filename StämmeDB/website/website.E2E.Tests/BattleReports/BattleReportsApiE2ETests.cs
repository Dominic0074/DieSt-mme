using System.Net;
using System.Net.Http.Json;

namespace website.E2E.Tests.BattleReports;

public sealed class BattleReportsApiE2ETests
{
    [Fact]
    public async Task Import_Then_GetAll_ReturnsImportedBattleReport()
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        var imported = await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

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
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        var imported = await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var reports = await GetReportsAsync(client, requestUri);

        var report = Assert.Single(reports);
        Assert.Equal(imported.BattleReportId, report.Id);
        Assert.Equal(2742569, report.GameReportId);
    }

    [Fact]
    public async Task GetBattleReports_ByInternalId_ReturnsMatchingBattleReport()
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        var imported = await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

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
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var reports = await GetReportsAsync(
            client,
            "/api/BattleReports?playerName=does-not-exist");

        Assert.Empty(reports);
    }

    private static async Task<IReadOnlyList<BattleReportResponse>> GetReportsAsync(
        HttpClient client,
        string requestUri)
    {
        using var response = await client.GetAsync(requestUri);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var reports = await response.Content
            .ReadFromJsonAsync<List<BattleReportResponse>>(
                BattleReportFixtureClient.JsonOptions);

        return Assert.IsType<List<BattleReportResponse>>(reports);
    }

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
