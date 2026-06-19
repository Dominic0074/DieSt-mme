# Build

Einmalig Abhaengigkeiten installieren:

```powershell
npm install
```

Build starten:

```powershell
npm run build
```

Der Build erhoeht automatisch die Patch-Version und schreibt nach `UserScripte/dist/`.

## Sicherheitsregel

Jeder Service muss vor Aktionen abbrechen, wenn Bot-Protection aktiv ist:

```js
if (state.runtime.botProtectionTriggered) return;
```
