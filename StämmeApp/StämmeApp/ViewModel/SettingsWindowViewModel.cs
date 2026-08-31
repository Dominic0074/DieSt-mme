using System.Windows.Input;
using StämmeApp.core;
using StämmeApp.Models;
using StämmeApp.Services;

namespace StämmeApp.ViewModel;

public sealed class SettingsWindowViewModel : BaseViewModel
{
    private readonly AppConfiguration configuration;
    private readonly AppConfigurationService configurationService;
    private string world;

    public SettingsWindowViewModel(AppConfiguration configuration, AppConfigurationService configurationService)
    {
        this.configuration = configuration;
        this.configurationService = configurationService;
        world = configuration.World;

        SaveCommand = new RelayCommand(async _ => await SaveAsync());
        CancelCommand = new RelayCommand(_ => RequestClose?.Invoke(this, EventArgs.Empty));
    }

    public event EventHandler? RequestClose;

    public string World
    {
        get => world;
        set
        {
            if (world == value)
            {
                return;
            }

            world = value;
            OnPropertyChanged(nameof(World));
        }
    }

    public ICommand SaveCommand { get; }

    public ICommand CancelCommand { get; }

    private async Task SaveAsync()
    {
        await configurationService.UpdateAsync(config =>
        {
            config.World = NormalizeWorld(World);
        });

        World = configuration.World;
        RequestClose?.Invoke(this, EventArgs.Empty);
    }

    private static string NormalizeWorld(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        if (int.TryParse(normalized, out _))
        {
            return "de" + normalized;
        }

        return normalized;
    }
}
