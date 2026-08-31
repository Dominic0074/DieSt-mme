using System.Windows;
using DorfBuilder.App.Services;
using DorfBuilder.App.Windows.Shell;
using DorfBuilder.Infrastructure;
using DorfBuilder.Infrastructure.Database;
using Microsoft.Extensions.DependencyInjection;

namespace DorfBuilder.App
{
    public partial class App : System.Windows.Application
    {
        private ServiceProvider? _serviceProvider;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            var services = new ServiceCollection();
            services.AddInfrastructure();
            services.AddSingleton<StaemmeBrowserLauncher>();
            services.AddSingleton<MainWindowViewModel>();
            services.AddSingleton<MainWindow>();
            _serviceProvider = services.BuildServiceProvider();

            var initializer =
                _serviceProvider.GetRequiredService<DatabaseInitializer>();
            initializer.InitializeAsync().GetAwaiter().GetResult();

            _serviceProvider.GetRequiredService<MainWindow>().Show();
        }

        protected override void OnExit(ExitEventArgs e)
        {
            _serviceProvider?.Dispose();
            base.OnExit(e);
        }
    }
}
