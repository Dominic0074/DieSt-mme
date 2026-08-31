using System.IO;
using Microsoft.Playwright;

namespace StämmeApp.Services;

public static class PlaywrightBrowserLauncher
{
    public static async Task<PlaywrightBrowserSession> LaunchAsync(string chromiumExecutablePath, Uri startUrl)
    {
        if (!File.Exists(chromiumExecutablePath))
        {
            throw new FileNotFoundException("Chromium wurde nicht gefunden.", chromiumExecutablePath);
        }

        var playwright = await Playwright.CreateAsync();
        try
        {
            var userDataDirectory = Path.Combine(AppContext.BaseDirectory, "browser-profile");
            var extensionDirectories = GetExtensionDirectories();
            var args = BuildBrowserArgs(extensionDirectories);

            var context = await playwright.Chromium.LaunchPersistentContextAsync(
                userDataDirectory,
                new BrowserTypeLaunchPersistentContextOptions
                {
                    ExecutablePath = chromiumExecutablePath,
                    Headless = false,
                    Args = args,
                    ChromiumSandbox = true,
                    IgnoreDefaultArgs = ["--no-sandbox"],
                    Locale = "de-DE",
                    TimezoneId = "Europe/Berlin",
                    ViewportSize = null
                });

            var page = context.Pages.FirstOrDefault() ?? await context.NewPageAsync();
            await page.GotoAsync(
                startUrl.ToString(),
                new PageGotoOptions
                {
                    WaitUntil = WaitUntilState.DOMContentLoaded
                });

            if (!IsSessionValid(startUrl, page.Url))
            {
                await TrySelectWorldAsync(page, startUrl);
            }

            return new PlaywrightBrowserSession(playwright, context, page.Url, IsSessionValid(startUrl, page.Url));
        }
        catch
        {
            playwright.Dispose();
            throw;
        }
    }

    private static string[] BuildBrowserArgs(IReadOnlyCollection<string> extensionDirectories)
    {
        if (extensionDirectories.Count == 0)
        {
            return [];
        }

        var extensionsArgumentValue = string.Join(",", extensionDirectories);
        return
        [
            $"--disable-extensions-except={extensionsArgumentValue}",
            $"--load-extension={extensionsArgumentValue}"
        ];
    }

    private static IReadOnlyCollection<string> GetExtensionDirectories()
    {
        var extensionsRoot = Path.Combine(AppContext.BaseDirectory, "extensions");
        if (!Directory.Exists(extensionsRoot))
        {
            return [];
        }

        return Directory
            .EnumerateDirectories(extensionsRoot)
            .Where(directory => File.Exists(Path.Combine(directory, "manifest.json")))
            .ToArray();
    }

    private static bool IsSessionValid(Uri startUrl, string currentUrl)
    {
        if (!Uri.TryCreate(currentUrl, UriKind.Absolute, out var currentUri))
        {
            return false;
        }

        return string.Equals(currentUri.Host, startUrl.Host, StringComparison.OrdinalIgnoreCase)
            && string.Equals(currentUri.AbsolutePath, startUrl.AbsolutePath, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task TrySelectWorldAsync(IPage page, Uri startUrl)
    {
        var worldId = startUrl.Host.Split('.')[0];
        if (string.IsNullOrWhiteSpace(worldId))
        {
            return;
        }

        var worldSelector = $"a.world-select[href='/page/play/{worldId}']";
        var worldLink = page.Locator(worldSelector).First;

        if (await worldLink.CountAsync() == 0)
        {
            return;
        }

        var href = await worldLink.GetAttributeAsync("href");
        if (string.IsNullOrWhiteSpace(href))
        {
            return;
        }

        var targetUrl = new Uri(page.Url);
        var playUrl = new Uri(targetUrl, href);

        await page.GotoAsync(
            playUrl.ToString(),
            new PageGotoOptions
            {
                WaitUntil = WaitUntilState.DOMContentLoaded
            });

        await page.WaitForLoadStateAsync(LoadState.DOMContentLoaded);
    }
}

public sealed class PlaywrightBrowserSession : IAsyncDisposable
{
    private readonly IPlaywright playwright;
    private readonly IBrowserContext context;

    public PlaywrightBrowserSession(IPlaywright playwright, IBrowserContext context, string initialPageUrl, bool isInitialSessionValid)
    {
        this.playwright = playwright;
        this.context = context;
        InitialPageUrl = initialPageUrl;
        IsInitialSessionValid = isInitialSessionValid;
    }

    public string InitialPageUrl { get; }

    public bool IsInitialSessionValid { get; }

    public async ValueTask DisposeAsync()
    {
        await context.CloseAsync();
        playwright.Dispose();
    }
}
