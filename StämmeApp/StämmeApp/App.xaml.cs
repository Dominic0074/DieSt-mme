using System.Windows;
using StämmeApp.Services;
using StämmeApp.ViewModel;

namespace StämmeApp
{
    public partial class App : Application
    {
        private PlaywrightBrowserSession? browserSession;

        protected override async void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            ShutdownMode = ShutdownMode.OnExplicitShutdown;

            LoadingWindow? loadingWindow = null;
            LoadingWindowViewModel? loadingViewModel = null;
            try
            {
                var configurationService = new AppConfigurationService();
                var configuration = await configurationService.LoadAsync();
                var installer = new ChromiumInstaller();
                var mainWindowViewModel = new MainWindowViewModel(configuration, configurationService);

                if (!installer.IsInstalled)
                {
                    loadingViewModel = new LoadingWindowViewModel
                    {
                        StatusText = "Chromium wird vorbereitet..."
                    };

                    loadingWindow = new LoadingWindow
                    {
                        DataContext = loadingViewModel
                    };
                    loadingWindow.Show();

                    var progress = new Progress<ChromiumInstallProgress>(update =>
                    {
                        loadingViewModel.StatusText = update.Message;
                        loadingViewModel.ProgressValue = update.Percent;
                    });

                    await installer.EnsureInstalledAsync(progress);
                }

                if (loadingWindow is null)
                {
                    loadingViewModel = new LoadingWindowViewModel();
                    loadingWindow = new LoadingWindow
                    {
                        DataContext = loadingViewModel
                    };
                    loadingWindow.Show();
                }

                loadingViewModel!.StatusText = "Session wird geprueft...";
                loadingViewModel.ProgressValue = null;

                browserSession = await PlaywrightBrowserLauncher.LaunchAsync(
                    installer.ExecutablePath,
                    mainWindowViewModel.StartUrl);

                loadingWindow?.Close();

                if (!browserSession.IsInitialSessionValid)
                {
                    MessageBox.Show(
                        $"Keine gueltige Session fuer die Welt {configuration.World} gefunden.{Environment.NewLine}{Environment.NewLine}Aktuelle URL: {browserSession.InitialPageUrl}{Environment.NewLine}{Environment.NewLine}Bitte im geoeffneten Browser einloggen oder die Welt manuell auswaehlen. Danach kann die App mit gespeicherter Session erneut gestartet werden.",
                        "Login erforderlich",
                        MessageBoxButton.OK,
                        MessageBoxImage.Information);
                }

                var mainWindow = new MainWindow(mainWindowViewModel);
                MainWindow = mainWindow;
                ShutdownMode = ShutdownMode.OnMainWindowClose;
                mainWindow.Show();
            }
            catch (Exception ex)
            {
                loadingWindow?.Close();
                MessageBox.Show(
                    $"Chromium konnte nicht vorbereitet oder gestartet werden.{Environment.NewLine}{Environment.NewLine}{ex.Message}",
                    "Start fehlgeschlagen",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
                Shutdown(1);
            }
        }

        protected override async void OnExit(ExitEventArgs e)
        {
            if (browserSession is not null)
            {
                await browserSession.DisposeAsync();
            }

            base.OnExit(e);
        }
    }
}
