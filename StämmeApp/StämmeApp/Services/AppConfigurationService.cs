using System.IO;
using System.Text.Json;
using StämmeApp.Models;

namespace StämmeApp.Services;

public sealed class AppConfigurationService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    private readonly string configurationPath;

    public AppConfigurationService()
    {
        configurationPath = Path.Combine(AppContext.BaseDirectory, "config.json");
    }

    public AppConfiguration Current { get; private set; } = new();

    public async Task<AppConfiguration> LoadAsync()
    {
        if (!File.Exists(configurationPath))
        {
            Current = new AppConfiguration();
            await SaveAsync();
            return Current;
        }

        await using var stream = File.OpenRead(configurationPath);
        Current = await JsonSerializer.DeserializeAsync<AppConfiguration>(stream, JsonOptions)
            ?? new AppConfiguration();

        EnsureDefaults();
        await SaveAsync();

        return Current;
    }

    public async Task UpdateAsync(Action<AppConfiguration> updateConfiguration)
    {
        updateConfiguration(Current);
        EnsureDefaults();
        await SaveAsync();
    }

    private async Task SaveAsync()
    {
        var directory = Path.GetDirectoryName(configurationPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(configurationPath);
        await JsonSerializer.SerializeAsync(stream, Current, JsonOptions);
    }

    private void EnsureDefaults()
    {
        if (string.IsNullOrWhiteSpace(Current.World))
        {
            Current.World = new AppConfiguration().World;
        }
    }
}
