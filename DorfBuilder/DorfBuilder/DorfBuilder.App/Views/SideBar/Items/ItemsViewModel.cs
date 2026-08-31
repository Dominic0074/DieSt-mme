using System.Collections.ObjectModel;
using System.Windows.Input;
using DorfBuilder.App.Core;
using DorfBuilder.Application.CQRS;
using DorfBuilder.Application.Items;
using DorfBuilder.Domain.Models;

namespace DorfBuilder.App.Views.SideBar.Items
{
    public sealed class ItemsViewModel : ObservableObject
    {
        private readonly IRequestSender _requestSender;
        private readonly Action<ItemModel> _openItem;
        private readonly Action _showEmptyState;
        private ItemModel? _selectedItem;
        private string _newItemName = string.Empty;
        private bool _isLoaded;

        public ItemsViewModel(
            IRequestSender requestSender,
            Action<ItemModel> openItem,
            Action showEmptyState)
        {
            _requestSender = requestSender;
            _openItem = openItem;
            _showEmptyState = showEmptyState;
            CreateCommand = new AsyncRelayCommand(
                CreateAsync,
                () => !string.IsNullOrWhiteSpace(NewItemName));
            DeleteCommand = new AsyncRelayCommand(
                DeleteAsync,
                () => SelectedItem is not null);
        }

        public ObservableCollection<ItemModel> Items { get; } = [];

        public ItemModel? SelectedItem
        {
            get => _selectedItem;
            set
            {
                if (!SetProperty(ref _selectedItem, value))
                {
                    return;
                }

                CommandManager.InvalidateRequerySuggested();
                if (value is not null)
                {
                    _openItem(value);
                }
            }
        }

        public string NewItemName
        {
            get => _newItemName;
            set
            {
                if (SetProperty(ref _newItemName, value))
                {
                    CommandManager.InvalidateRequerySuggested();
                }
            }
        }

        public ICommand CreateCommand { get; }

        public ICommand DeleteCommand { get; }

        public async Task LoadAsync()
        {
            if (_isLoaded)
            {
                return;
            }

            var items = await _requestSender.SendAsync(new GetItemsQuery());
            Items.Clear();
            foreach (var item in items)
            {
                Items.Add(item);
            }

            _isLoaded = true;
        }

        private async Task CreateAsync()
        {
            var item = await _requestSender.SendAsync(
                new CreateItemCommand(NewItemName));
            Items.Insert(0, item);
            NewItemName = string.Empty;
            SelectedItem = item;
        }

        private async Task DeleteAsync()
        {
            var item = SelectedItem;
            if (item is null)
            {
                return;
            }

            await _requestSender.SendAsync(new DeleteItemCommand(item.Id));
            Items.Remove(item);
            SelectedItem = null;
            _showEmptyState();
        }
    }

}
