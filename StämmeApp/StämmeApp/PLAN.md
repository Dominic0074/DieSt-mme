# StämmeApp Queue- und Workflow-Plan

## Ziel

Die App soll Events aus verschiedenen Importern in eine zentrale Event-Queue legen. Jedes Event wird später durch einen passenden Workflow abgearbeitet. Workflows bedienen die Website über Playwright und können bei Bedarf parallel laufen.

## Browser-Strategie

Playwright kann mehrere Pages parallel steuern. Wichtig ist dabei:

- Ein Workflow besitzt exklusiv seine eigene `IPage`.
- Mehrere Workflows dürfen parallel laufen, solange sie nicht dieselbe `IPage` verwenden.
- Für gemeinsame Login-Sessions bietet sich ein persistenter BrowserContext an.
- Für stärkere Isolation kann pro Workflow ein eigener BrowserContext verwendet werden.

Empfehlung für den Start:

- Ein sichtbarer Chromium-Prozess.
- Ein persistenter BrowserContext mit Profilordner `browser-profile`.
- Pro Queue-Event eine neue Page.
- Nach Abschluss des Workflows wird die Page geschlossen.

Wenn sich parallele Aktionen gegenseitig beeinflussen oder Sessions getrennt sein müssen, später auf eigene BrowserContexts pro Workflow erweitern.

## Login- und Session-Pruefung

Basis-URL fuer die Zielwelt:

```text
https://de256.die-staemme.de/game.php
```

Aktuelle Pruefung ohne eingeloggte Session:

```text
https://de256.die-staemme.de/game.php
-> 302 https://www.die-staemme.de/page/session-expired
-> 302 https://www.die-staemme.de/
-> 200 Startseite
```

Ergebnis:

- Direkter Weltaufruf ohne gueltige Session funktioniert nicht.
- Die App muss zuerst eine gueltige Login-Session im persistenten Browserprofil herstellen.
- Danach koennen Workflows direkt mit Welt-URLs wie `game.php?...` arbeiten.
- Der persistente Profilordner `browser-profile` ist deshalb wichtig, damit der User nicht bei jedem Start neu einloggen muss.

Empfohlener Startablauf:

```text
1. Chromium/Playwright starten.
2. https://de256.die-staemme.de/game.php aufrufen.
3. Wenn Redirect auf session-expired oder Startseite erfolgt: Login-Fenster anzeigen bzw. User manuell einloggen lassen.
4. Nach erfolgreichem Login Session im persistenten Profil behalten.
5. Erst danach Queue-Workflows starten.
```

## Event-Modell

Der Payload soll als JSON gespeichert werden, damit verschiedene Importer unterschiedliche Datenstrukturen liefern können.

```csharp
public sealed class QueueEvent
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; init; } = string.Empty;
    public DateTimeOffset ExecuteAt { get; init; }
    public TimeSpan PreparationLeadTime { get; init; } = TimeSpan.FromSeconds(60);
    public WorkflowType WorkflowType { get; init; }
    public QueueEventStatus Status { get; set; } = QueueEventStatus.Pending;
    public string PayloadJson { get; init; } = "{}";
}
```

Beispiel-Payload:

```json
{
  "sourceVillageId": "12345",
  "targetVillageId": "67890",
  "unitCounts": {
    "spear": 100,
    "sword": 50,
    "axe": 200
  },
  "arrivalTime": "2026-08-12T21:30:00+02:00"
}
```

Workflow-spezifische Payloads werden im jeweiligen Workflow in ein typisiertes DTO deserialisiert.

```csharp
var payload = JsonSerializer.Deserialize<AttackPayload>(queueEvent.PayloadJson);
```

## Projektstruktur

Geplante Struktur:

```text
StämmeApp
├── Models
│   ├── QueueEvent.cs
│   ├── QueueEventStatus.cs
│   └── WorkflowType.cs
├── Services
│   ├── EventQueueService.cs
│   ├── PlaywrightBrowserService.cs
│   └── SystemClock.cs
├── Workflows
│   ├── IWorkflow.cs
│   ├── WorkflowRunner.cs
│   └── AttackWorkflow.cs
├── Window
│   ├── MainWindow.xaml
│   └── Importer-Popups
├── ViewModel
│   ├── MainWindowViewModel.cs
│   ├── QueueEventViewModel.cs
│   └── Importer-ViewModels
└── core
    ├── BaseViewModel.cs
    └── RelayCommand.cs
```

## Scheduler-Konzept

Der `EventQueueService` verwaltet alle Events:

- Events aufnehmen.
- Nach `ExecuteAt` sortieren.
- Vorbereitung rechtzeitig starten: `ExecuteAt - PreparationLeadTime`.
- Maximal erlaubte Parallelität begrenzen, z. B. mit `SemaphoreSlim`.
- Status aktualisieren.
- Fehler speichern.
- Cancellation unterstützen.

Statuswerte:

```csharp
public enum QueueEventStatus
{
    Pending,
    Preparing,
    Running,
    Completed,
    Failed,
    Cancelled
}
```

## Workflow-Konzept

Jeder Workflow verarbeitet genau ein Queue-Event.

```csharp
public interface IWorkflow
{
    WorkflowType Type { get; }
    Task ExecuteAsync(QueueEvent queueEvent, WorkflowContext context, CancellationToken cancellationToken);
}
```

Der Workflow:

- öffnet eine neue Playwright-Page,
- deserialisiert `PayloadJson`,
- navigiert zur passenden Seite,
- bereitet Eingaben vor,
- wartet bei getimten Aktionen bis zum Zielzeitpunkt,
- führt die finale Aktion aus,
- schließt die Page.

## Timing-Prinzip

Für zeitkritische Aktionen nicht erst zur Zielzeit starten.

Besser:

```text
T - 60s: Page öffnen
T - 30s: Navigation und Formular vorbereiten
T - 2s: finale Prüfung
T: finalen Button klicken
```

Die genaue Vorbereitungszeit wird pro Event über `PreparationLeadTime` steuerbar.

## Umsetzungsschritte

1. Models anlegen: `QueueEvent`, `QueueEventStatus`, `WorkflowType`.
2. `EventQueueService` mit Observable Queue und Statusupdates bauen.
3. Queue im `MainWindow` anzeigen.
4. Einen Dummy-Importer bauen, der Events mit `PayloadJson` erzeugt.
5. Einen Dummy-Workflow bauen, der nur Statuswechsel simuliert.
6. PlaywrightBrowserService aus dem aktuellen Launcher ableiten.
7. Echten ersten Workflow implementieren.
8. Parallelität und Timing mit mehreren Dummy-Events prüfen.
