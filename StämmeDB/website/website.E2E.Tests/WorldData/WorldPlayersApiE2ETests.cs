using System.Net;
using System.Net.Http.Json;

namespace website.E2E.Tests.WorldData;

public sealed class WorldPlayersApiE2ETests
{
    [Fact]
    public async Task GetWorldPlayers_AfterBattleReportImport_ReturnsAllPlayers()
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var players = await GetPlayersAsync(client, "/api/WorldPlayers");

        Assert.Collection(
            players.OrderBy(player => player.GamePlayerId),
            player =>
            {
                Assert.Equal("de256", player.World);
                Assert.Equal(1576973896, player.GamePlayerId);
                Assert.Equal("Kreativ?", player.Name);
                Assert.Equal(new DateTime(2026, 7, 6, 18, 0, 0, DateTimeKind.Utc), player.FirstSeenInReportAtUtc);
                Assert.Equal(player.FirstSeenInReportAtUtc, player.LastSeenInReportAtUtc);
            },
            player =>
            {
                Assert.Equal("de256", player.World);
                Assert.Equal(1577321598, player.GamePlayerId);
                Assert.Equal("Weltxxx", player.Name);
            });
    }

    [Theory]
    [InlineData("/api/WorldPlayers?world=de256", 2)]
    [InlineData("/api/WorldPlayers?gamePlayerId=1576973896", 1)]
    [InlineData("/api/WorldPlayers?name=Kreativ", 1)]
    [InlineData("/api/WorldPlayers?name=Welt", 1)]
    [InlineData("/api/WorldPlayers?world=de256&name=Kreativ", 1)]
    public async Task GetWorldPlayers_WithSearchFilter_ReturnsMatchingPlayers(
        string requestUri,
        int expectedCount)
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var players = await GetPlayersAsync(client, requestUri);

        Assert.Equal(expectedCount, players.Count);
    }

    [Fact]
    public async Task GetWorldPlayers_WithUnknownName_ReturnsEmptyList()
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var players = await GetPlayersAsync(
            client,
            "/api/WorldPlayers?name=does-not-exist");

        Assert.Empty(players);
    }

    [Fact]
    public async Task GetWorldPlayers_ByExternalVillagePlayer_DoesNotReturnVillageOnlySource()
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var players = await GetPlayersAsync(
            client,
            "/api/WorldPlayers?gamePlayerId=1577223660");

        Assert.Empty(players);
    }

    private static async Task<IReadOnlyList<WorldPlayerResponse>> GetPlayersAsync(
        HttpClient client,
        string requestUri)
    {
        using var response = await client.GetAsync(requestUri);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var players = await response.Content
            .ReadFromJsonAsync<List<WorldPlayerResponse>>(
                BattleReportFixtureClient.JsonOptions);

        return Assert.IsType<List<WorldPlayerResponse>>(players);
    }

    private sealed record WorldPlayerResponse(
        Guid Id,
        string World,
        long GamePlayerId,
        string Name,
        long? GameAllyId,
        int? VillageCount,
        int? Points,
        int? Rank,
        DateTime? ApiUpdatedAtUtc,
        DateTime? FirstSeenInReportAtUtc,
        DateTime? LastSeenInReportAtUtc);
}
