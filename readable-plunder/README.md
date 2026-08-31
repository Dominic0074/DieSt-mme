# plunder.js Audit Rewrite

`plunder.audit.js` is a readable, non-operational rewrite of the obfuscated
`downloaded-plunder/plunder.js`.

What the original script does:

- Locks execution to the player name `Arnold22`.
- Sends a beacon to `https://ds-plunder.jumperjim112.workers.dev/beacon`.
- Reads village and unit data from `screen=place&mode=scavenge_mass`.
- Sends minimized village data and settings to
  `https://ds-plunder.jumperjim112.workers.dev/compute?key=...`.
- Receives `squad_requests` from that worker.
- Sends those requests with `TribalWars.post("scavenge_api", { ajaxaction:
  "send_squads" }, ...)`.
- Stores settings in `localStorage` under `ds.plunder.<world>`.
- Detects bot-check DOM elements and waits for them to disappear.

What this rewrite changes:

- It does not contact the external worker.
- It does not send `squad_requests`.
- It does not continue after bot checks.
- It keeps the UI/settings/storage structure readable for inspection.

Manual review points:

- Open the browser console before loading the audit script.
- Confirm the panel appears.
- Click `Audit starten`.
- Confirm console output only logs intended payload shapes.
- Confirm the network tab shows no request to `ds-plunder.jumperjim112.workers.dev`.
- Confirm no `scavenge_api` request is sent.
