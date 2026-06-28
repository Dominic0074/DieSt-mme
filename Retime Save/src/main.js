import { RetimeSaveApp } from './app.js';

function startApp() {
  try {
    const app = new RetimeSaveApp();
    window.retimeSaveApp = app;
    app.start();
  } catch (error) {
    console.error('Retime Save: Start fehlgeschlagen.', error);
  }
}

if (document.body) {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp, { once: true });
}
