using System.Windows;

namespace DorfBuilder.App.Windows.Shell
{
    public partial class MainWindow : Window
    {
        public MainWindow(MainWindowViewModel viewModel)
        {
            InitializeComponent();
            DataContext = viewModel;
        }
    }

}
