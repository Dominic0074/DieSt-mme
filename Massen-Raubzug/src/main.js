import { App } from './app.js';

console.info('[Massen-Raubzug] Userscript geladen', window.location.href);

function startApp() {
  try {
    const app = new App();
    window.massenRaubzugApp = app;
    app.start();
    console.info('[Massen-Raubzug] App gestartet');
  } catch (error) {
    console.error('[Massen-Raubzug] Start fehlgeschlagen', error);
  }
}

if (document.body) {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp, { once: true });
}
