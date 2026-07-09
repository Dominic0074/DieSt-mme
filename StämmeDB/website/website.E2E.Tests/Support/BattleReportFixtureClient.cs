using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace website.E2E.Tests;

internal static class BattleReportFixtureClient
{
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static async Task<BattleReportImportResult> ImportDefaultFixtureAsync(
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
}

internal sealed record BattleReportImportResult(
    Guid BattleReportId,
    string World,
    long GameReportId,
    bool WasCreated,
    bool AnalysisPipelineTriggered);
