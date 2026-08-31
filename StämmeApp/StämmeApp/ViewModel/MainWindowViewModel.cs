using StämmeApp.core;
using StämmeApp.Models;
using StämmeApp.Services;

namespace StämmeApp.ViewModel;

public sealed class MainWindowViewModel : BaseViewModel
{
    public MainWindowViewModel(AppConfiguration configuration, AppConfigurationService configurationService)
    {
        Configuration = configuration;
        ConfigurationService = configurationService;
    }

    public AppConfiguration Configuration { get; }

    public AppConfigurationService ConfigurationService { get; }

    public Uri StartUrl => Configuration.WorldUrl;

    public void RefreshConfiguration()
    {
        OnPropertyChanged(nameof(Configuration));
        OnPropertyChanged(nameof(StartUrl));
    }
}
