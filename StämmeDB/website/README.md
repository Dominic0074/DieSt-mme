# website

ASP.NET-Core-Web-API mit Vue-Frontend, Clean Architecture, CQRS, Dependency
Injection und SQLite.

## Projekte

| Projekt | Verantwortung |
|---|---|
| `Frontend` | Vue-Oberfläche und Vite-Build |
| `website.Api` | Controller, HTTP-Konfiguration und Composition Root |
| `website.Application` | Anwendungsfälle, CQRS und technische Verträge |
| `website.Domain` | Fachmodelle und fachliche Regeln |
| `website.Infrastructure` | SQLite, Repositories und DI-Registrierung |

## Endpunkte

| Methode | Route | Funktion |
|---|---|---|
| `GET` | `/api/items` | Alle Einträge lesen |
| `GET` | `/api/items/{id}` | Einzelnen Eintrag lesen |
| `POST` | `/api/items` | Eintrag anlegen |
| `DELETE` | `/api/items/{id}` | Eintrag löschen |

Der Beispielablauf folgt durchgängig derselben Richtung:

```text
HTTP Request
  -> ItemsController
  -> Command oder Query
  -> Request Handler
  -> IItemRepository
  -> SqliteItemRepository
  -> SQLite
```

Controller kennen keine Entity-Framework-Typen. Repositories liefern
Domain-Modelle zurück.

## Frontend

Das Vue-Projekt liegt unter `Frontend`. Beim Bauen des API-Projekts führt das
MSBuild-Ziel `BuildFrontend` automatisch diese Schritte aus:

1. Abhängigkeiten mit `npm ci` installieren.
2. Produktionsdateien mit `npm run build` unter `Frontend/dist` erzeugen.
3. Das Ergebnis nach `website.Api/wwwroot` kopieren.

ASP.NET Core liefert `index.html` standardmäßig unter `/` aus. Für die
getrennte lokale Entwicklung kann im Frontend-Ordner `npm run dev` verwendet
werden; Vite leitet `/api` an `http://localhost:5184` weiter.

## Neues Feature ergänzen

1. Fachmodell in `Domain/Models` ergänzen.
2. Repository-Vertrag in `Application/Repositories` definieren.
3. Command unter `Application/Commands/<Feature>` oder Query unter
   `Application/Queries/<Feature>` anlegen.
4. Den zugehörigen Handler unter `Application/CommandHandlers/<Feature>` oder
   `Application/QueryHandlers/<Feature>` ergänzen.
5. Repository unter `Infrastructure/Repositories` implementieren und in
   `DependencyInjection` registrieren.
6. EF-Entity unter `Infrastructure/Database/Entities` und ihre Konfiguration
   unter `Infrastructure/Database/Configurations` ablegen.
7. Konverter zwischen Domain-Modell und Entity als `ToModel`- und
   `ToEntity`-Extensions unter `Infrastructure/Extensions` ergänzen.
8. Request- und Response-Verträge sowie Controller in `Api` ergänzen.
9. Die Oberfläche in `Frontend/src` ergänzen.

## Datenbank und Swagger

Die SQLite-Verbindung steht in `Api/appsettings.json`. Beim ersten Start wird
die Datenbank mit `EnsureCreatedAsync` erzeugt. Für produktive Anwendungen
sollten versionierte EF-Core-Migrationen verwendet werden.

In der Entwicklungsumgebung steht Swagger UI unter `/swagger` bereit. Das
OpenAPI-Dokument ist unter `/swagger/v1/swagger.json` erreichbar.

## Manuelle Prüfung

Siehe [MANUAL_TESTS.md](MANUAL_TESTS.md). Automatische Tests sind in dieser
Ausgangsvorlage bewusst nicht enthalten.
