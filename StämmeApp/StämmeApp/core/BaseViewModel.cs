using System.ComponentModel;
using System.Linq.Expressions;

namespace StämmeApp.core;

public abstract class BaseViewModel : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;

    public virtual void OnPropertyChanged(string propertyName)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    protected virtual void OnPropertyChanged<T>(Expression<Func<T>> propertyExpression)
    {
        var propertyName = GetPropertyName(propertyExpression);
        OnPropertyChanged(propertyName);
    }

    protected virtual void OnCultureChanged()
    {
    }

    private static string GetPropertyName<T>(Expression<Func<T>> propertyExpression)
    {
        if (propertyExpression.Body is MemberExpression memberExpression)
        {
            return memberExpression.Member.Name;
        }

        throw new ArgumentException("Expression is not a member access expression.", nameof(propertyExpression));
    }
}
