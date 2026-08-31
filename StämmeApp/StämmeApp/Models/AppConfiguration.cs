using System.Text.Json.Serialization;

namespace StämmeApp.Models;

public sealed class AppConfiguration
{
    public string World { get; set; } = "de256";

    [JsonIgnore]
    public Uri WorldUrl => new($"https://{World}.die-staemme.de/game.php");
}
