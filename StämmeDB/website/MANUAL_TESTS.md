# Manuelle Prüfung

## Voraussetzungen

- .NET 9 SDK
- Node.js 20.19 oder neuer mit npm
- Visual Studio 2022 mit Workload `ASP.NET und Webentwicklung`
- PowerShell

## Vorlage prüfen

Im Ordner `API Vorlage`:

```powershell
dotnet new install .\AspNetApiCleanArchitecture.ProjectTemplate
dotnet new api-clean-architecture -n BeispielApi -o C:\Temp\BeispielApi
```

Danach prüfen:

1. `BeispielApi.sln` und alle vier .NET-Projekte tragen `BeispielApi` im Namen.
2. `BeispielApi.Api` ist das Startprojekt.
3. Der Ordner `Frontend` enthält das Vue-/Vite-Projekt.
4. Application referenziert nur Domain.
5. Infrastructure referenziert Application und Domain.
6. Domain hat keine Projekt- oder Paketabhängigkeiten.
7. Commands, Queries, CommandHandlers und QueryHandlers liegen in getrennten
   Application-Ordnern.
8. Beim Erstellen über Visual Studio zeigt der Projektmappen-Explorer alle vier
   .NET-Projekte an.

## API prüfen

Die erzeugte Lösung in Visual Studio öffnen und mit `F5` starten. Alternativ im
Ordner des API-Projekts selbst `dotnet run` ausführen.

Die tatsächliche HTTP-Adresse aus der Konsolenausgabe verwenden:

```powershell
$baseUrl = "http://localhost:5184"
```

1. `$baseUrl` im Browser öffnen und prüfen, dass die Vue-Oberfläche erscheint.

2. Prüfen, dass diese Dateien nach dem API-Build vorhanden sind:

   - `BeispielApi.Api/wwwroot/index.html`
   - mindestens eine JavaScript-Datei unter `BeispielApi.Api/wwwroot/assets`

3. Über die Vue-Oberfläche einen Eintrag anlegen, die Seite neu laden und den
   Eintrag wieder löschen.

4. Leere Liste abrufen:

   ```powershell
   Invoke-RestMethod "$baseUrl/api/items"
   ```

5. Eintrag anlegen und Antwort merken:

   ```powershell
   $item = Invoke-RestMethod "$baseUrl/api/items" `
     -Method Post `
     -ContentType "application/json" `
     -Body '{"name":"Testeintrag"}'
   ```

6. Den Eintrag einzeln abrufen:

   ```powershell
   Invoke-RestMethod "$baseUrl/api/items/$($item.id)"
   ```

7. API neu starten und prüfen, dass der Eintrag weiterhin in der Liste steht.

8. Eintrag löschen:

   ```powershell
   Invoke-RestMethod "$baseUrl/api/items/$($item.id)" -Method Delete
   ```

9. Erneuter Einzelabruf muss HTTP-Status `404` liefern.
10. `POST` mit leerem Namen muss HTTP-Status `400` liefern.
11. In Development muss Swagger UI unter `$baseUrl/swagger` erreichbar sein.
12. Das OpenAPI-Dokument muss unter
    `$baseUrl/swagger/v1/swagger.json` erreichbar sein.

## Technische Prüfpunkte

- `app.db` wird im Arbeitsverzeichnis des gestarteten API-Projekts angelegt.
- Controller greifen nicht direkt auf Entity-Framework-Klassen zu.
- HTTP-Abbruch wird über `CancellationToken` bis zum Repository weitergegeben.
- `POST` antwortet mit `201 Created` und einem gültigen `Location`-Header.
- `IRequestSender` ist in der API als Scoped-Service registriert.
- Repository-Implementierungen liegen unter `Infrastructure/Repositories`.
- EF-Entities und ihre Konfigurationen liegen getrennt unter
  `Infrastructure/Database/Entities` und
  `Infrastructure/Database/Configurations`.
- `Infrastructure/Extensions` enthält getrennte `ToModel`- und
  `ToEntity`-Konverter.
- Das Frontend wird durch den API-Build automatisch neu erzeugt.
- `/` liefert das Vue-Frontend und `/api/items` weiterhin JSON aus.
