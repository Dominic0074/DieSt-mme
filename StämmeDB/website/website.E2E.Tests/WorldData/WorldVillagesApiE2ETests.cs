using System.Net;
using System.Net.Http.Json;

namespace website.E2E.Tests.WorldData;

public sealed class WorldVillagesApiE2ETests
{
    [Fact]
    public async Task GetWorldVillages_AfterBattleReportImport_ReturnsReportVillages()
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var villages = await GetVillagesAsync(client, "/api/WorldVillages");

        Assert.Collection(
            villages.OrderBy(village => village.GameVillageId),
            village =>
            {
                Assert.Equal(667, village.GameVillageId);
                Assert.Equal("jesse145's Dorf", village.Name);
                Assert.Equal(475, village.X);
                Assert.Equal(502, village.Y);
                Assert.Equal(54, village.Continent);
                Assert.Equal(1577223660, village.GamePlayerId);
            },
            village =>
            {
                Assert.Equal(679, village.GameVillageId);
                Assert.Equal("KreaTIEF", village.Name);
                Assert.Equal(483, village.X);
                Assert.Equal(509, village.Y);
                Assert.Equal(1577321598, village.GamePlayerId);
            },
            village =>
            {
                Assert.Equal(854, village.GameVillageId);
                Assert.Equal("KreaTIEF", village.Name);
                Assert.Equal(482, village.X);
                Assert.Equal(510, village.Y);
                Assert.Equal(1576973896, village.GamePlayerId);
            });
    }

    [Theory]
    [InlineData("/api/WorldVillages?world=de256", 3)]
    [InlineData("/api/WorldVillages?gameVillageId=667", 1)]
    [InlineData("/api/WorldVillages?name=KreaTIEF", 2)]
    [InlineData("/api/WorldVillages?name=jesse145", 1)]
    [InlineData("/api/WorldVillages?x=475&y=502", 1)]
    [InlineData("/api/WorldVillages?continent=54", 3)]
    [InlineData("/api/WorldVillages?gamePlayerId=1576973896", 1)]
    [InlineData("/api/WorldVillages?world=de256&name=KreaTIEF&continent=54", 2)]
    public async Task GetWorldVillages_WithSearchFilter_ReturnsMatchingVillages(
        string requestUri,
        int expectedCount)
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var villages = await GetVillagesAsync(client, requestUri);

        Assert.Equal(expectedCount, villages.Count);
    }

    [Fact]
    public async Task GetWorldVillages_WithUnknownName_ReturnsEmptyList()
    {
        await using var app = new TestBattleReportsApiFactory();
        using var client = app.CreateHttpsClient();

        await BattleReportFixtureClient.ImportDefaultFixtureAsync(client);

        var villages = await GetVillagesAsync(
            client,
            "/api/WorldVillages?name=does-not-exist");

        Assert.Empty(villages);
    }

    private static async Task<IReadOnlyList<WorldVillageResponse>> GetVillagesAsync(
        HttpClient client,
        string requestUri)
    {
        using var response = await client.GetAsync(requestUri);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var villages = await response.Content
            .ReadFromJsonAsync<List<WorldVillageResponse>>(
                BattleReportFixtureClient.JsonOptions);

        return Assert.IsType<List<WorldVillageResponse>>(villages);
    }

    private sealed record WorldVillageResponse(
        Guid Id,
        string World,
        long GameVillageId,
        string Name,
        int X,
        int Y,
        int Continent,
        long? GamePlayerId,
        int? Points,
        DateTime? ApiUpdatedAtUtc,
        DateTime? FirstSeenInReportAtUtc,
        DateTime? LastSeenInReportAtUtc);
}
