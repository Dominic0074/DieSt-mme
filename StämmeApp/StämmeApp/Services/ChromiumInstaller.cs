using System.IO;
using System.IO.Compression;
using System.Net.Http;

namespace StämmeApp.Services;

public sealed class ChromiumInstaller
{
    private const string LastChangeUrl = "https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/LAST_CHANGE";

    private readonly string installDirectory;
    private readonly string executablePath;

    public ChromiumInstaller()
    {
        installDirectory = Path.Combine(AppContext.BaseDirectory, "chromium");
        executablePath = Path.Combine(installDirectory, "chrome-win", "chrome.exe");
    }

    public bool IsInstalled => File.Exists(executablePath);

    public string ExecutablePath => executablePath;

    public async Task EnsureInstalledAsync(IProgress<ChromiumInstallProgress>? progress = null)
    {
        if (IsInstalled)
        {
            return;
        }

        Directory.CreateDirectory(installDirectory);

        var tempRoot = Path.Combine(Path.GetTempPath(), "StaemmeApp-Chromium-" + Guid.NewGuid().ToString("N"));
        var zipPath = Path.Combine(tempRoot, "chromium.zip");
        var extractPath = Path.Combine(tempRoot, "extract");

        try
        {
            Directory.CreateDirectory(tempRoot);

            using var httpClient = new HttpClient();
            progress?.Report(new ChromiumInstallProgress("Chromium-Version wird ermittelt...", null));

            var revision = (await httpClient.GetStringAsync(LastChangeUrl)).Trim();
            if (string.IsNullOrWhiteSpace(revision))
            {
                throw new InvalidOperationException("Die Chromium-Version konnte nicht ermittelt werden.");
            }

            var downloadUrl = $"https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/{revision}/chrome-win.zip";
            await DownloadAsync(httpClient, downloadUrl, zipPath, progress);

            progress?.Report(new ChromiumInstallProgress("Chromium wird entpackt...", null));
            ZipFile.ExtractToDirectory(zipPath, extractPath);

            var extractedChromeDirectory = Path.Combine(extractPath, "chrome-win");
            if (!File.Exists(Path.Combine(extractedChromeDirectory, "chrome.exe")))
            {
                throw new InvalidOperationException("Das heruntergeladene Chromium-Paket enthält keine chrome.exe.");
            }

            var targetChromeDirectory = Path.Combine(installDirectory, "chrome-win");
            if (Directory.Exists(targetChromeDirectory))
            {
                Directory.Delete(targetChromeDirectory, recursive: true);
            }

            Directory.Move(extractedChromeDirectory, targetChromeDirectory);
            progress?.Report(new ChromiumInstallProgress("Chromium ist bereit.", 100));
        }
        finally
        {
            if (Directory.Exists(tempRoot))
            {
                Directory.Delete(tempRoot, recursive: true);
            }
        }
    }

    private static async Task DownloadAsync(
        HttpClient httpClient,
        string url,
        string destinationPath,
        IProgress<ChromiumInstallProgress>? progress)
    {
        progress?.Report(new ChromiumInstallProgress("Chromium wird heruntergeladen...", 0));

        using var response = await httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();

        var totalBytes = response.Content.Headers.ContentLength;
        await using var source = await response.Content.ReadAsStreamAsync();
        await using var destination = File.Create(destinationPath);

        var buffer = new byte[81920];
        long downloadedBytes = 0;
        int bytesRead;

        while ((bytesRead = await source.ReadAsync(buffer)) > 0)
        {
            await destination.WriteAsync(buffer.AsMemory(0, bytesRead));
            downloadedBytes += bytesRead;

            if (totalBytes is > 0)
            {
                var percent = (int)Math.Clamp(downloadedBytes * 100 / totalBytes.Value, 0, 100);
                progress?.Report(new ChromiumInstallProgress("Chromium wird heruntergeladen...", percent));
            }
        }
    }
}

public sealed record ChromiumInstallProgress(string Message, int? Percent);
