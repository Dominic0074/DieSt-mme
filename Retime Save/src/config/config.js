export const CONFIG = Object.freeze({
  // Erst aktivieren, nachdem alle Werte gesetzt wurden.
  enabled: false,

  // Zeitpunkt des ersten Klicks, sobald die Truppen zurueck sind.
  // Format laut Serveruhr: JJJJ-MM-TT HH:MM:SS.mmm
  sendAt: '2026-06-28 17:57:00.000',

  target: Object.freeze({
    x: 587,
    y: 392
  }),

  units: Object.freeze({
    spear: 10,
    sword: 10,
    axe: 0,
    archer: 0,
    spy: 0,
    light: 0,
    marcher: 0,
    heavy: 0,
    ram: 0,
    catapult: 0,
    knight: 0,
    snob: 0,
    militia: 0
  }),

  // null verwendet das beim Start ausgewaehlte Dorf.
  sourceVillageId: null,

  // So frueh wird das erste Formular geoeffnet und ausgefuellt.
  prepareSeconds: 60,

  // Erlaubte Verspaetung fuer den ersten Klick.
  maxLateMs: 1500,

  // Maximale Ladezeit bis zum sofortigen Klick auf der Bestaetigungsseite.
  confirmTimeoutMs: 10000
});
