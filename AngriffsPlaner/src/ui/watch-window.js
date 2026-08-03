import { formatDateTime, formatRemaining } from '../utils/time.js';

export class WatchWindow {
  constructor({ config, storage }) {
    this.config = config;
    this.storage = storage;
    this.windowRef = null;
    this.intervalId = null;
  }

  async open() {
    this.windowRef = window.open('', this.config.watcherWindowName, 'width=760,height=620');
    if (!this.windowRef) {
      throw new Error('Monitor-Fenster konnte nicht geoeffnet werden.');
    }

    this.renderShell();
    await this.renderState();
    this.startTicker();
  }

  async attachCurrentWindow() {
    this.windowRef = window;
    this.renderShell();
    await this.renderState();
    this.startTicker();
  }

  renderShell() {
    const doc = this.windowRef.document;
    doc.open();
    doc.write(`<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>AngriffsPlaner Monitor</title>
  <style>
    body { margin: 0; background: #f2ead2; color: #2f2417; font: 13px Arial, sans-serif; }
    header { position: sticky; top: 0; padding: 12px 14px; border-bottom: 1px solid #9a7a43; background: #e6d2a1; }
    h1 { margin: 0 0 6px; font-size: 17px; }
    main { padding: 12px 14px; }
    button { padding: 5px 10px; border: 1px solid #77562d; background: #f6e5b8; color: #2f2417; cursor: pointer; }
    .status { font-weight: bold; }
    .attack { display: grid; grid-template-columns: 110px 1fr 190px 90px; gap: 8px; padding: 7px 0; border-bottom: 1px solid #d2bd87; align-items: center; }
    .attack.is-next { background: rgba(111, 86, 53, 0.1); }
    .muted { color: #6f5635; }
    .error { color: #9b0000; }
  </style>
</head>
<body>
  <header>
    <h1>AngriffsPlaner Monitor</h1>
    <div class="status" data-field="status">Bereit</div>
    <button type="button" data-action="toggle">Start</button>
  </header>
  <main data-field="content"></main>
</body>
</html>`);
    doc.close();
    doc.querySelector('[data-action="toggle"]').addEventListener('click', () => this.toggleRunning());
  }

  async startTicker() {
    if (this.intervalId) this.windowRef.clearInterval(this.intervalId);

    this.intervalId = this.windowRef.setInterval(async () => {
      await this.renderState();
      await this.activateDueAttack();
    }, 1000);
  }

  async toggleRunning() {
    const state = await this.storage.loadState();
    await this.storage.patchRuntime({ running: !state.runtime.running });
    await this.renderState();
  }

  async renderState() {
    if (!this.windowRef || this.windowRef.closed) return;

    const state = await this.storage.loadState();
    const now = Date.now();
    const sentIds = new Set(state.runtime.sentAttackIds || []);
    const attacks = [...state.attacks]
      .filter(attack => !sentIds.has(attack.id))
      .sort((a, b) => a.sendAt - b.sendAt);
    const nextAttack = attacks.find(attack => attack.sendAt + this.config.maxLateMs >= now);
    const status = state.runtime.running
      ? nextAttack
        ? `Aktiv. Naechster Angriff in ${formatRemaining(nextAttack.sendAt - now)}.`
        : 'Aktiv. Kein offener Angriff gefunden.'
      : 'Angehalten.';

    const doc = this.windowRef.document;
    doc.querySelector('[data-field="status"]').textContent = status;
    doc.querySelector('[data-action="toggle"]').textContent = state.runtime.running ? 'Stop' : 'Start';
    doc.querySelector('[data-field="content"]').innerHTML = attacks.length
      ? attacks.map(attack => this.renderAttack(attack, nextAttack?.id === attack.id, now)).join('')
      : '<div class="muted">Keine offenen Angriffe gespeichert.</div>';
  }

  renderAttack(attack, isNext, now) {
    const remaining = attack.sendAt - now;
    return `
      <div class="attack${isNext ? ' is-next' : ''}">
        <div>#${this.escape(attack.id)}</div>
        <div>
          <b>${this.escape(attack.categoryLabel)}</b><br>
          <span class="muted">${this.escape(attack.sourceLabel || '-')} -> ${this.escape(attack.targetLabel || '-')}</span>
        </div>
        <div>${this.escape(formatDateTime(attack.sendAt))}</div>
        <div>${remaining >= 0 ? this.escape(formatRemaining(remaining)) : '<span class="error">faellig</span>'}</div>
      </div>
    `;
  }

  async activateDueAttack() {
    const state = await this.storage.loadState();
    if (!state.runtime.running || state.runtime.activeAttackId) return;

    const now = Date.now();
    const sentIds = new Set(state.runtime.sentAttackIds || []);
    const attack = [...state.attacks]
      .filter(item => !sentIds.has(item.id))
      .sort((a, b) => a.sendAt - b.sendAt)
      .find(item => item.sendAt - this.config.prepareSeconds * 1000 <= now
        && item.sendAt + this.config.maxLateMs >= now);

    if (!attack) return;
    if (!attack.playUrl) {
      this.setStatus(`Angriff ${attack.id}: Play-Link fehlt.`);
      return;
    }

    await this.storage.patchRuntime({
      activeAttackId: attack.id,
      preparedAttackId: null,
      firstClickAt: null
    });
    this.setStatus(`Angriff ${attack.id}: oeffnet Play-Link.`);
    this.windowRef.location.href = attack.playUrl;
  }

  setStatus(message) {
    const field = this.windowRef?.document?.querySelector?.('[data-field="status"]');
    if (field) field.textContent = message;
  }

  escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }
}
