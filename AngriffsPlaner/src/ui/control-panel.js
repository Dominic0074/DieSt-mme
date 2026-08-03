import { formatDateTime } from '../utils/time.js';

const PANEL_ID = 'ds-angriffs-planer-panel';
const STYLE_ID = 'ds-angriffs-planer-panel-style';
const UNITS = ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
const UNIT_LABELS = {
  spear: 'Speer',
  sword: 'Schwert',
  axe: 'Axt',
  archer: 'Bogen',
  spy: 'Spaeher',
  light: 'LK',
  marcher: 'BB',
  heavy: 'SK',
  ram: 'Ram',
  catapult: 'Kata',
  knight: 'Pala',
  snob: 'AG'
};

export class ControlPanel {
  constructor({ storage, onReadAttacks, onOpenWatcher }) {
    this.storage = storage;
    this.onReadAttacks = onReadAttacks;
    this.onOpenWatcher = onOpenWatcher;
    this.root = null;
  }

  async mount() {
    this.injectStyle();
    this.root = document.getElementById(PANEL_ID) || document.createElement('div');
    this.root.id = PANEL_ID;
    if (!this.root.parentNode) document.body.appendChild(this.root);
    this.root.addEventListener('click', event => this.handleClick(event));
    this.root.addEventListener('change', event => this.handleTemplateChange(event));
    await this.render();
  }

  async render(statusText = '') {
    if (!this.root) return;
    const state = await this.storage.loadState();
    const attacks = [...state.attacks].sort((a, b) => a.sendAt - b.sendAt);
    const categories = Object.entries(state.templates || {});

    this.root.innerHTML = `
      <div class="ap-title">AngriffsPlaner</div>
      <div class="ap-status">${this.escape(statusText || `${attacks.length} Angriffe gespeichert`)}</div>
      <div class="ap-actions">
        <button type="button" data-action="read">Auslesen</button>
        <button type="button" data-action="watch">Monitor</button>
        <button type="button" data-action="toggle-list">Liste</button>
      </div>
      <div class="ap-section">
        <div class="ap-section-title">Truppen je Kategorie</div>
        ${categories.length ? categories.map(([key, template]) => this.renderTemplate(key, template)).join('') : '<div class="ap-muted">Noch keine Kategorien gespeichert.</div>'}
      </div>
      <div class="ap-section ap-list" hidden>
        <div class="ap-section-title">Ausgelesene Angriffe</div>
        ${attacks.length ? attacks.map(attack => this.renderAttack(attack)).join('') : '<div class="ap-muted">Keine Angriffe gespeichert.</div>'}
      </div>
    `;
  }

  renderTemplate(key, template) {
    const units = template.units || {};
    return `
      <details class="ap-template">
        <summary>${this.escape(template.label || key)}</summary>
        <div class="ap-unit-grid">
          ${UNITS.map(unit => `
            <label>
              <span>${UNIT_LABELS[unit]}</span>
              <input type="number" min="0" step="1" value="${Number(units[unit] || 0)}" data-category="${this.escapeAttr(key)}" data-unit="${unit}">
            </label>
          `).join('')}
        </div>
      </details>
    `;
  }

  renderAttack(attack) {
    return `
      <div class="ap-attack">
        <div><b>${this.escape(attack.categoryLabel)}</b> #${this.escape(attack.id)}</div>
        <div>${this.escape(attack.sourceLabel || '-')} -> ${this.escape(attack.targetLabel || '-')}</div>
        <div>Senden: ${this.escape(formatDateTime(attack.sendAt))}</div>
        <div>Ziel-Link: ${attack.playUrl ? 'ja' : 'fehlt'}</div>
      </div>
    `;
  }

  async handleClick(event) {
    const action = event.target?.dataset?.action;
    if (!action) return;

    if (action === 'read') {
      await this.render('Lese Angriffe ...');
      await this.onReadAttacks?.();
      await this.render();
    }
    if (action === 'watch') {
      await this.onOpenWatcher?.();
    }
    if (action === 'toggle-list') {
      const list = this.root.querySelector('.ap-list');
      if (list) list.hidden = !list.hidden;
    }
  }

  async handleTemplateChange(event) {
    const input = event.target;
    const category = input?.dataset?.category;
    const unit = input?.dataset?.unit;
    if (!category || !unit) return;

    const state = await this.storage.loadState();
    const template = state.templates[category];
    if (!template) return;

    template.units[unit] = Math.max(0, Math.floor(Number(input.value) || 0));
    await this.storage.saveTemplates(state.templates);
  }

  injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 99999;
        width: 360px;
        max-height: calc(100vh - 24px);
        overflow: auto;
        padding: 10px;
        border: 1px solid #6f5635;
        background: rgba(248, 244, 232, 0.97);
        color: #2f2417;
        font: 12px Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
      }
      #${PANEL_ID} .ap-title {
        margin-bottom: 6px;
        font-weight: bold;
        font-size: 14px;
        color: #5b2d14;
      }
      #${PANEL_ID} .ap-status,
      #${PANEL_ID} .ap-muted {
        color: #6f5635;
      }
      #${PANEL_ID} .ap-actions {
        display: flex;
        gap: 6px;
        margin: 8px 0;
      }
      #${PANEL_ID} button {
        padding: 3px 8px;
        border: 1px solid #8c6d3f;
        background: #f5e6bd;
        color: #2f2417;
        cursor: pointer;
      }
      #${PANEL_ID} .ap-section {
        padding-top: 8px;
        border-top: 1px solid #d3bd86;
      }
      #${PANEL_ID} .ap-section-title {
        margin-bottom: 5px;
        font-weight: bold;
      }
      #${PANEL_ID} .ap-template {
        margin-bottom: 6px;
      }
      #${PANEL_ID} .ap-unit-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px;
        margin-top: 5px;
      }
      #${PANEL_ID} label {
        display: grid;
        gap: 2px;
      }
      #${PANEL_ID} input {
        min-width: 0;
        padding: 2px 4px;
        border: 1px solid #b69a68;
        background: #fffaf0;
      }
      #${PANEL_ID} .ap-attack {
        padding: 6px 0;
        border-top: 1px solid #e1cf9e;
      }
    `;
    document.head.appendChild(style);
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

  escapeAttr(value) {
    return this.escape(value);
  }
}
