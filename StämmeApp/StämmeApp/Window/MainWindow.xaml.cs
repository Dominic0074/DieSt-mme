using System.Windows;
using StämmeApp.ViewModel;

namespace StämmeApp
{
    public partial class MainWindow : Window
    {
        private readonly MainWindowViewModel viewModel;

        public MainWindow(MainWindowViewModel viewModel)
        {
            this.viewModel = viewModel;
            InitializeComponent();
            DataContext = viewModel;
        }

        private void OnSettingsClick(object sender, RoutedEventArgs e)
        {
            var settingsViewModel = new SettingsWindowViewModel(
                viewModel.Configuration,
                viewModel.ConfigurationService);

            var settingsWindow = new SettingsWindow(settingsViewModel)
            {
                Owner = this
            };

            settingsWindow.ShowDialog();
            viewModel.RefreshConfiguration();
        }
    }
}
