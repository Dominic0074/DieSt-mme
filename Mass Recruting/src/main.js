import { App } from './app.js';

console.info('[Mass Recruting] Userscript geladen', window.location.href);

function startApp() {
  try {
    const app = new App();
    window.massRecrutingApp = app;
    app.start();
    console.info('[Mass Recruting] App gestartet');
  } catch (error) {
    console.error('[Mass Recruting] Start fehlgeschlagen', error);
  }
}

if (document.body) {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp, { once: true });
}
