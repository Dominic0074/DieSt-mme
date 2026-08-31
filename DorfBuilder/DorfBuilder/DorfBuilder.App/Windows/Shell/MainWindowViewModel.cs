using System.Windows;
using System.Windows.Input;
using DorfBuilder.App.Core;
using DorfBuilder.App.Services;
using DorfBuilder.App.Views.Info;
using DorfBuilder.App.Views.ItemDetails;
using DorfBuilder.App.Views.SideBar.Items;
using DorfBuilder.App.Views.Welcome;
using DorfBuilder.Application.CQRS;
using DorfBuilder.Domain.Models;

namespace DorfBuilder.App.Windows.Shell
{
    public sealed class MainWindowViewModel : ObservableObject
    {
        private object _activePage;

        public MainWindowViewModel(
            IRequestSender requestSender,
            StaemmeBrowserLauncher staemmeBrowserLauncher)
        {
            Items = new ItemsViewModel(
                requestSender,
                OpenItem,
                ShowWelcome);
            _activePage = new WelcomeViewModel();

            ShowHomeCommand = new RelayCommand(ShowWelcome);
            ShowInfoCommand = new RelayCommand(
                () => ActivePage = new InfoViewModel());
            OpenStaemmeCommand = new AsyncRelayCommand(
                async () =>
                {
                    try
                    {
                        await staemmeBrowserLauncher.OpenAsync();
                    }
                    catch (Exception exception)
                    {
                        MessageBox.Show(
                            exception.Message,
                            "Die Staemme konnte nicht geoeffnet werden",
                            MessageBoxButton.OK,
                            MessageBoxImage.Error);
                    }
                });
            ExitCommand = new RelayCommand(
                () => System.Windows.Application.Current.Shutdown());
        }

        public ItemsViewModel Items { get; }

        public object ActivePage
        {
            get => _activePage;
            private set => SetProperty(ref _activePage, value);
        }

        public ICommand ShowHomeCommand { get; }

        public ICommand ShowInfoCommand { get; }

        public ICommand OpenStaemmeCommand { get; }

        public ICommand ExitCommand { get; }

        private void OpenItem(ItemModel item)
        {
            ActivePage = new ItemDetailsViewModel(item);
        }

        private void ShowWelcome()
        {
            ActivePage = new WelcomeViewModel();
        }
    }

}
