import { App } from './app.js';

console.info('[DS Auto] Userscript geladen', window.location.href);

function startApp() {
  try {
    const app = new App();
    window.dsAutoApp = app;
    app.start();
    console.info('[DS Auto] App gestartet', app.state.page);
  } catch (error) {
    console.error('[DS Auto] Start fehlgeschlagen', error);
  }
}

if (document.body) {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp, { once: true });
}