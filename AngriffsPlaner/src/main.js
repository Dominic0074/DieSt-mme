import { AttackPlannerApp } from './app.js';

function startApp() {
  try {
    const app = new AttackPlannerApp();
    window.attackPlannerApp = app;
    app.start();
  } catch (error) {
    console.error('AngriffsPlaner: Start fehlgeschlagen.', error);
  }
}

if (document.body) {
  startApp();
} else {
  window.addEventListener('DOMContentLoaded', startApp, { once: true });
}
