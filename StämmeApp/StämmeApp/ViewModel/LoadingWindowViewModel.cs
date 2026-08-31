using StämmeApp.core;

namespace StämmeApp.ViewModel;

public sealed class LoadingWindowViewModel : BaseViewModel
{
    private string statusText = string.Empty;
    private int? progressValue;

    public string StatusText
    {
        get => statusText;
        set
        {
            if (statusText == value)
            {
                return;
            }

            statusText = value;
            OnPropertyChanged(nameof(StatusText));
        }
    }

    public int? ProgressValue
    {
        get => progressValue;
        set
        {
            if (progressValue == value)
            {
                return;
            }

            progressValue = value;
            OnPropertyChanged(nameof(ProgressValue));
            OnPropertyChanged(nameof(IsProgressIndeterminate));
        }
    }

    public bool IsProgressIndeterminate => ProgressValue is null;
}
