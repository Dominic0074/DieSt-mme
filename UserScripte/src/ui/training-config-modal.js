const TRAINING_UNITS = [
  { key: 'spear', label: 'Speer' },
  { key: 'sword', label: 'Schwert' },
  { key: 'axe', label: 'Axt' },
  { key: 'archer', label: 'Bogen' }
];

export class TrainingConfigModal {
  constructor(state, storage, hooks = {}) {
    this.state = state;
    this.storage = storage;
    this.hooks = hooks;
  }

  open() {
    this.close();
    this.injectStyle();

    const overlay = document.createElement('div');
    overlay.id = 'ds-training-config-overlay';
    overlay.innerHTML = `
      <div class="ds-training-modal">
        <div class="ds-training-header">
          <strong>Ausbildungs-Konfiguration</strong>
          <button type="button" data-action="close">Schliessen</button>
        </div>
        <table class="ds-training-table">
          <thead>
            <tr>
              <th>Art</th>
              <th>Anzahl</th>
              <th>Ziel</th>
              <th>Charge</th>
            </tr>
          </thead>
          <tbody>
            ${TRAINING_UNITS.map(unit => this.renderRow(unit)).join('')}
          </tbody>
        </table>
        <div class="ds-training-actions">
          <button type="button" data-action="reset">Zuruecksetzen</button>
          <button type="button" data-action="save">Speichern</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => this.handleClick(event));
  }

  close() {
    document.getElementById('ds-training-config-overlay')?.remove();
  }

  renderRow(unit) {
    const config = this.state.training?.units?.[unit.key] || {};

    return `
      <tr data-unit="${unit.key}">
        <td>${unit.label}</td>
        <td><span class="ds-training-readonly">${this.formatAvailableTotal(unit.key)}</span></td>
        <td><input type="number" min="0" step="1" data-field="target" value="${numberValue(config.target)}"></td>
        <td><input type="number" min="0" step="1" data-field="batch" value="${numberValue(config.batch)}"></td>
      </tr>
    `;
  }

  formatAvailableTotal(unit) {
    const total = this.state.barracks?.units?.[unit]?.total;
    return Number.isFinite(Number(total)) ? String(Number(total)) : 'n.a.';
  }

  handleClick(event) {
    const action = event.target?.getAttribute?.('data-action');
    if (!action) return;

    if (action === 'close') {
      this.close();
      return;
    }

    if (action === 'reset') {
      this.save({ units: createEmptyTrainingUnits() });
      this.open();
      return;
    }

    if (action === 'save') {
      this.save(this.readForm());
      this.close();
    }
  }

  readForm() {
    const units = {};

    document.querySelectorAll('#ds-training-config-overlay tr[data-unit]').forEach(row => {
      const unit = row.getAttribute('data-unit');
      units[unit] = {
        target: readNumber(row, 'target'),
        batch: readNumber(row, 'batch')
      };
    });

    return { units };
  }

  save(trainingConfig) {
    const patch = {
      training: trainingConfig
    };

    this.storage.merge(patch);
    this.state.training = trainingConfig;
    this.hooks.onSaved?.();
  }

  injectStyle() {
    if (document.getElementById('ds-training-config-style')) return;

    const style = document.createElement('style');
    style.id = 'ds-training-config-style';
    style.textContent = `
      #ds-training-config-overlay {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 80px;
        background: rgba(0, 0, 0, 0.35);
      }
      #ds-training-config-overlay .ds-training-modal {
        width: 520px;
        border: 1px solid #8c6d3f;
        background: #f4e4bc;
        color: #2f2417;
        font: 12px Arial, sans-serif;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      }
      #ds-training-config-overlay .ds-training-header,
      #ds-training-config-overlay .ds-training-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px;
      }
      #ds-training-config-overlay .ds-training-table {
        width: calc(100% - 16px);
        margin: 0 8px 8px;
        border-collapse: collapse;
      }
      #ds-training-config-overlay th,
      #ds-training-config-overlay td {
        padding: 5px;
        border: 1px solid #c7a96b;
        text-align: left;
      }
      #ds-training-config-overlay th {
        background: #c2a35f;
        color: #3b2414;
      }
      #ds-training-config-overlay input {
        width: 90px;
        box-sizing: border-box;
      }
      #ds-training-config-overlay .ds-training-readonly {
        display: inline-block;
        min-width: 90px;
        font-weight: bold;
      }
      #ds-training-config-overlay button {
        padding: 3px 10px;
        border: 1px solid #8c6d3f;
        background: #f8edcf;
        color: #2f2417;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }
}

function readNumber(row, field) {
  const value = Number(row.querySelector(`[data-field="${field}"]`)?.value || 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function numberValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? String(Math.floor(number)) : '0';
}

function createEmptyTrainingUnits() {
  return Object.fromEntries(
    TRAINING_UNITS.map(unit => [unit.key, { target: 0, batch: 0 }])
  );
}