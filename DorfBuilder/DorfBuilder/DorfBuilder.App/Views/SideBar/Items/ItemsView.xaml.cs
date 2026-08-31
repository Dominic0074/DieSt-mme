using System.Windows.Controls;

namespace DorfBuilder.App.Views.SideBar.Items
{
    public partial class ItemsView : UserControl
    {
        public ItemsView()
        {
            InitializeComponent();
            Loaded += async (_, _) =>
                await ((ItemsViewModel)DataContext).LoadAsync();
        }
    }

}
