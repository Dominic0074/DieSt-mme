import { App } from './app.js';

function startApp() {
  try {
    const app = new App();
    window.dsAutoApp = app;
    app.start();
  } catch (error) {
    console.error('[DS Auto] Start fehlgeschlagen', error);
  }
}

if (document.body) {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp, { once: true });
}
