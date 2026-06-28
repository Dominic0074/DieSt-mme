# Retime Save

Das Script fuellt das erste Unterstuetzungsformular vorab aus. Zum konfigurierten
Zeitpunkt wird der erste Screen abgeschickt und der zweite Screen nach dem Laden
sofort bestaetigt.

## Konfiguration

Alle Einsatzwerte stehen in `src/config/config.js`.

## Build

Im Projektstamm:

```powershell
npm run build:retime-save
```

Alternativ in diesem Ordner:

```powershell
npm run build
```

Das fertige Tampermonkey-Script wird als `dist/Retime Save.user.js` erzeugt.
