using DorfBuilder.Domain.Models;

namespace DorfBuilder.App.Views.ItemDetails
{
    public sealed class ItemDetailsViewModel
    {
        public ItemDetailsViewModel(ItemModel item)
        {
            Item = item;
        }

        public ItemModel Item { get; }

        public string CreatedText =>
            $"Erstellt am {Item.CreatedAt.ToLocalTime():dd.MM.yyyy HH:mm}";
    }

}
