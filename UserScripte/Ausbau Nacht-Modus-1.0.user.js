// ==UserScript==
// @name         Ausbau Nacht-Modus
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Baut die Nacht-Warteschlange ab und stoppt danach. Sofortiger Stop bei Bot-Schutz.
// @author       kk
// @match        https://*/game.php*
// @grant        none
// ==/UserScript==

// ═══════════════════════════════════════════════════════════════
//  NACHT-WARTESCHLANGE – hier eintragen was gebaut werden soll
//
//  Einfach die gewünschten Zeilen nach unten in die Queue kopieren
//  und das Ziellevel anpassen. Das Skript stoppt wenn alles fertig ist.
//
//  ALLE VERFÜGBAREN GEBÄUDE ZUM KOPIEREN:
//
//  ── Rohstoffe ──────────────────────────────────────────────────
//  { building: 'wood',     level: X },  // Holzfäller
//  { building: 'stone',    level: X },  // Lehmgrube
//  { building: 'iron',     level: X },  // Eisenmine
//
//  ── Basis ──────────────────────────────────────────────────────
//  { building: 'main',     level: X },  // Hauptgebäude
//  { building: 'storage',  level: X },  // Speicher
//  { building: 'farm',     level: X },  // Bauernhof
//  { building: 'place',    level: X },  // Versammlungsplatz
//  { building: 'hide',     level: X },  // Versteck
//
//  ── Militär ────────────────────────────────────────────────────
//  { building: 'barracks', level: X },  // Kaserne
//  { building: 'stable',   level: X },  // Stall
//  { building: 'garage',   level: X },  // Werkstatt
//  { building: 'smith',    level: X },  // Schmiede
//  { building: 'market',   level: X },  // Marktplatz
//  { building: 'wall',     level: X },  // Wall
//  { building: 'snob',     level: X },  // Adelshof
// ═══════════════════════════════════════════════════════════════
const nightQueue = [
  // ── Hier deine Nacht-Liste eintragen ──
];
// ═══════════════════════════════════════════════════════════════

// ── Konfiguration ──────────────────────────────────────────────
const CLICK_DELAY_MIN  = 3000;  // Mindestwartezeit zwischen Klicks (ms)
const CLICK_DELAY_MAX  = 5000;  // Maximalwartezeit zwischen Klicks (ms)
const RELOAD_WAIT_MIN  = 2 * 60 * 1000;  // Mindestwartezeit zwischen Prüfungen (ms)
const RELOAD_WAIT_MAX  = 2 * 60 * 1000 + 30 * 1000;  // Maximalwartezeit (ms)
const ALERT_SOUND_ENABLED = true;

// Raubzuege: Pro Slot eintragen, welche Truppen geschickt werden sollen.
// Option 1-4 entspricht den vier Raubzug-Optionen im Spiel.
const RAID_CONFIG = {
  enabled: true,
  autoStart: true,
  switchPages: true,
  returnToBuildings: true,
  enabledOptions: [1, 2, 3, 4],
  minUnitsPerRaid: 1,
  actionDelayMin: 100,
  actionDelayMax: 3000,
  sendDelayMin: 2500,
  sendDelayMax: 4500,
  returnDelayMin: 1500,
  returnDelayMax: 4000,
  idleCheckDelayMin: 1200,
  idleCheckDelayMax: 2500,
  nextRaidBufferMin: 1500,
  nextRaidBufferMax: 6000,
  reserve: {
    spear: 0,
    sword: 0,
    axe: 0,
    archer: 0,
    light: 0,
    marcher: 0,
    heavy: 0
  },
  raids: {
    1: {
      enabled: true,
      units: {
        spear: 10,
        sword: 0,
        axe: 0,
        archer: 0,
        light: 0,
        marcher: 0,
        heavy: 0
      }
    },
    2: {
      enabled: true,
      units: {
        spear: 0,
        sword: 0,
        axe: 10,
        archer: 0,
        light: 0,
        marcher: 0,
        heavy: 0
      }
    },
    3: {
      enabled: false,
      units: {
        spear: 0,
        sword: 0,
        axe: 0,
        archer: 0,
        light: 5,
        marcher: 0,
        heavy: 0
      }
    },
    4: {
      enabled: false,
      units: {
        spear: 0,
        sword: 0,
        axe: 0,
        archer: 0,
        light: 0,
        marcher: 0,
        heavy: 0
      }
    }
  }
};
// ──────────────────────────────────────────────────────────────

let BOT_PROTECTION_TRIGGERED = false;
let RAID_RUNNING = false;
const STORAGE_KEY = 'ds_nacht_autostart';
const RAID_NEXT_READY_KEY = 'ds_raid_next_ready_at';
const RAID_READY_TIMES_KEY = 'ds_raid_ready_times';
const RAID_NEXT_SWITCH_KEY = 'ds_raid_next_switch_at';
const RAID_AUTO_ACTIVE_KEY = 'ds_raid_auto_active';
const RAID_CONFIG_STORAGE_KEY = 'ds_raid_config_v1';
const NIGHT_QUEUE_STORAGE_KEY = 'ds_night_queue_v1';
const RAID_UNITS = ['spear', 'sword', 'axe', 'archer', 'light', 'marcher', 'heavy'];
const RAID_UNIT_LABELS = {
  spear: 'Speer',
  sword: 'Schwert',
  axe: 'Axt',
  archer: 'Bogen',
  light: 'LKav',
  marcher: 'Beritt. Bogen',
  heavy: 'SKav'
};
const NIGHT_BUILDINGS = [
  { key: 'wood', label: 'Holzfaeller' },
  { key: 'stone', label: 'Lehmgrube' },
  { key: 'iron', label: 'Eisenmine' },
  { key: 'main', label: 'Hauptgebaeude' },
  { key: 'storage', label: 'Speicher' },
  { key: 'farm', label: 'Bauernhof' },
  { key: 'place', label: 'Versammlungsplatz' },
  { key: 'hide', label: 'Versteck' },
  { key: 'barracks', label: 'Kaserne' },
  { key: 'stable', label: 'Stall' },
  { key: 'garage', label: 'Werkstatt' },
  { key: 'smith', label: 'Schmiede' },
  { key: 'market', label: 'Marktplatz' },
  { key: 'wall', label: 'Wall' },
  { key: 'snob', label: 'Adelshof' }
];
const NIGHT_BUILDING_KEYS = NIGHT_BUILDINGS.map(building => building.key);
const RAID_DEFAULT_CONFIG = JSON.parse(JSON.stringify(RAID_CONFIG));
const DEFAULT_NIGHT_QUEUE = JSON.parse(JSON.stringify(nightQueue));

function Sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatClock(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleTimeString('de-DE') : '-';
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '-';
  if (ms <= 0) return 'jetzt';

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getCurrentScriptPageName() {
  if (isScavengePage()) return 'Raubzuege';
  if (isBuildingsOverviewPage()) return 'Gebaeude';
  return 'Andere';
}

function getNightModeStatus() {
  if (!isBuildingsOverviewPage()) return 'wartet';
  if (BOT_PROTECTION_TRIGGERED) return 'gestoppt';
  if (!nightQueue || nightQueue.length === 0) return 'kein Zielbild';
  if (sessionStorage.getItem(STORAGE_KEY) === '1') return 'Reload geplant';
  return 'aktiv';
}

function isRaidAutomationActive() {
  return localStorage.getItem(RAID_AUTO_ACTIVE_KEY) === '1';
}

function normalizeRaidConfig(config) {
  const normalized = {
    reserve: {},
    raids: {}
  };

  RAID_UNITS.forEach(unit => {
    normalized.reserve[unit] = Math.max(0, Number(config?.reserve?.[unit] || 0));
  });

  [1, 2, 3, 4].forEach(index => {
    const raid = config?.raids?.[index] || {};
    normalized.raids[index] = {
      enabled: raid.enabled !== false,
      units: {}
    };

    RAID_UNITS.forEach(unit => {
      normalized.raids[index].units[unit] = Math.max(0, Number(raid.units?.[unit] || 0));
    });
  });

  return normalized;
}

function getDefaultRaidConfigSnapshot() {
  return normalizeRaidConfig(RAID_DEFAULT_CONFIG);
}

function applyRaidConfigSnapshot(snapshot) {
  const normalized = normalizeRaidConfig(snapshot);
  RAID_CONFIG.reserve = normalized.reserve;
  RAID_CONFIG.raids = normalized.raids;
}

function loadPersistentRaidConfig() {
  try {
    const raw = localStorage.getItem(RAID_CONFIG_STORAGE_KEY);
    if (!raw) return;
    applyRaidConfigSnapshot(JSON.parse(raw));
  } catch (e) {
    console.warn('Raubzug-Konfiguration konnte nicht geladen werden:', e);
  }
}

function savePersistentRaidConfig(snapshot) {
  const normalized = normalizeRaidConfig(snapshot);
  localStorage.setItem(RAID_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  applyRaidConfigSnapshot(normalized);
  updateRaidPlanDisplays();
}

function resetPersistentRaidConfig() {
  localStorage.removeItem(RAID_CONFIG_STORAGE_KEY);
  applyRaidConfigSnapshot(getDefaultRaidConfigSnapshot());
  updateRaidPlanDisplays();
}

function normalizeNightQueue(queue) {
  if (!Array.isArray(queue)) return [];

  return queue
    .map(entry => ({
      building: String(entry?.building || '').trim(),
      level: Math.max(1, Math.floor(Number(entry?.level || 0)))
    }))
    .filter(entry => NIGHT_BUILDING_KEYS.includes(entry.building) && entry.level > 0);
}

function applyNightQueueSnapshot(snapshot) {
  const normalized = normalizeNightQueue(snapshot);
  nightQueue.splice(0, nightQueue.length, ...normalized);
}

function getDefaultNightQueueSnapshot() {
  return normalizeNightQueue(DEFAULT_NIGHT_QUEUE);
}

function loadPersistentNightQueue() {
  try {
    const raw = localStorage.getItem(NIGHT_QUEUE_STORAGE_KEY);
    if (!raw) return;
    applyNightQueueSnapshot(JSON.parse(raw));
  } catch (e) {
    console.warn('Nacht-Zielbild konnte nicht geladen werden:', e);
  }
}

function savePersistentNightQueue(snapshot) {
  const normalized = normalizeNightQueue(snapshot);
  localStorage.setItem(NIGHT_QUEUE_STORAGE_KEY, JSON.stringify(normalized));
  applyNightQueueSnapshot(normalized);
  updateNightPlanDisplays();
}

function resetPersistentNightQueue() {
  localStorage.removeItem(NIGHT_QUEUE_STORAGE_KEY);
  applyNightQueueSnapshot(getDefaultNightQueueSnapshot());
  updateNightPlanDisplays();
}

function getNightBuildingLabel(key) {
  return NIGHT_BUILDINGS.find(building => building.key === key)?.label || key;
}

function buildNightPlanText() {
  return nightQueue
    .map(entry => `${getNightBuildingLabel(entry.building)} ${entry.level}`)
    .join(' | ') || 'kein Zielbild';
}

function updateNightPlanDisplays() {
  const planText = buildNightPlanText();
  document.querySelectorAll('[data-field="nightPlan"]').forEach(node => {
    node.textContent = planText;
  });
}

function startRaidAutomation() {
  localStorage.setItem(RAID_AUTO_ACTIVE_KEY, '1');
  updateStatusBanner();

  if (!isScavengePage()) {
    window.location.href = getScavengeUrl();
    return;
  }

  startScavengingRaids();
}

function stopRaidAutomation() {
  localStorage.removeItem(RAID_AUTO_ACTIVE_KEY);
  localStorage.removeItem(RAID_NEXT_READY_KEY);
  localStorage.removeItem(RAID_READY_TIMES_KEY);
  localStorage.removeItem(RAID_NEXT_SWITCH_KEY);
  updateStatusBanner();
}

function initStatusBanner() {
  if (document.getElementById('ds-status-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'ds-status-banner';
  banner.innerHTML = `
    <div class="ds-status-title">DS Auto</div>
    <div class="ds-status-line"><span>Seite</span><strong data-field="page">-</strong></div>
    <div class="ds-status-line"><span>Raubzug</span><strong data-field="raidStatus">-</strong></div>
    <div class="ds-status-line ds-status-ready"><span>Fertig</span><strong data-field="raidReady">-</strong></div>
    <div class="ds-status-line"><span>Wechsel</span><strong data-field="raidSwitch">-</strong></div>
    <div class="ds-status-line"><span>Nacht</span><strong data-field="nightStatus">-</strong></div>
    <div class="ds-status-line"><span>Status</span><strong data-field="botStatus">-</strong></div>
    <div class="ds-status-plan"><span>Plan</span><strong data-field="raidPlan">-</strong></div>
    <div class="ds-status-plan"><span>Zielbild</span><strong data-field="nightPlan">-</strong></div>
    <div class="ds-status-actions">
      <button type="button" data-action="startRaidAuto">Start</button>
      <button type="button" data-action="stopRaidAuto">Stop</button>
    </div>
    <button type="button" class="ds-config-button" data-action="configureRaids">Konfig Raubzug</button>
    <button type="button" class="ds-config-button" data-action="configureNightQueue">Zielbild bearbeiten</button>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #ds-status-banner {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 99999;
      width: 210px;
      padding: 10px;
      border: 1px solid #6f5635;
      background: rgba(248, 244, 232, 0.96);
      color: #2f2417;
      font: 12px Arial, sans-serif;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
    }
    #ds-status-banner .ds-status-title {
      margin-bottom: 6px;
      font-weight: bold;
      font-size: 13px;
      color: #5b2d14;
    }
    #ds-status-banner .ds-status-line {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      line-height: 1.55;
      white-space: nowrap;
    }
    #ds-status-banner .ds-status-line span {
      color: #6f5635;
    }
    #ds-status-banner .ds-status-line strong {
      overflow: hidden;
      max-width: 118px;
      text-align: right;
      text-overflow: ellipsis;
    }
    #ds-status-banner .ds-status-ready {
      align-items: flex-start;
      white-space: normal;
    }
    #ds-status-banner .ds-status-ready strong {
      max-width: 140px;
      white-space: pre-line;
      line-height: 1.35;
    }
    #ds-status-banner .ds-status-plan {
      margin-top: 4px;
      line-height: 1.35;
    }
    #ds-status-banner .ds-status-plan span {
      display: block;
      color: #6f5635;
    }
    #ds-status-banner .ds-status-plan strong {
      display: block;
      max-height: 34px;
      overflow: hidden;
      color: #2f2417;
      font-weight: normal;
    }
    #ds-status-banner .ds-status-actions {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }
    #ds-status-banner .ds-status-actions button {
      flex: 1;
      padding: 3px 0;
      border: 1px solid #8b6f47;
      background: #f4e4bc;
      color: #2f2417;
      font: 12px Arial, sans-serif;
      cursor: pointer;
    }
    #ds-status-banner .ds-status-actions button:hover {
      background: #e7cf94;
    }
    #ds-status-banner .ds-status-actions button:disabled {
      border-color: #a89b85;
      background: #d0cbc0;
      color: #7d766b;
      cursor: default;
      opacity: 0.72;
    }
    #ds-status-banner .ds-status-actions button:disabled:hover {
      background: #d0cbc0;
    }
    #ds-status-banner .ds-config-button {
      width: 100%;
      margin-top: 6px;
      padding: 4px 0;
      border: 1px solid #8b6f47;
      background: #ead2a0;
      color: #2f2417;
      font: 12px Arial, sans-serif;
      cursor: pointer;
    }
    #ds-status-banner .ds-config-button:hover {
      background: #dfc184;
    }
    #ds-raid-config-backdrop,
    #ds-night-config-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.45);
      color: #2f2417;
      font: 12px Arial, sans-serif;
    }
    #ds-raid-config-modal,
    #ds-night-config-modal {
      width: min(760px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      overflow: auto;
      border: 1px solid #6f5635;
      background: #f8f4e8;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
    }
    #ds-raid-config-modal .ds-modal-head,
    #ds-raid-config-modal .ds-modal-actions,
    #ds-night-config-modal .ds-modal-head,
    #ds-night-config-modal .ds-modal-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 10px;
      background: #e7d6ad;
      border-bottom: 1px solid #b69a68;
    }
    #ds-raid-config-modal .ds-modal-title,
    #ds-night-config-modal .ds-modal-title {
      font-weight: bold;
      font-size: 13px;
      color: #5b2d14;
    }
    #ds-raid-config-modal .ds-modal-body,
    #ds-night-config-modal .ds-modal-body {
      padding: 10px;
    }
    #ds-raid-config-modal table,
    #ds-night-config-modal table {
      width: 100%;
      border-collapse: collapse;
      background: #fffaf0;
    }
    #ds-raid-config-modal th,
    #ds-raid-config-modal td,
    #ds-night-config-modal th,
    #ds-night-config-modal td {
      padding: 5px;
      border: 1px solid #c8b894;
      text-align: center;
      white-space: nowrap;
    }
    #ds-raid-config-modal th,
    #ds-night-config-modal th {
      background: #efe0bd;
      color: #5b2d14;
      font-weight: bold;
    }
    #ds-raid-config-modal input[type="number"],
    #ds-night-config-modal input[type="number"] {
      width: 58px;
      box-sizing: border-box;
      padding: 3px;
      border: 1px solid #a58b5e;
      background: #fff;
      color: #2f2417;
      font: 12px Arial, sans-serif;
      text-align: right;
    }
    #ds-night-config-modal select {
      min-width: 180px;
      box-sizing: border-box;
      padding: 3px;
      border: 1px solid #a58b5e;
      background: #fff;
      color: #2f2417;
      font: 12px Arial, sans-serif;
    }
    #ds-raid-config-modal .ds-modal-actions,
    #ds-night-config-modal .ds-modal-actions {
      border-top: 1px solid #b69a68;
      border-bottom: 0;
    }
    #ds-raid-config-modal button,
    #ds-night-config-modal button {
      padding: 4px 10px;
      border: 1px solid #8b6f47;
      background: #f4e4bc;
      color: #2f2417;
      font: 12px Arial, sans-serif;
      cursor: pointer;
    }
    #ds-raid-config-modal button:hover,
    #ds-night-config-modal button:hover {
      background: #e7cf94;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(banner);
  banner.querySelector('[data-action="startRaidAuto"]').addEventListener('click', startRaidAutomation);
  banner.querySelector('[data-action="stopRaidAuto"]').addEventListener('click', stopRaidAutomation);
  banner.querySelector('[data-action="configureRaids"]').addEventListener('click', openRaidConfigModal);
  banner.querySelector('[data-action="configureNightQueue"]').addEventListener('click', openNightQueueModal);
  updateStatusBanner();
  updateRaidPlanDisplays();
  updateNightPlanDisplays();
  setInterval(updateStatusBanner, 1000);
}

function buildRaidPlanText() {
  return RAID_CONFIG.enabledOptions
    .map(index => ({ index, config: getRaidConfig(index) }))
    .filter(({ config }) => config && config.enabled !== false)
    .map(({ index, config }) => `${index}: ${formatRaidUnits(config.units) || 'keine Truppen'}`)
    .join(' | ') || 'keine aktiven Slots';
}

function updateRaidPlanDisplays() {
  const planText = buildRaidPlanText();
  document.querySelectorAll('[data-field="raidPlan"]').forEach(node => {
    node.textContent = planText;
  });
}

function closeRaidConfigModal() {
  document.getElementById('ds-raid-config-backdrop')?.remove();
}

function buildRaidConfigRows() {
  return [1, 2, 3, 4].map(index => {
    const config = getRaidConfig(index) || { enabled: false, units: {} };
    const unitCells = RAID_UNITS.map(unit => `
      <td>
        <input type="number" min="0" step="1" data-slot="${index}" data-unit="${unit}" value="${Number(config.units?.[unit] || 0)}">
      </td>
    `).join('');

    return `
      <tr>
        <th>Slot ${index}</th>
        <td><input type="checkbox" data-slot="${index}" data-enabled="1" ${config.enabled !== false ? 'checked' : ''}></td>
        ${unitCells}
      </tr>
    `;
  }).join('');
}

function readRaidConfigFromModal(modal) {
  const snapshot = {
    reserve: {},
    raids: {}
  };

  RAID_UNITS.forEach(unit => {
    snapshot.reserve[unit] = Number(RAID_CONFIG.reserve?.[unit] || 0);
  });

  [1, 2, 3, 4].forEach(index => {
    snapshot.raids[index] = {
      enabled: Boolean(modal.querySelector(`[data-slot="${index}"][data-enabled="1"]`)?.checked),
      units: {}
    };

    RAID_UNITS.forEach(unit => {
      const input = modal.querySelector(`[data-slot="${index}"][data-unit="${unit}"]`);
      snapshot.raids[index].units[unit] = Math.max(0, Math.floor(Number(input?.value || 0)));
    });
  });

  return snapshot;
}

function openRaidConfigModal() {
  closeRaidConfigModal();

  const backdrop = document.createElement('div');
  backdrop.id = 'ds-raid-config-backdrop';
  backdrop.innerHTML = `
    <div id="ds-raid-config-modal" role="dialog" aria-modal="true">
      <div class="ds-modal-head">
        <div class="ds-modal-title">Raubzug-Konfiguration</div>
        <button type="button" data-action="closeRaidConfig">Schliessen</button>
      </div>
      <div class="ds-modal-body">
        <table>
          <thead>
            <tr>
              <th>Raubzug</th>
              <th>Aktiv</th>
              ${RAID_UNITS.map(unit => `<th>${RAID_UNIT_LABELS[unit] || unit}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${buildRaidConfigRows()}
          </tbody>
        </table>
      </div>
      <div class="ds-modal-actions">
        <button type="button" data-action="resetRaidConfig">Zuruecksetzen</button>
        <div>
          <button type="button" data-action="cancelRaidConfig">Abbrechen</button>
          <button type="button" data-action="saveRaidConfig">Speichern</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  const modal = backdrop.querySelector('#ds-raid-config-modal');

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) closeRaidConfigModal();
  });
  modal.querySelector('[data-action="closeRaidConfig"]').addEventListener('click', closeRaidConfigModal);
  modal.querySelector('[data-action="cancelRaidConfig"]').addEventListener('click', closeRaidConfigModal);
  modal.querySelector('[data-action="saveRaidConfig"]').addEventListener('click', () => {
    savePersistentRaidConfig(readRaidConfigFromModal(modal));
    closeRaidConfigModal();
  });
  modal.querySelector('[data-action="resetRaidConfig"]').addEventListener('click', () => {
    resetPersistentRaidConfig();
    closeRaidConfigModal();
  });
}

function closeNightQueueModal() {
  document.getElementById('ds-night-config-backdrop')?.remove();
}

function buildNightBuildingOptions(selectedKey) {
  return NIGHT_BUILDINGS.map(building => `
    <option value="${building.key}" ${building.key === selectedKey ? 'selected' : ''}>${building.label}</option>
  `).join('');
}

function buildNightQueueRows(queue) {
  const normalized = normalizeNightQueue(queue);
  return normalized.map((entry, index) => `
    <tr data-night-row="1">
      <td>${index + 1}</td>
      <td>
        <select data-night-building="1">
          ${buildNightBuildingOptions(entry.building)}
        </select>
      </td>
      <td>
        <input type="number" min="1" step="1" data-night-level="1" value="${entry.level}">
      </td>
      <td>
        <button type="button" data-action="moveNightRowUp" ${index === 0 ? 'disabled' : ''}>Hoch</button>
        <button type="button" data-action="moveNightRowDown" ${index === normalized.length - 1 ? 'disabled' : ''}>Runter</button>
        <button type="button" data-action="deleteNightRow">Loeschen</button>
      </td>
    </tr>
  `).join('');
}

function readNightQueueFromModal(modal) {
  return Array.from(modal.querySelectorAll('[data-night-row="1"]'))
    .map(row => ({
      building: row.querySelector('[data-night-building="1"]')?.value,
      level: row.querySelector('[data-night-level="1"]')?.value
    }));
}

function renderNightQueueModalRows(modal, queue) {
  const tbody = modal.querySelector('[data-night-rows="1"]');
  if (!tbody) return;

  const normalized = normalizeNightQueue(queue);
  tbody.innerHTML = buildNightQueueRows(normalized);
  modal.querySelector('[data-night-empty="1"]').style.display = normalized.length ? 'none' : 'block';
}

function openNightQueueModal() {
  closeNightQueueModal();

  const backdrop = document.createElement('div');
  backdrop.id = 'ds-night-config-backdrop';
  backdrop.innerHTML = `
    <div id="ds-night-config-modal" role="dialog" aria-modal="true">
      <div class="ds-modal-head">
        <div class="ds-modal-title">Nacht-Zielbild</div>
        <button type="button" data-action="closeNightQueue">Schliessen</button>
      </div>
      <div class="ds-modal-body">
        <div data-night-empty="1" style="display: ${nightQueue.length ? 'none' : 'block'}; margin-bottom: 8px; color: #6f5635;">
          Kein Zielbild gespeichert.
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Gebaeude</th>
              <th>Ziellevel</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody data-night-rows="1">
            ${buildNightQueueRows(nightQueue)}
          </tbody>
        </table>
        <button type="button" data-action="addNightRow" style="margin-top: 8px;">Gebaeude hinzufuegen</button>
      </div>
      <div class="ds-modal-actions">
        <button type="button" data-action="resetNightQueue">Zuruecksetzen</button>
        <div>
          <button type="button" data-action="cancelNightQueue">Abbrechen</button>
          <button type="button" data-action="saveNightQueue">Speichern</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  const modal = backdrop.querySelector('#ds-night-config-modal');

  const rerender = queue => renderNightQueueModalRows(modal, queue);
  const currentQueue = () => readNightQueueFromModal(modal);

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) closeNightQueueModal();
  });
  modal.querySelector('[data-action="closeNightQueue"]').addEventListener('click', closeNightQueueModal);
  modal.querySelector('[data-action="cancelNightQueue"]').addEventListener('click', closeNightQueueModal);
  modal.querySelector('[data-action="saveNightQueue"]').addEventListener('click', () => {
    savePersistentNightQueue(currentQueue());
    closeNightQueueModal();
  });
  modal.querySelector('[data-action="resetNightQueue"]').addEventListener('click', () => {
    resetPersistentNightQueue();
    closeNightQueueModal();
  });
  modal.querySelector('[data-action="addNightRow"]').addEventListener('click', () => {
    rerender([...currentQueue(), { building: NIGHT_BUILDINGS[0].key, level: 1 }]);
  });
  modal.addEventListener('click', event => {
    const action = event.target?.dataset?.action;
    if (!action) return;

    const row = event.target.closest('[data-night-row="1"]');
    if (!row) return;

    const rows = Array.from(modal.querySelectorAll('[data-night-row="1"]'));
    const index = rows.indexOf(row);
    const queue = normalizeNightQueue(currentQueue());

    if (action === 'deleteNightRow') {
      queue.splice(index, 1);
      rerender(queue);
    }
    if (action === 'moveNightRowUp' && index > 0) {
      [queue[index - 1], queue[index]] = [queue[index], queue[index - 1]];
      rerender(queue);
    }
    if (action === 'moveNightRowDown' && index < queue.length - 1) {
      [queue[index + 1], queue[index]] = [queue[index], queue[index + 1]];
      rerender(queue);
    }
  });
}

function setBannerField(name, value) {
  const node = document.querySelector(`#ds-status-banner [data-field="${name}"]`);
  if (node) node.textContent = value;
}

function updateRaidActionButtons() {
  const banner = document.getElementById('ds-status-banner');
  if (!banner) return;

  const startButton = banner.querySelector('[data-action="startRaidAuto"]');
  const stopButton = banner.querySelector('[data-action="stopRaidAuto"]');
  const active = isRaidAutomationActive();

  if (startButton) startButton.disabled = active || BOT_PROTECTION_TRIGGERED;
  if (stopButton) stopButton.disabled = !active;
}

function updateStatusBanner() {
  const nextReadyAt = getStoredNextRaidReadyAt() || (isScavengePage() ? readNextRaidReadyAt() : null);
  const nextSwitchAt = Number(localStorage.getItem(RAID_NEXT_SWITCH_KEY)) || null;
  const raidStatus = BOT_PROTECTION_TRIGGERED ? 'gestoppt' : (RAID_RUNNING ? 'laeuft' : (isRaidAutomationActive() ? 'auto an' : 'auto aus'));

  setBannerField('page', getCurrentScriptPageName());
  setBannerField('raidStatus', raidStatus);
  setBannerField('raidReady', formatRaidReadySummary(nextReadyAt));
  setBannerField('raidSwitch', nextSwitchAt ? `${formatClock(nextSwitchAt)} (${formatDuration(nextSwitchAt - Date.now())})` : '-');
  setBannerField('nightStatus', getNightModeStatus());
  setBannerField('botStatus', BOT_PROTECTION_TRIGGERED ? 'erkannt' : 'ok');
  updateNightPlanDisplays();
  updateRaidActionButtons();
}

// ── Alarm-Ton ─────────────────────────────────────────────────
function playAlertSound() {
  if (!ALERT_SOUND_ENABLED) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    beep(880, 0.0, 0.3);
    beep(660, 0.35, 0.3);
    beep(440, 0.70, 0.5);
  } catch (e) {
    console.warn('⚠️ Ton konnte nicht abgespielt werden:', e);
  }
}

// ── Bot-Schutz erkennen ────────────────────────────────────────
function isBotProtectionActive() {
  if (document.querySelector('#captcha, .captcha, img[src*="captcha"], img[src*="botcheck"]')) return true;
  const botProtection = document.querySelector('#botprotection_quest');
  if (botProtection) {
    const style = window.getComputedStyle(botProtection);
    if (style.display !== 'none' && style.visibility !== 'hidden') return true;
  }
  const bodyText = document.body?.innerText || '';
  if (/du bist ein bot|bot.{0,30}schutz|captcha|bitte bestätige|are you human/i.test(bodyText)) return true;
  return false;
}

// ── Bot-Schutz auslösen ────────────────────────────────────────
function triggerBotProtectionStop() {
  if (BOT_PROTECTION_TRIGGERED) return;
  BOT_PROTECTION_TRIGGERED = true;
  sessionStorage.removeItem(STORAGE_KEY); // Kein weiterer Reload
  playAlertSound();
  console.warn(
    '%c🛑 BOT-SCHUTZ ERKANNT – Nacht-Ausbau gestoppt!\n' +
    'Bitte den Bot-Schutz manuell lösen und die Seite neu laden.',
    'color: red; font-size: 14px; font-weight: bold'
  );
}

// ── Hintergrund-Überwachung ────────────────────────────────────
function startBotProtectionWatcher() {
  const interval = setInterval(() => {
    if (BOT_PROTECTION_TRIGGERED) { clearInterval(interval); return; }
    if (isBotProtectionActive()) {
      triggerBotProtectionStop();
      clearInterval(interval);
    }
  }, 5000);
}

function isScavengePage() {
  return location.href.includes('screen=place') && location.href.includes('mode=scavenge');
}

function isBuildingsOverviewPage() {
  return location.href.includes('screen=overview_villages') && location.href.includes('mode=buildings');
}

function getCurrentVillageId() {
  return new URLSearchParams(location.search).get('village');
}

function buildGameUrl(screen, mode) {
  const params = new URLSearchParams(location.search);
  const villageId = getCurrentVillageId();
  if (villageId) params.set('village', villageId);
  params.set('screen', screen);
  if (mode) params.set('mode', mode);
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function getBuildingsUrl() {
  return buildGameUrl('overview_villages', 'buildings');
}

function getScavengeUrl() {
  return buildGameUrl('place', 'scavenge');
}

function parseCountdownMs(text) {
  const match = (text || '').match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = match[3] === undefined ? null : Number(match[3]);
  if (third === null) return ((first * 60) + second) * 1000;
  return (((first * 60 * 60) + (second * 60) + third) * 1000);
}

function getElementEndTime(element) {
  const dataValue = element.getAttribute('data-endtime') ||
    element.getAttribute('data-end-time') ||
    element.dataset?.endtime ||
    element.dataset?.endTime;

  if (dataValue) {
    const numeric = Number(dataValue);
    if (Number.isFinite(numeric)) {
      const timestamp = numeric < 10000000000 ? numeric * 1000 : numeric;
      if (timestamp > Date.now()) return timestamp;
    }
  }

  const countdownMs = parseCountdownMs(element.textContent);
  return countdownMs ? Date.now() + countdownMs : null;
}

function readNextRaidReadyAt() {
  const timestamps = Object.values(readRaidReadyTimes())
    .filter(timestamp => timestamp && timestamp > Date.now());

  return timestamps.length > 0 ? Math.min(...timestamps) : null;
}

function readRaidReadyTimes() {
  const result = {};
  getRaidOptions().forEach(({ option, index }) => {
    const countdownElements = Array.from(option.querySelectorAll(
      '.return-countdown,' +
      '.timer,' +
      '[data-endtime],' +
      '[data-end-time]'
    ));
    const timestamps = countdownElements
      .map(getElementEndTime)
      .filter(timestamp => timestamp && timestamp > Date.now());

    if (timestamps.length > 0) result[index] = Math.min(...timestamps);
  });
  return result;
}

function storeNextRaidReadyAt() {
  const readyTimes = readRaidReadyTimes();
  const nextReadyAt = Object.values(readyTimes)
    .filter(timestamp => timestamp && timestamp > Date.now())
    .sort((a, b) => a - b)[0] || null;

  if (!nextReadyAt) {
    localStorage.removeItem(RAID_NEXT_READY_KEY);
    localStorage.removeItem(RAID_READY_TIMES_KEY);
    localStorage.removeItem(RAID_NEXT_SWITCH_KEY);
    console.log('Keinen Raubzug-Countdown gefunden.');
    updateStatusBanner();
    return null;
  }

  localStorage.setItem(RAID_READY_TIMES_KEY, JSON.stringify(readyTimes));
  localStorage.setItem(RAID_NEXT_READY_KEY, String(nextReadyAt));
  const readyTime = new Date(nextReadyAt).toLocaleTimeString('de-DE');
  console.log(`Naechster Raubzug-Slot ist ca. um ${readyTime} fertig.`);
  updateStatusBanner();
  return nextReadyAt;
}

function getStoredRaidReadyTimes() {
  try {
    const raw = localStorage.getItem(RAID_READY_TIMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([index, timestamp]) => [index, Number(timestamp)])
        .filter(([, timestamp]) => Number.isFinite(timestamp) && timestamp > Date.now())
    );
  } catch (e) {
    return {};
  }
}

function getStoredNextRaidReadyAt() {
  const readyTimes = Object.values(getStoredRaidReadyTimes());
  if (readyTimes.length > 0) return Math.min(...readyTimes);

  const value = Number(localStorage.getItem(RAID_NEXT_READY_KEY));
  return Number.isFinite(value) && value > Date.now() ? value : null;
}

function formatRaidReadySummary(fallbackTimestamp) {
  const readyTimes = getStoredRaidReadyTimes();
  if (Object.keys(readyTimes).length === 0 && isScavengePage()) {
    Object.assign(readyTimes, readRaidReadyTimes());
  }

  const entries = Object.entries(readyTimes)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  if (entries.length === 0) {
    return fallbackTimestamp ? `naechster: ${formatDuration(fallbackTimestamp - Date.now())}` : '-';
  }

  return entries
    .map(([index, timestamp]) => `${index}: ${formatDuration(timestamp - Date.now())}`)
    .join('\n');
}

function scheduleRaidPageSwitch() {
  if (!RAID_CONFIG.switchPages || !isRaidAutomationActive() || !isBuildingsOverviewPage()) return;

  const nextReadyAt = getStoredNextRaidReadyAt();
  if (!nextReadyAt) return;

  const bufferMs = random(RAID_CONFIG.nextRaidBufferMin, RAID_CONFIG.nextRaidBufferMax);
  const waitMs = Math.max(0, nextReadyAt - Date.now() + bufferMs);
  const switchAt = Date.now() + waitMs;
  const switchTime = new Date(switchAt).toLocaleTimeString('de-DE');
  localStorage.setItem(RAID_NEXT_SWITCH_KEY, String(switchAt));
  updateStatusBanner();
  console.log(`Raubzug-Wechsel geplant um ${switchTime}.`);

  setTimeout(() => {
    if (!isRaidAutomationActive()) return;
    if (BOT_PROTECTION_TRIGGERED) return;
    localStorage.removeItem(RAID_NEXT_READY_KEY);
    localStorage.removeItem(RAID_READY_TIMES_KEY);
    localStorage.removeItem(RAID_NEXT_SWITCH_KEY);
    window.location.href = getScavengeUrl();
  }, waitMs);
}

async function returnToBuildingsOverview() {
  if (!RAID_CONFIG.switchPages || !RAID_CONFIG.returnToBuildings || !isRaidAutomationActive() || !isScavengePage()) return;
  await Sleep(random(RAID_CONFIG.returnDelayMin, RAID_CONFIG.returnDelayMax));
  if (BOT_PROTECTION_TRIGGERED) return;
  window.location.href = getBuildingsUrl();
}

function getRaidOptionIndex(option, fallbackIndex) {
  const match = option.id?.match(/(\d+)/) || option.className?.match(/option-(\d+)/);
  return match ? Number(match[1]) : fallbackIndex + 1;
}

function getRaidOptions() {
  return Array
    .from(document.querySelectorAll('.scavenge-option'))
    .map((option, index) => ({ option, index: getRaidOptionIndex(option, index) }))
    .filter(({ index }) => RAID_CONFIG.enabledOptions.includes(index) && getRaidConfig(index)?.enabled !== false);
}

function getFreeRaidOptions() {
  return getRaidOptions()
    .filter(({ option }) => getRaidSendButton(option));
}

function getRaidSendButton(option) {
  const button = option.querySelector(
    '.free_send_button:not(.btn-disabled):not(.disabled),' +
    '[data-action="send"]:not(.btn-disabled):not(.disabled)'
  );
  if (button) return button;

  return Array.from(option.querySelectorAll('a.btn, button.btn, input[type="submit"]'))
    .find(candidate => /start/i.test(candidate.textContent || candidate.value || '') && !/freischalten/i.test(candidate.textContent || candidate.value || ''));
}

function getRaidConfig(index) {
  return RAID_CONFIG.raids?.[index] || null;
}

function getRaidUnitInputs(scope = document) {
  const inputs = {};
  RAID_UNITS.forEach(unit => {
    inputs[unit] = scope.querySelector(
      `input[name="${unit}"],` +
      `input[data-unit="${unit}"],` +
      `input.unitsInput[name="${unit}"],` +
      `.unit-item-${unit} input`
    );
  });
  return inputs;
}

function getScopedOrGlobalRaidUnitInputs(option) {
  const scopedInputs = getRaidUnitInputs(option);
  const hasScopedInput = Object.values(scopedInputs).some(Boolean);
  if (hasScopedInput) return scopedInputs;

  return getRaidUnitInputs(document.querySelector('#scavenge_screen') || document);
}

function readRaidUnitCountFromTable(input) {
  const cell = input.closest('td');
  const row = input.closest('tr');
  if (!cell || !row || cell.cellIndex < 0) return 0;

  const countRow = row.nextElementSibling;
  const countCell = countRow?.children?.[cell.cellIndex];
  const countText = countCell?.textContent || '';
  const match = countText.match(/\((\d+)\)/) || countText.match(/\d+/);
  return match ? Number(match[1] || match[0]) : 0;
}

function readAvailableRaidUnits() {
  const result = {};
  const unitInputs = getRaidUnitInputs();
  RAID_UNITS.forEach(unit => {
    const input = unitInputs[unit] || document.querySelector(`#units_home input[name="${unit}"], #units_home input[data-unit="${unit}"], input.unitsInput[name="${unit}"]`);
    const countNode = document.querySelector(`#units_home .unit-item-${unit}, #units_home [data-unit="${unit}"], .unit-item-${unit}`);
    const fromInput = input ? Number(input.getAttribute('data-all-count') || input.dataset.allCount || 0) : 0;
    const fromTable = input ? readRaidUnitCountFromTable(input) : 0;
    const fromText = countNode ? Number((countNode.textContent || '').replace(/\D+/g, '')) : 0;
    const fromScavengeData = Number(
      window.ScavengeScreen?.village?.unit_counts_home?.[unit] ||
      window.ScavengingOverview?.village_data?.[getCurrentVillageId()]?.unit_counts_home?.[unit] ||
      0
    );
    result[unit] = Math.max(fromInput || 0, fromTable || 0, fromText || 0, fromScavengeData || 0);
  });
  return result;
}

function setRaidInputValue(input, value) {
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

async function waitForFreeRaidOptions() {
  let options = getFreeRaidOptions();
  const attempts = 10;

  for (let i = 0; i < attempts && options.length === 0; i++) {
    await Sleep(500);
    options = getFreeRaidOptions();
  }

  return options;
}

function clearRaidOptionInputs(option) {
  const unitInputs = getScopedOrGlobalRaidUnitInputs(option);
  Object.values(unitInputs).forEach(input => {
    if (input) setRaidInputValue(input, 0);
  });
}

function getConfiguredRaidUnits(index, availableUnits) {
  const config = getRaidConfig(index);
  if (!config || config.enabled === false) return null;

  const result = {};
  RAID_UNITS.forEach(unit => {
    const requested = Math.max(0, Number(config.units?.[unit] || 0));
    const reserve = Math.max(0, Number(RAID_CONFIG.reserve?.[unit] || 0));
    const available = Math.max(0, Number(availableUnits[unit] || 0) - reserve);
    result[unit] = Math.min(requested, available);
  });

  const total = Object.values(result).reduce((sum, value) => sum + value, 0);
  return total >= RAID_CONFIG.minUnitsPerRaid ? result : null;
}

function applyRaidUnitsToOption(option, units) {
  const unitInputs = getScopedOrGlobalRaidUnitInputs(option);
  let total = 0;

  RAID_UNITS.forEach(unit => {
    const value = Math.max(0, Number(units[unit] || 0));
    if (unitInputs[unit]) {
      setRaidInputValue(unitInputs[unit], value);
      total += value;
    }
  });

  return total;
}

function subtractRaidUnits(availableUnits, units) {
  RAID_UNITS.forEach(unit => {
    availableUnits[unit] = Math.max(0, Number(availableUnits[unit] || 0) - Number(units[unit] || 0));
  });
}

function formatRaidUnits(units) {
  return RAID_UNITS
    .filter(unit => Number(units[unit] || 0) > 0)
    .map(unit => `${unit}:${units[unit]}`)
    .join(', ');
}

function insertRaidPanel() {
  if (!RAID_CONFIG.enabled || !isScavengePage() || document.getElementById('ds-raid-panel')) return;

  const target = document.querySelector('#content_value') || document.body;
  const panel = document.createElement('div');
  panel.id = 'ds-raid-panel';
  panel.className = 'vis';
  panel.style.margin = '10px 0';
  panel.style.padding = '8px';
  panel.innerHTML = `
    <strong>Raubzuege</strong>
    <button type="button" id="ds-start-raids" class="btn" style="margin-left: 8px;">Raubzuege starten</button>
    <span id="ds-raid-status" style="margin-left: 8px; color: #666;"></span>
    <div style="margin-top: 6px; color: #666;">Plan: <span data-field="raidPlan">${buildRaidPlanText()}</span></div>
  `;
  target.prepend(panel);

  document.getElementById('ds-start-raids').addEventListener('click', () => {
    startScavengingRaids();
  });
}

async function startScavengingRaids() {
  if (!RAID_CONFIG.enabled || !isScavengePage()) return;
  if (RAID_RUNNING) return;
  if (BOT_PROTECTION_TRIGGERED) return;
  if (isBotProtectionActive()) { triggerBotProtectionStop(); return; }

  RAID_RUNNING = true;
  updateStatusBanner();
  try {
    startBotProtectionWatcher();

    const status = document.getElementById('ds-raid-status');
    const setStatus = text => {
      if (status) status.textContent = text;
      console.log(text);
    };

    let options = await waitForFreeRaidOptions();

    if (options.length === 0) {
      setStatus('Keine freien Raubzug-Slots gefunden, pruefe gleich erneut ...');
      await Sleep(random(RAID_CONFIG.idleCheckDelayMin, RAID_CONFIG.idleCheckDelayMax));
      options = await waitForFreeRaidOptions();
    }

    if (options.length === 0) {
      setStatus('Keine freien Raubzug-Slots gefunden.');
      storeNextRaidReadyAt();
      await returnToBuildingsOverview();
      return;
    }

    let sent = 0;
    const availableUnits = readAvailableRaidUnits();

    for (let i = 0; i < options.length; i++) {
      if (BOT_PROTECTION_TRIGGERED) return;

      const { option, index } = options[i];
      const raidUnits = getConfiguredRaidUnits(index, availableUnits);
      if (!raidUnits) {
        setStatus(`Raubzug ${index}: zu wenig konfigurierte Truppen verfuegbar.`);
        continue;
      }

      clearRaidOptionInputs(option);
      await Sleep(random(RAID_CONFIG.actionDelayMin, RAID_CONFIG.actionDelayMax));

      const totalUnits = applyRaidUnitsToOption(option, raidUnits);
      if (totalUnits < RAID_CONFIG.minUnitsPerRaid) {
        setStatus(`Raubzug ${index}: keine passenden Eingabefelder gefunden.`);
        continue;
      }

      const sendButton = getRaidSendButton(option);
      if (!sendButton) continue;

      setStatus(`Raubzug ${index}: starte mit ${formatRaidUnits(raidUnits)} ...`);
      await Sleep(random(RAID_CONFIG.actionDelayMin, RAID_CONFIG.actionDelayMax));
      if (BOT_PROTECTION_TRIGGERED) return;

      sendButton.click();
      sent++;
      subtractRaidUnits(availableUnits, raidUnits);

      await Sleep(random(RAID_CONFIG.sendDelayMin, RAID_CONFIG.sendDelayMax));
    }

    setStatus(sent > 0 ? `${sent} Raubzug/Raubzuege gestartet.` : 'Keine Raubzuege gestartet.');
    storeNextRaidReadyAt();
    await returnToBuildingsOverview();
  } finally {
    RAID_RUNNING = false;
    updateStatusBanner();
  }
}

// ── Hauptfunktion ──────────────────────────────────────────────
async function startNightBuilding() {

  if (!location.href.includes('screen=overview_villages') || !location.href.includes('mode=buildings')) return;

  // Sofort-Check
  if (isBotProtectionActive()) { triggerBotProtectionStop(); return; }

  // Queue leer?
  if (!nightQueue || nightQueue.length === 0) {
    console.log('%c✅ Nacht-Warteschlange ist leer – nichts zu tun.', 'color: gray');
    return;
  }

  const isAutoReload = sessionStorage.getItem(STORAGE_KEY) === '1';
  sessionStorage.removeItem(STORAGE_KEY);

  if (isAutoReload) {
    console.log('%c🔄 Seite neu geladen – setze Nacht-Ausbau fort …', 'color: #FF9800; font-weight: bold');
  } else {
    console.log('%c🌙 Nacht-Ausbau gestartet …', 'color: #7C4DFF; font-weight: bold');
    console.log(`📋 ${nightQueue.length} Einträge in der Warteschlange`);
  }

  startBotProtectionWatcher();

  document.getElementById('get_all_possible_build').click();
  await Sleep(random(1500, 2500));
  if (BOT_PROTECTION_TRIGGERED) return;

  let table = document.getElementById('villages');
  let rows = table.querySelectorAll(':scope > tr');
  let queueFinished = true; // Wird false wenn noch was zu bauen ist

  for (let i = 0; i < rows.length; i++) {
    if (BOT_PROTECTION_TRIGGERED) return;

    let row = rows[i];
    let lastCell = row.querySelector(':scope > td:last-child');
    let currentQueueCount = lastCell.querySelector(':scope > ul')?.children.length || 0;

    for (let j = 0; j < nightQueue.length; j++) {
      if (BOT_PROTECTION_TRIGGERED) return;
      if (currentQueueCount >= 5) break;

      let targetBuilding = nightQueue[j].building; 
      let targetLevel    = nightQueue[j].level;

      let cell = row.querySelector(`:scope > .b_${targetBuilding}`);
      if (!cell) continue;

      let currentLevel = +cell.textContent;

      // Bereits in der Bau-Warteschlange berücksichtigen
      let queueIcons = lastCell.querySelectorAll('.queue_icon');
      for (let y = 0; y < queueIcons.length; y++) {
        let img = queueIcons[y].firstElementChild;
        if (img && img.src.indexOf(targetBuilding) > 0) currentLevel++;
      }

      if (currentLevel >= targetLevel) continue;

      // Noch was zu bauen → Queue noch nicht fertig
      queueFinished = false;

      let btn = cell.querySelector(':scope > a');
      if (cell.childElementCount === 0 || !btn) break;

      btn.click();
      currentQueueCount++;
      console.log(`🔨 ${targetBuilding} → Level ${targetLevel} (aktuell ${currentLevel})`);

      await Sleep(random(CLICK_DELAY_MIN, CLICK_DELAY_MAX));
      if (BOT_PROTECTION_TRIGGERED) return;
    }
  }

  if (BOT_PROTECTION_TRIGGERED) return;

  if (queueFinished) {
    // Alles fertig gebaut – stoppen
    console.log(
      '%c✅ Nacht-Warteschlange vollständig abgearbeitet – Skript stoppt.',
      'color: #4CAF50; font-size: 14px; font-weight: bold'
    );
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  // Noch nicht fertig → warten und Seite neu laden
  const waitMs = random(RELOAD_WAIT_MIN, RELOAD_WAIT_MAX);
  const nextRun = new Date(Date.now() + waitMs).toLocaleTimeString('de-DE');
  console.log(`⏳ Nächste Prüfung um ${nextRun} – warte ${Math.round(waitMs / 1000)} Sekunden …`);

  sessionStorage.setItem(STORAGE_KEY, '1');
  await Sleep(waitMs);

  if (BOT_PROTECTION_TRIGGERED) return;

  console.log('%c🔄 Lade Seite neu …', 'color: #FF9800');
  window.location.reload();
}

(function () {
  'use strict';
  loadPersistentRaidConfig();
  loadPersistentNightQueue();
  initStatusBanner();
  insertRaidPanel();
  scheduleRaidPageSwitch();
  if (RAID_CONFIG.autoStart && isRaidAutomationActive()) startScavengingRaids();
  startNightBuilding();
})();
