# DorfBuilder

Neutrale WPF-Ausgangslösung mit MVVM, CQRS, Dependency Injection und SQLite.

## Projekte

| Projekt | Verantwortung |
|---|---|
| `DorfBuilder.App` | WPF-Views, ViewModels, Commands und Startkonfiguration |
| `DorfBuilder.Application` | Anwendungsfälle, CQRS und technische Verträge |
| `DorfBuilder.Domain` | Fachmodelle und fachliche Regeln |
| `DorfBuilder.Infrastructure` | SQLite, Repositories und DI-Registrierung |

## UI-Aufbau

Die Shell besteht aus drei festen Bereichen:

```text
┌───────────────────────────────────────┐
│ Menüleiste                            │
├──────────────┬────────────────────────┤
│ Seitenleiste │ aktiver Hauptbereich   │
│ Navigation   │ Welcome / Details /    │
│ Eintragsliste│ Info                   │
└──────────────┴────────────────────────┘
```

Views sind nach Features organisiert. Eine nur lokal verwendete Subview liegt
unter ihrer Parent-View. XAML-Code-Behind enthält ausschließlich UI-Initialisierung.
Fachliche Abläufe gehören in Application, technische Implementierungen nach
Infrastructure.

## Beispielablauf

Der mitgelieferte Eintrags-Workflow zeigt die komplette Richtung:

```text
ItemsView
  -> ItemsViewModel
  -> CreateItemCommand
  -> CreateItemCommandHandler
  -> IItemRepository
  -> SqliteItemRepository
  -> SQLite
```

Queries lesen Daten, Commands verändern Daten. ViewModels kennen keine
Entity-Framework-Typen und Repositories geben Domain-Modelle zurück.

## Neues Feature ergänzen

1. Fachmodell in `Domain/Models` ergänzen.
2. Repository-Vertrag in `Application/Repositories` definieren.
3. Query oder Command samt Handler in einem Application-Featureordner anlegen.
4. Repository in Infrastructure implementieren und in `DependencyInjection`
   registrieren.
5. View und ViewModel gemeinsam unter `App/Views/<Feature>` ablegen.
6. ViewModel beziehungsweise Navigation im Composition Root registrieren.

## Datenbank

Beim ersten Start wird `%LOCALAPPDATA%\DorfBuilder\app.db` erzeugt. Für eine
reale Anwendung sollte `EnsureCreatedAsync` durch versionierte EF-Core-Migrationen
ersetzt werden.

## Manuelle Prüfung

Siehe [MANUAL_TESTS.md](MANUAL_TESTS.md). Automatische Tests sind in dieser
Ausgangsvorlage bewusst nicht enthalten.

