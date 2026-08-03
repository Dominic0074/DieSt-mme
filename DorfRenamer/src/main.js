import { App } from './app.js';

console.info('[DorfRenamer] Userscript geladen', window.location.href);

function startApp() {
  try {
    const app = new App();
    window.dorfRenamerApp = app;
    app.start();
    console.info('[DorfRenamer] App gestartet');
  } catch (error) {
    console.error('[DorfRenamer] Start fehlgeschlagen', error);
  }
}

if (document.body) {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp, { once: true });
}
