# Manuelle Prüfung

## Voraussetzungen

- Windows 10 oder 11
- .NET 9 SDK
- Visual Studio 2022 mit Workload `.NET-Desktopentwicklung`

## Vorlage prüfen

1. Vorlage mit `dotnet new install .\WpfCleanArchitecture.ProjectTemplate` installieren.
2. In einem leeren Zielordner ausführen:
   `dotnet new wpf-clean-architecture -n BeispielApp`.
3. Prüfen, dass Lösung und alle vier Projekte `BeispielApp` im Namen tragen.
4. `BeispielApp.sln` in Visual Studio öffnen.
5. Prüfen, dass `BeispielApp.App` als Startprojekt eingestellt ist.

## Anwendung prüfen

1. Anwendung mit `F5` starten.
2. Prüfen, dass Menüleiste, Seitenleiste und Willkommensansicht sichtbar sind.
3. In der Seitenleiste `Einträge` öffnen.
4. Einen Namen eingeben und `Hinzufügen` wählen.
5. Prüfen, dass der Eintrag in der Liste erscheint und im Hauptbereich geöffnet wird.
6. Anwendung schließen und erneut öffnen.
7. Prüfen, dass der Eintrag weiterhin vorhanden ist.
8. Eintrag markieren und `Löschen` wählen.
9. Prüfen, dass er aus der Liste verschwindet und wieder die Willkommensansicht erscheint.
10. `Info` in der Seitenleiste wählen und den Wechsel des Hauptbereichs prüfen.

## Technische Prüfpunkte

- Datenbank liegt unter `%LOCALAPPDATA%\BeispielApp\app.db`.
- UI-Projekt greift nicht direkt auf Entity-Framework-Klassen zu.
- Domain-Projekt hat keine Projekt- oder Paketabhängigkeiten.
- Application-Projekt referenziert nur Domain.
- Infrastructure referenziert Application und Domain.

