const BUILDING_LABELS = {
  main: 'Hauptgebaeude',
  barracks: 'Kaserne',
  stable: 'Stall',
  garage: 'Werkstatt',
  smith: 'Schmiede',
  place: 'Versammlungsplatz',
  market: 'Marktplatz',
  wood: 'Holz',
  stone: 'Lehm',
  iron: 'Eisen',
  farm: 'Bauernhof',
  storage: 'Speicher',
  hide: 'Versteck',
  wall: 'Wall',
  snob: 'Adelshof'
};

const BUILDING_ORDER = [
  'main', 'barracks', 'stable', 'garage', 'smith', 'place', 'market',
  'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'wall', 'snob'
];

export class BuildConfigModal {
  constructor(state, storage, hooks = {}) {
    this.state = state;
    this.storage = storage;
    this.hooks = hooks;
  }

  open() {
    this.close();
    this.injectStyle();

    const overlay = document.createElement('div');
    overlay.id = 'ds-build-config-overlay';
    overlay.innerHTML = `
      <div class="ds-build-modal">
        <div class="ds-build-header">
          <strong>Ausbau-Konfiguration</strong>
          <button type="button" data-action="close">Schliessen</button>
        </div>
        <div class="ds-build-section">
          <h3>Aktuelle Bauqueue</h3>
          ${this.renderCurrentQueue()}
        </div>
        <div class="ds-build-section">
          <h3>Geplante Upgrades</h3>
          ${this.renderPlannedQueue()}
        </div>
        <div class="ds-build-section">
          <h3>Gebaeude</h3>
          ${this.renderBuildingTable()}
        </div>
        <div class="ds-build-actions">
          <button type="button" data-action="clear-plan">Plan leeren</button>
          <button type="button" data-action="close">Schliessen</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => this.handleClick(event));
  }

  close() {
    document.getElementById('ds-build-config-overlay')?.remove();
  }

  renderCurrentQueue() {
    const queue = this.state.mainBuilding?.queue || [];
    if (queue.length === 0) return '<div class="ds-build-empty">Keine Bauauftraege gespeichert.</div>';

    return `
      <table class="ds-build-table">
        <thead><tr><th>#</th><th>Gebaeude</th><th>Ziel</th><th>Fertig</th></tr></thead>
        <tbody>
          ${queue.map(item => `
            <tr>
              <td>${item.index}</td>
              <td>${this.getBuildingLabel(item.building, item.name)}</td>
              <td>${formatLevel(item.targetLevel)}</td>
              <td>${item.finishText || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  renderPlannedQueue() {
    const queue = this.getPlannedQueue();
    if (queue.length === 0) return '<div class="ds-build-empty">Keine geplanten Upgrades.</div>';

    return `
      <table class="ds-build-table">
        <thead><tr><th>#</th><th>Gebaeude</th><th>Ziel</th><th>Kosten</th><th></th></tr></thead>
        <tbody>
          ${queue.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${this.getBuildingLabel(item.building, item.name)}</td>
              <td>${formatLevel(item.targetLevel)}</td>
              <td>${formatCosts(item.costs)}${item.costsEstimated ? ' *' : ''}</td>
              <td><button type="button" data-action="remove-plan" data-id="${item.id}">Entfernen</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  renderBuildingTable() {
    const buildings = this.getKnownBuildings();
    if (buildings.length === 0) return '<div class="ds-build-empty">Noch keine Hauptgebaeude-Daten gespeichert.</div>';

    return `
      <table class="ds-build-table">
        <thead><tr><th>Gebaeude</th><th>Level</th><th>Naechstes Upgrade</th><th>Kosten</th><th></th></tr></thead>
        <tbody>
          ${buildings.map(building => {
            const nextLevel = this.getNextTargetLevel(building);
            const costs = this.getUpgradeCosts(building, nextLevel);
            return `
              <tr>
                <td>${this.getBuildingLabel(building)}</td>
                <td>${this.getBaseLevel(building)}</td>
                <td>${formatLevel(nextLevel)}</td>
                <td>${formatCosts(costs.costs)}${costs.estimated ? ' *' : ''}</td>
                <td><button type="button" data-action="add-upgrade" data-building="${building}">Upgrade</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  handleClick(event) {
    const action = event.target?.getAttribute?.('data-action');
    if (!action) return;

    if (action === 'close') {
      this.close();
      return;
    }

    if (action === 'clear-plan') {
      this.savePlan([]);
      this.open();
      return;
    }

    if (action === 'remove-plan') {
      const id = event.target.getAttribute('data-id');
      this.savePlan(this.getPlannedQueue().filter(item => item.id !== id));
      this.open();
      return;
    }

    if (action === 'add-upgrade') {
      const building = event.target.getAttribute('data-building');
      this.addUpgrade(building);
      this.open();
    }
  }

  addUpgrade(building) {
    if (!building) return;

    const queue = this.getPlannedQueue();
    const targetLevel = this.getNextTargetLevel(building);
    const costs = this.getUpgradeCosts(building, targetLevel);

    queue.push({
      id: `${building}-${Date.now()}-${queue.length}`,
      building,
      name: this.getBuildingLabel(building),
      targetLevel,
      costs: costs.costs,
      costsEstimated: costs.estimated,
      createdAt: Date.now()
    });
    this.savePlan(queue);
  }

  getNextTargetLevel(building) {
    const baseLevel = this.getBaseLevel(building);
    const queuedLevel = this.getHighestQueuedLevel(building);
    return Math.max(baseLevel, queuedLevel) + 1;
  }

  getUpgradeCosts(building, targetLevel) {
    const info = this.state.mainBuilding?.upgradeInfo?.[building];
    if (!info?.costs) return { costs: null, estimated: false };

    if (Number(info.nextLevel) === Number(targetLevel)) {
      return { costs: info.costs, estimated: false };
    }

    const levelDiff = Number(targetLevel) - Number(info.nextLevel || targetLevel);
    if (!Number.isFinite(levelDiff) || levelDiff < 0) {
      return { costs: info.costs, estimated: true };
    }

    return {
      costs: {
        wood: estimateCost(info.costs.wood, info.factors?.wood, levelDiff),
        stone: estimateCost(info.costs.stone, info.factors?.stone, levelDiff),
        iron: estimateCost(info.costs.iron, info.factors?.iron, levelDiff),
        population: estimateCost(info.costs.population, info.factors?.population, levelDiff)
      },
      estimated: levelDiff > 0
    };
  }

  getHighestQueuedLevel(building) {
    const normalQueue = this.state.mainBuilding?.queue || [];
    const plannedQueue = this.getPlannedQueue();

    return [...normalQueue, ...plannedQueue]
      .filter(item => item.building === building)
      .map(item => Number(item.targetLevel || 0))
      .filter(level => Number.isFinite(level))
      .reduce((max, level) => Math.max(max, level), 0);
  }

  getBaseLevel(building) {
    const level = Number(this.state.mainBuilding?.levels?.[building] || 0);
    return Number.isFinite(level) ? level : 0;
  }

  getKnownBuildings() {
    const levels = this.state.mainBuilding?.levels || {};
    return Object.keys(levels).sort((a, b) => {
      const indexA = BUILDING_ORDER.indexOf(a);
      const indexB = BUILDING_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  getPlannedQueue() {
    return Array.isArray(this.state.buildPlan?.queue) ? [...this.state.buildPlan.queue] : [];
  }

  savePlan(queue) {
    const patch = {
      buildPlan: {
        queue
      }
    };

    this.storage.merge(patch);
    this.state.buildPlan = patch.buildPlan;
    this.hooks.onSaved?.();
  }

  getBuildingLabel(building, fallback = '') {
    return BUILDING_LABELS[building] || fallback || building || '-';
  }

  injectStyle() {
    if (document.getElementById('ds-build-config-style')) return;

    const style = document.createElement('style');
    style.id = 'ds-build-config-style';
    style.textContent = `
      #ds-build-config-overlay {
        position: fixed;
        inset: 0;
        z-index: 100000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 48px 16px;
        background: rgba(0, 0, 0, 0.35);
      }
      #ds-build-config-overlay .ds-build-modal {
        width: min(860px, calc(100vw - 32px));
        max-height: calc(100vh - 96px);
        overflow: auto;
        border: 1px solid #8c6d3f;
        background: #f4e4bc;
        color: #2f2417;
        font: 12px Arial, sans-serif;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      }
      #ds-build-config-overlay .ds-build-header,
      #ds-build-config-overlay .ds-build-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px;
      }
      #ds-build-config-overlay .ds-build-section {
        padding: 0 8px 10px;
      }
      #ds-build-config-overlay h3 {
        margin: 8px 0 5px;
        font-size: 13px;
      }
      #ds-build-config-overlay .ds-build-table {
        width: 100%;
        border-collapse: collapse;
      }
      #ds-build-config-overlay th,
      #ds-build-config-overlay td {
        padding: 5px;
        border: 1px solid #c7a96b;
        text-align: left;
      }
      #ds-build-config-overlay th {
        background: #c2a35f;
        color: #3b2414;
      }
      #ds-build-config-overlay .ds-build-empty {
        padding: 6px;
        border: 1px solid #c7a96b;
        background: rgba(255, 255, 255, 0.25);
      }
      #ds-build-config-overlay button {
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

function formatLevel(level) {
  const number = Number(level);
  return Number.isFinite(number) && number > 0 ? `Stufe ${number}` : '-';
}

function formatCosts(costs) {
  if (!costs) return '-';

  return [
    `H ${formatNumber(costs.wood)}`,
    `L ${formatNumber(costs.stone)}`,
    `E ${formatNumber(costs.iron)}`,
    `B ${formatNumber(costs.population)}`
  ].join(' | ');
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString('de-DE') : '0';
}

function estimateCost(baseCost, factor, levelDiff) {
  const cost = Number(baseCost || 0);
  const costFactor = Number(factor || 1);
  if (!Number.isFinite(cost) || !Number.isFinite(costFactor)) return 0;
  return Math.round(cost * Math.pow(costFactor, levelDiff));
}