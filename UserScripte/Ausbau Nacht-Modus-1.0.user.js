// ==UserScript==
// @name         Ausbau Nacht-Modus
// @namespace    http://tampermonkey.net/
// @version      1.23
// @description  Baut die Nacht-Warteschlange ab (ueberspringt nicht baubare Gebaeude). Sofortiger Stop bei Bot-Schutz. Raubzug liest vor dem Lauf Kaserne und Stall aus, Auto-Truppen-Schalter, Verteilung ueber ALLE aktiven Slots, Start von jeder Seite aus.
// @author       kk
// @match        https://*.die-staemme.de/game.php*
// @match        https://die-staemme.de/game.php*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/UserScripte/Ausbau%20Nacht-Modus-1.0.user.js
// @downloadURL  https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/UserScripte/Ausbau%20Nacht-Modus-1.0.user.js
// ==/UserScript==

const nightQueue = [];

const CLICK_DELAY_MIN  = 3000;  // Mindestwartezeit zwischen Klicks (ms)
const CLICK_DELAY_MAX  = 5000;  // Maximalwartezeit zwischen Klicks (ms)
const RELOAD_WAIT_MIN  = 2 * 60 * 1000;  // Mindestwartezeit zwischen Prüfungen (ms)
const RELOAD_WAIT_MAX  = 2 * 60 * 1000 + 30 * 1000;  // Maximalwartezeit (ms)
const ALERT_SOUND_ENABLED = true;

const RAID_CONFIG = {
  enabled: true,
  autoStart: true,
  switchPages: true,
  returnToBuildings: true,
  limitToHomeUnits: true,   // Sicherheitsnetz: nie mehr senden, als gerade zuhause steht
  readStableUnits: true,    // vor dem Raubzug auch den Stall (LKav/ber.Bogen/SKav) auslesen
  enabledOptions: [1, 2, 3, 4],
  distributionMode: 'optimizedEqual',
  maxRaidDurationHours: 0,
  maxRaidDurationMinutes: 0,
  minUnitsPerRaid: 1,
  actionDelayMin: 100,
  actionDelayMax: 3000,
  sendDelayMin: 2500,
  sendDelayMax: 4500,
  returnDelayMin: 1500,
  returnDelayMax: 4000,
  idleCheckDelayMin: 1200,
  idleCheckDelayMax: 2500,
  preRaidReadDelayMin: 1200,
  preRaidReadDelayMax: 2500,
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
const RECRUIT_CONFIG = {
  enabled: true,
  cooldownMs: 30000,
  units: {
    spear: 0,
    sword: 0,
    axe: 0,
    archer: 0
  }
};
let BOT_PROTECTION_TRIGGERED = false;
let RAID_RUNNING = false;
const STORAGE_KEY = 'ds_nacht_autostart';
const RAID_NEXT_READY_KEY = 'ds_raid_next_ready_at';
const RAID_READY_TIMES_KEY = 'ds_raid_ready_times';
const RAID_NEXT_SWITCH_KEY = 'ds_raid_next_switch_at';
const RAID_AUTO_ACTIVE_KEY = 'ds_raid_auto_active';
const RAID_AUTOCALC_KEY = 'ds_raid_autocalc_v1';
const RAID_PREFETCH_UNITS_KEY = 'ds_raid_prefetch_units_pending';
const RAID_CONFIG_STORAGE_KEY = 'ds_raid_config_v1';
const RAID_STORED_UNITS_KEY = 'ds_raid_stored_units_v1';
const RECRUIT_CONFIG_STORAGE_KEY = 'ds_recruit_config_v1';
const RECRUIT_LAST_ACTION_KEY = 'ds_recruit_last_action_at';
const NIGHT_QUEUE_STORAGE_KEY = 'ds_night_queue_v1';
const NIGHT_CURRENT_LEVELS_STORAGE_KEY = 'ds_night_current_levels_v1';
const NIGHT_UPGRADE_INFO_STORAGE_KEY = 'ds_night_upgrade_info_v1';
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
const RAID_UNIT_SEARCH_LABELS = {
  spear: ['Speertraeger', 'Speertr\u00e4ger'],
  sword: ['Schwertkaempfer', 'Schwertk\u00e4mpfer'],
  axe: ['Axtkaempfer', 'Axtk\u00e4mpfer'],
  archer: ['Bogenschuetze', 'Bogensch\u00fctze'],
  light: ['Leichte Kavallerie'],
  marcher: ['Berittener Bogenschuetze', 'Berittener Bogensch\u00fctze'],
  heavy: ['Schwere Kavallerie']
};
const RAID_UNIT_CARRY = {
  spear: 25,
  sword: 15,
  axe: 10,
  archer: 10,
  light: 80,
  marcher: 50,
  heavy: 50
};
const RAID_SLOT_RATIOS = {
  1: 0.10,
  2: 0.25,
  3: 0.50,
  4: 0.75
};
const RAID_DISTRIBUTION_LABELS = {
  manual: 'manuell',
  optimizedEqual: 'gleich lang',
  optimizedRun: 'pro Lauf',
  optimizedHour: 'pro Stunde'
};
const RAID_RECRUIT_UNITS_BY_SCREEN = {
  barracks: ['spear', 'sword', 'axe', 'archer'],
  stable: ['light', 'marcher', 'heavy']
};
const BARRACKS_RECRUIT_UNITS = ['spear', 'sword', 'axe', 'archer'];
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
  if (isMainBuildingPage()) return 'Hauptgebaeude';
  if (getCurrentScreen() === 'barracks') return 'Kaserne';
  if (getCurrentScreen() === 'stable') return 'Stall';
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

// NEU: Auto-Truppen-Schalter. AN = Script rechnet selbst (ignoriert die Slot-Truppen
// aus der Konfig). AUS = es sendet die konfigurierten Slot-Truppen (manuell).
function isRaidAutoCalcActive() {
  const raw = localStorage.getItem(RAID_AUTOCALC_KEY);
  return raw === null ? true : raw === '1';   // Standard: an
}

function setRaidAutoCalc(active) {
  localStorage.setItem(RAID_AUTOCALC_KEY, active ? '1' : '0');
  updateStatusBanner();
  updateRaidPlanDisplays();
}

function toggleRaidAutoCalc() {
  setRaidAutoCalc(!isRaidAutoCalcActive());
}

// Effektiver Verteilmodus: Auto-Truppen AN -> optimiert (Flavor aus der Konfig,
// sonst "gleich lang"); Auto-Truppen AUS -> manuell (konfigurierte Truppen pro Slot).
function getEffectiveDistributionMode() {
  if (!isRaidAutoCalcActive()) return 'manual';
  return RAID_CONFIG.distributionMode === 'manual' ? 'optimizedEqual' : RAID_CONFIG.distributionMode;
}

function normalizeRaidConfig(config) {
  const normalized = {
    distributionMode: ['manual', 'optimizedEqual', 'optimizedRun', 'optimizedHour'].includes(config?.distributionMode)
      ? config.distributionMode
      : 'optimizedEqual',
    maxRaidDurationHours: Math.max(0, Math.floor(Number(config?.maxRaidDurationHours || 0))),
    maxRaidDurationMinutes: Math.max(0, Math.floor(Number(config?.maxRaidDurationMinutes || 0))),
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
  RAID_CONFIG.distributionMode = normalized.distributionMode;
  RAID_CONFIG.maxRaidDurationHours = normalized.maxRaidDurationHours;
  RAID_CONFIG.maxRaidDurationMinutes = normalized.maxRaidDurationMinutes;
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

function normalizeRecruitConfig(config) {
  const normalized = {
    enabled: config?.enabled !== false,
    units: {}
  };

  BARRACKS_RECRUIT_UNITS.forEach(unit => {
    normalized.units[unit] = Math.max(0, Math.floor(Number(config?.units?.[unit] || 0)));
  });

  return normalized;
}

function applyRecruitConfigSnapshot(snapshot) {
  const normalized = normalizeRecruitConfig(snapshot);
  RECRUIT_CONFIG.enabled = normalized.enabled;
  RECRUIT_CONFIG.units = normalized.units;
}

function getRecruitConfigSnapshot() {
  return normalizeRecruitConfig(RECRUIT_CONFIG);
}

function loadPersistentRecruitConfig() {
  try {
    const raw = localStorage.getItem(RECRUIT_CONFIG_STORAGE_KEY);
    if (!raw) return;
    applyRecruitConfigSnapshot(JSON.parse(raw));
  } catch (e) {
    console.warn('Rekrutierungs-Konfiguration konnte nicht geladen werden:', e);
  }
}

function savePersistentRecruitConfig(snapshot) {
  const normalized = normalizeRecruitConfig(snapshot);
  localStorage.setItem(RECRUIT_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  applyRecruitConfigSnapshot(normalized);
}

function resetPersistentRecruitConfig() {
  localStorage.removeItem(RECRUIT_CONFIG_STORAGE_KEY);
  applyRecruitConfigSnapshot({
    enabled: true,
    units: {}
  });
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
  const currentLevels = readStoredNightCurrentLevels();
  return NIGHT_BUILDINGS.map(building => ({
    building: building.key,
    level: Math.max(1, Number(currentLevels[building.key] || 1))
  }));
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
  const currentLevels = readStoredNightCurrentLevels();
  const normalized = normalizeNightQueue(snapshot)
    .map(entry => ({
      building: entry.building,
      level: Math.max(entry.level, Number(currentLevels[entry.building] || 1))
    }));
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
  const currentLevels = readStoredNightCurrentLevels();
  return nightQueue
    .map(entry => ({
      building: entry.building,
      currentLevel: Number(currentLevels[entry.building] || 0),
      targetLevel: Number(entry.level || 0)
    }))
    .filter(entry => entry.currentLevel > 0 && entry.targetLevel > entry.currentLevel)
    .map(entry => `${getNightBuildingLabel(entry.building)} ${entry.currentLevel} -> ${entry.targetLevel}`)
    .join(' | ') || 'keine Upgrades offen';
}

function updateNightPlanDisplays() {
  const planText = buildNightPlanText();
  document.querySelectorAll('[data-field="nightPlan"]').forEach(node => {
    node.textContent = planText;
  });
}

function readStoredNightCurrentLevels() {
  try {
    const raw = localStorage.getItem(NIGHT_CURRENT_LEVELS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([building, level]) => [building, Math.max(0, Math.floor(Number(level || 0)))])
        .filter(([building, level]) => NIGHT_BUILDING_KEYS.includes(building) && level > 0)
    );
  } catch (e) {
    return {};
  }
}

function saveNightCurrentLevels(levels) {
  const normalized = readStoredNightCurrentLevels();
  NIGHT_BUILDING_KEYS.forEach(building => {
    const level = Math.max(0, Math.floor(Number(levels?.[building] || 0)));
    if (level > 0) normalized[building] = level;
  });

  localStorage.setItem(NIGHT_CURRENT_LEVELS_STORAGE_KEY, JSON.stringify(normalized));
}

function readStoredNightUpgradeInfo() {
  try {
    const raw = localStorage.getItem(NIGHT_UPGRADE_INFO_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const normalized = {};

    NIGHT_BUILDING_KEYS.forEach(building => {
      const info = parsed?.[building];
      if (!info) return;

      normalized[building] = {
        wood: Math.max(0, Math.floor(Number(info.wood || 0))),
        stone: Math.max(0, Math.floor(Number(info.stone || 0))),
        iron: Math.max(0, Math.floor(Number(info.iron || 0))),
        pop: Math.max(0, Math.floor(Number(info.pop || 0))),
        buildTime: String(info.buildTime || '').trim()
      };
    });

    return normalized;
  } catch (e) {
    return {};
  }
}

function saveNightUpgradeInfo(info) {
  const normalized = readStoredNightUpgradeInfo();

  NIGHT_BUILDING_KEYS.forEach(building => {
    const entry = info?.[building];
    if (!entry) return;

    normalized[building] = {
      wood: Math.max(0, Math.floor(Number(entry.wood || 0))),
      stone: Math.max(0, Math.floor(Number(entry.stone || 0))),
      iron: Math.max(0, Math.floor(Number(entry.iron || 0))),
      pop: Math.max(0, Math.floor(Number(entry.pop || 0))),
      buildTime: String(entry.buildTime || '').trim()
    };
  });

  localStorage.setItem(NIGHT_UPGRADE_INFO_STORAGE_KEY, JSON.stringify(normalized));
}

function getStoredNightCurrentLevel(building) {
  return readStoredNightCurrentLevels()[building] || '-';
}

function getStoredNightUpgradeInfo(building) {
  return readStoredNightUpgradeInfo()[building] || null;
}

function formatNightUpgradeCost(building) {
  const info = getStoredNightUpgradeInfo(building);
  if (!info) return '-';

  const costs = [
    info.wood ? `H:${info.wood}` : '',
    info.stone ? `L:${info.stone}` : '',
    info.iron ? `E:${info.iron}` : '',
    info.pop ? `B:${info.pop}` : ''
  ].filter(Boolean);

  return costs.length ? costs.join(' ') : '-';
}

function formatNightUpgradeTime(building) {
  return getStoredNightUpgradeInfo(building)?.buildTime || '-';
}

function parseCompactNumber(text) {
  const cleaned = String(text || '').replace(/\./g, '').replace(/\s+/g, '');
  const match = cleaned.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseLevelFromText(text) {
  const match = String(text || '').match(/(?:Stufe|Level)\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function parseBuildingLevelFromText(text, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(text || '').match(new RegExp(`${escapedLabel}[\\s\\S]{0,80}?(?:Stufe|Level)\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : 0;
}

function getNightBuildingSearchLabels(building) {
  const aliases = {
    wood: ['Holzfaeller', 'Holzf\\u00e4ller'],
    main: ['Hauptgebaeude', 'Hauptgeb\\u00e4ude'],
    smith: ['Schmiede'],
    place: ['Versammlungsplatz']
  };

  return aliases[building.key] || [building.label];
}

function readCurrentNightLevelsFromMainPage() {
  const levels = {};
  const content = document.querySelector('#content_value') || document;

  NIGHT_BUILDINGS.forEach(({ key }) => {
    const selectors = [
      `#main_buildrow_${key}`,
      `#main_buildlink_${key}`,
      `[data-building="${key}"]`,
      `.building_${key}`,
      `.b_${key}`
    ];

    const node = selectors
      .map(selector => content.querySelector(selector))
      .find(Boolean);

    const text = node?.closest('tr')?.textContent || node?.textContent || '';
    const directLevel = parseLevelFromText(text);
    if (directLevel > 0) levels[key] = directLevel;
  });

  const fullText = content.textContent || '';
  NIGHT_BUILDINGS.forEach(building => {
    const { key } = building;
    if (levels[key] > 0) return;
    const level = getNightBuildingSearchLabels(building)
      .map(label => parseBuildingLevelFromText(fullText, label))
      .find(value => value > 0) || 0;
    if (level > 0) levels[key] = level;
  });

  return levels;
}

function getMainBuildingRow(buildingKey) {
  const content = document.querySelector('#content_value') || document;
  const selectors = [
    `#main_buildrow_${buildingKey}`,
    `#main_buildlink_${buildingKey}`,
    `[data-building="${buildingKey}"]`,
    `.building_${buildingKey}`,
    `.b_${buildingKey}`
  ];

  const node = selectors
    .map(selector => content.querySelector(selector))
    .find(Boolean);

  return node?.closest('tr') || node || null;
}

function readResourceValue(row, resource) {
  const selectors = [
    `.cost_${resource}`,
    `.cost-${resource}`,
    `[data-resource="${resource}"]`,
    `[class~="${resource}"]`
  ];

  const node = selectors
    .map(selector => row.querySelector(selector))
    .find(Boolean);

  return parseCompactNumber(node?.textContent || '');
}

function readBuildTimeFromRow(row) {
  const node = row.querySelector('.build_time, .build-time, .time, [data-duration], [data-build-time]');
  const fromData = node?.getAttribute('data-duration') || node?.getAttribute('data-build-time') || '';
  const dataSeconds = Number(fromData);
  if (Number.isFinite(dataSeconds) && dataSeconds > 0) return formatDuration(dataSeconds * 1000);

  const text = node?.textContent || row.textContent || '';
  const match = text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
  return match ? match[0] : '';
}

function readNightUpgradeInfoFromMainPage() {
  const info = {};

  NIGHT_BUILDING_KEYS.forEach(building => {
    const row = getMainBuildingRow(building);
    if (!row) return;

    const entry = {
      wood: readResourceValue(row, 'wood'),
      stone: readResourceValue(row, 'stone'),
      iron: readResourceValue(row, 'iron'),
      pop: readResourceValue(row, 'pop') || readResourceValue(row, 'population'),
      buildTime: readBuildTimeFromRow(row)
    };

    if (entry.wood || entry.stone || entry.iron || entry.pop || entry.buildTime) {
      info[building] = entry;
    }
  });

  return info;
}

function storeCurrentNightLevelsFromMainPage() {
  if (!isMainBuildingPage()) return;

  const levels = readCurrentNightLevelsFromMainPage();
  const upgradeInfo = readNightUpgradeInfoFromMainPage();

  if (Object.keys(levels).length > 0) saveNightCurrentLevels(levels);
  if (Object.keys(upgradeInfo).length > 0) saveNightUpgradeInfo(upgradeInfo);
}

function readCurrentNightLevelsFromBuildingsOverview() {
  const levels = {};
  const rows = Array.from(document.querySelectorAll('#villages > tr, #villages tbody > tr'));

  rows.forEach(row => {
    NIGHT_BUILDING_KEYS.forEach(building => {
      const cell = row.querySelector(`:scope > .b_${building}, .b_${building}`);
      const level = parseCompactNumber(cell?.textContent || '');
      if (level <= 0) return;

      levels[building] = levels[building] ? Math.min(levels[building], level) : level;
    });
  });

  return levels;
}

function storeCurrentNightLevelsFromBuildingsOverview() {
  if (!isBuildingsOverviewPage()) return;

  const levels = readCurrentNightLevelsFromBuildingsOverview();
  if (Object.keys(levels).length === 0) return;

  saveNightCurrentLevels(levels);
}

function startRaidAutomation() {
  localStorage.setItem(RAID_AUTO_ACTIVE_KEY, '1');
  localStorage.setItem(RAID_PREFETCH_UNITS_KEY, '1');
  updateStatusBanner();

  if (!isBarracksPage()) {
    window.location.href = getBarracksUrl();
    return;
  }

  handleRaidUnitPrefetch();
}

function stopRaidAutomation() {
  localStorage.removeItem(RAID_AUTO_ACTIVE_KEY);
  localStorage.removeItem(RAID_PREFETCH_UNITS_KEY);
  localStorage.removeItem(RAID_NEXT_READY_KEY);
  localStorage.removeItem(RAID_READY_TIMES_KEY);
  localStorage.removeItem(RAID_NEXT_SWITCH_KEY);
  updateStatusBanner();
}

// NEU: Wenn die Automatik aktiv ist, aber wir auf einer Seite stehen, die nicht
// Teil des Raubzug-Zyklus ist (Bericht, Karte, Forschung ...), ueber die
// Kaserne in den Zyklus einsteigen.
function enterRaidCycleFromAnywhere() {
  if (!isRaidAutomationActive()) return false;
  if (BOT_PROTECTION_TRIGGERED) return false;
  if (isBotProtectionActive()) { triggerBotProtectionStop(); return false; }

  // Seiten, die bereits Teil des Zyklus sind, behandeln sich selbst.
  if (isBarracksPage() || isStablePage() || isScavengePage() || isBuildingsOverviewPage()) return false;

  // Ueberall sonst: ueber die Kaserne in den Zyklus einsteigen.
  localStorage.setItem(RAID_PREFETCH_UNITS_KEY, '1');
  window.location.href = getBarracksUrl();
  return true;
}

async function handleRaidUnitPrefetch() {
  if (!isRaidAutomationActive()) return false;
  if (localStorage.getItem(RAID_PREFETCH_UNITS_KEY) !== '1') return false;
  if (!isBarracksPage() && !isStablePage()) return false;
  if (BOT_PROTECTION_TRIGGERED) return true;
  if (isBotProtectionActive()) { triggerBotProtectionStop(); return true; }

  // Reihenfolge: Kaserne -> (optional) Stall -> Raubzugseite.
  // Kaserne liest Speer/Schwert/Axt/Bogen, Stall liest LKav/ber.Bogen/SKav.
  const goToStableNext = isBarracksPage() && RAID_CONFIG.readStableUnits;

  const proceed = () => {
    if (goToStableNext) {
      window.location.href = getStableUrl();
    } else {
      localStorage.removeItem(RAID_PREFETCH_UNITS_KEY);
      window.location.href = getScavengeUrl();
    }
  };

  if (isRecruitCooldownActive()) {
    storeCurrentRaidUnitsFromRecruitPages();
    proceed();
    return true;
  }

  storeCurrentRaidUnitsFromRecruitPages();
  await Sleep(random(RAID_CONFIG.preRaidReadDelayMin, RAID_CONFIG.preRaidReadDelayMax));
  if (BOT_PROTECTION_TRIGGERED) return true;
  if (!isRaidAutomationActive()) return true;
  if (isBotProtectionActive()) { triggerBotProtectionStop(); return true; }

  storeCurrentRaidUnitsFromRecruitPages();
  proceed();
  return true;
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
    <button type="button" class="ds-config-button" data-action="toggleAutoCalc" data-field="autoCalcButton">Auto-Truppen: -</button>
    <button type="button" class="ds-config-button" data-action="configureRaids">Konfig Raubzug</button>
    <button type="button" class="ds-config-button" data-action="configureRecruitment">Konfig Rekrutierung</button>
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
    #ds-recruit-config-backdrop,
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
    #ds-recruit-config-modal,
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
    #ds-recruit-config-modal .ds-modal-head,
    #ds-recruit-config-modal .ds-modal-actions,
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
    #ds-recruit-config-modal .ds-modal-title,
    #ds-night-config-modal .ds-modal-title {
      font-weight: bold;
      font-size: 13px;
      color: #5b2d14;
    }
    #ds-raid-config-modal .ds-modal-body,
    #ds-recruit-config-modal .ds-modal-body,
    #ds-night-config-modal .ds-modal-body {
      padding: 10px;
    }
    #ds-raid-config-modal .ds-raid-config-controls,
    #ds-raid-config-modal .ds-raid-reserve-grid {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 8px;
      margin-bottom: 10px;
      padding: 8px;
      border: 1px solid #c8b894;
      background: #fffaf0;
    }
    #ds-raid-config-modal .ds-raid-config-controls label,
    #ds-raid-config-modal .ds-raid-reserve-grid label {
      display: flex;
      flex-direction: column;
      gap: 3px;
      color: #5b2d14;
      font-weight: bold;
    }
    #ds-raid-config-modal .ds-raid-config-controls select {
      min-width: 240px;
      box-sizing: border-box;
      padding: 3px;
      border: 1px solid #a58b5e;
      background: #fff;
      color: #2f2417;
      font: 12px Arial, sans-serif;
    }
    #ds-raid-config-modal .ds-raid-reserve-grid strong {
      align-self: center;
      color: #5b2d14;
    }
    #ds-raid-config-modal .ds-raid-preview {
      margin-bottom: 10px;
      padding: 8px;
      border: 1px solid #c8b894;
      background: #fffaf0;
    }
    #ds-raid-config-modal .ds-raid-preview-title {
      margin-bottom: 6px;
      color: #5b2d14;
      font-weight: bold;
    }
    #ds-raid-config-modal .ds-raid-preview-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 8px;
      line-height: 1.45;
    }
    #ds-raid-config-modal .ds-raid-preview-summary span {
      color: #5b2d14;
    }
    #ds-raid-config-modal .ds-raid-preview-empty {
      color: #7d766b;
      font-style: italic;
    }
    #ds-raid-config-modal table,
    #ds-recruit-config-modal table,
    #ds-night-config-modal table {
      width: 100%;
      border-collapse: collapse;
      background: #fffaf0;
    }
    #ds-raid-config-modal th,
    #ds-raid-config-modal td,
    #ds-recruit-config-modal th,
    #ds-recruit-config-modal td,
    #ds-night-config-modal th,
    #ds-night-config-modal td {
      padding: 5px;
      border: 1px solid #c8b894;
      text-align: center;
      white-space: nowrap;
    }
    #ds-raid-config-modal th,
    #ds-recruit-config-modal th,
    #ds-night-config-modal th {
      background: #efe0bd;
      color: #5b2d14;
      font-weight: bold;
    }
    #ds-raid-config-modal input[type="number"],
    #ds-recruit-config-modal input[type="number"],
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
    #ds-recruit-config-modal .ds-modal-actions,
    #ds-night-config-modal .ds-modal-actions {
      border-top: 1px solid #b69a68;
      border-bottom: 0;
    }
    #ds-raid-config-modal button,
    #ds-recruit-config-modal button,
    #ds-night-config-modal button {
      padding: 4px 10px;
      border: 1px solid #8b6f47;
      background: #f4e4bc;
      color: #2f2417;
      font: 12px Arial, sans-serif;
      cursor: pointer;
    }
    #ds-raid-config-modal button:hover,
    #ds-recruit-config-modal button:hover,
    #ds-night-config-modal button:hover {
      background: #e7cf94;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(banner);
  banner.querySelector('[data-action="startRaidAuto"]').addEventListener('click', startRaidAutomation);
  banner.querySelector('[data-action="stopRaidAuto"]').addEventListener('click', stopRaidAutomation);
  banner.querySelector('[data-action="configureRaids"]').addEventListener('click', openRaidConfigModal);
  banner.querySelector('[data-action="configureRecruitment"]').addEventListener('click', openRecruitConfigModal);
  banner.querySelector('[data-action="configureNightQueue"]').addEventListener('click', openNightQueueModal);
  banner.querySelector('[data-action="toggleAutoCalc"]').addEventListener('click', toggleRaidAutoCalc);
  updateStatusBanner();
  updateRaidPlanDisplays();
  updateNightPlanDisplays();
  setInterval(updateStatusBanner, 1000);
}

function buildRaidPlanText() {
  const effMode = getEffectiveDistributionMode();
  const modeLabel = RAID_DISTRIBUTION_LABELS[effMode] || effMode;
  const maxDuration = getRaidMaxDurationSeconds();
  const prefix = effMode === 'manual'
    ? `Modus ${modeLabel} (manuell)`
    : `Auto ${modeLabel}${maxDuration ? ` bis ${formatDuration(maxDuration * 1000)}` : ''}`;

  if (effMode !== 'manual') {
    const activeSlots = RAID_CONFIG.enabledOptions
      .filter(index => getRaidConfig(index)?.enabled !== false)
      .join(', ');
    return `${prefix} | Slots ${activeSlots || '-'} (Truppen werden berechnet)`;
  }

  const slotPlan = RAID_CONFIG.enabledOptions
    .map(index => ({ index, config: getRaidConfig(index) }))
    .filter(({ config }) => config && config.enabled !== false)
    .map(({ index, config }) => `${index}: ${formatRaidUnits(config.units) || 'keine Truppen'}`)
    .join(' | ');

  return `${prefix} | ${slotPlan || 'keine aktiven Slots'}`;
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
    distributionMode: modal.querySelector('[data-raid-distribution-mode="1"]')?.value || 'manual',
    maxRaidDurationHours: Math.max(0, Math.floor(Number(modal.querySelector('[data-raid-max-hours="1"]')?.value || 0))),
    maxRaidDurationMinutes: Math.max(0, Math.floor(Number(modal.querySelector('[data-raid-max-minutes="1"]')?.value || 0))),
    reserve: {},
    raids: {}
  };

  RAID_UNITS.forEach(unit => {
    snapshot.reserve[unit] = Math.max(0, Math.floor(Number(modal.querySelector(`[data-reserve-unit="${unit}"]`)?.value || 0)));
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

function withTemporaryRaidConfig(snapshot, callback) {
  const previous = normalizeRaidConfig(RAID_CONFIG);
  applyRaidConfigSnapshot(snapshot);

  try {
    return callback();
  } finally {
    applyRaidConfigSnapshot(previous);
  }
}

function formatRaidNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return '0';
  return Number(value).toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function getRaidPreviewPlan(availableUnits) {
  const previewOptions = RAID_CONFIG.enabledOptions
    .filter(index => getRaidConfig(index)?.enabled !== false)
    .map(index => ({ index }));

  if (RAID_CONFIG.distributionMode === 'manual') {
    const remainingUnits = normalizeRaidUnits(availableUnits);
    const plan = {};

    previewOptions.forEach(({ index }) => {
      const units = getConfiguredRaidUnits(index, remainingUnits);
      if (!units || sumRaidUnits(units) < RAID_CONFIG.minUnitsPerRaid) return;

      plan[index] = units;
      subtractRaidUnits(remainingUnits, units);
    });

    return plan;
  }

  return calculateOptimizedRaidPlan(availableUnits, previewOptions);
}

function buildRaidPreviewRows(plan) {
  const durationFactor = getRaidDurationFactor();

  return RAID_CONFIG.enabledOptions
    .filter(index => getRaidConfig(index)?.enabled !== false)
    .map(index => {
      const units = plan[index] || getEmptyRaidUnits();
      const capacity = getRaidCapacity(units);
      const ratio = RAID_SLOT_RATIOS[index] || 0;
      const duration = getRaidDurationSeconds(capacity, ratio, durationFactor);
      const loot = capacity * ratio;
      const lootPerHour = duration > 0 ? (loot / duration) * 3600 : 0;

      return {
        index,
        units,
        capacity,
        duration,
        loot,
        lootPerHour
      };
    });
}

function renderRaidPreview(snapshot) {
  const availableUnits = readAvailableRaidUnits();

  return withTemporaryRaidConfig(snapshot, () => {
    const plan = getRaidPreviewPlan(availableUnits);
    const rows = buildRaidPreviewRows(plan);
    const usableUnits = getAvailableRaidUnitsAfterReserve(availableUnits);
    const availableTotal = sumRaidUnits(availableUnits);
    const usableTotal = sumRaidUnits(usableUnits);
    const plannedTotal = rows.reduce((sum, row) => sum + sumRaidUnits(row.units), 0);
    const plannedCapacity = rows.reduce((sum, row) => sum + row.capacity, 0);
    const totalLootPerHour = rows.reduce((sum, row) => sum + row.lootPerHour, 0);
    const hasPlan = rows.some(row => sumRaidUnits(row.units) > 0);

    if (!hasPlan) {
      return `
        <div class="ds-raid-preview-title">Berechnete Vorschau</div>
        <div class="ds-raid-preview-summary">
          <span>Truppen gesamt: <strong>${formatRaidNumber(availableTotal)}</strong></span>
          <span>Nach Reserve: <strong>${formatRaidNumber(usableTotal)}</strong></span>
          <span>Bestand: <strong>${formatRaidUnits(availableUnits) || '-'}</strong></span>
          <span>Nutzbar: <strong>${formatRaidUnits(usableUnits) || '-'}</strong></span>
        </div>
        <div class="ds-raid-preview-empty">Keine passende Verteilung berechnet. Pruefe aktive Slots, Reserven und gespeicherte Truppen.</div>
      `;
    }

    return `
      <div class="ds-raid-preview-title">Berechnete Vorschau</div>
      <div class="ds-raid-preview-summary">
        <span>Truppen gesamt: <strong>${formatRaidNumber(availableTotal)}</strong></span>
        <span>Nach Reserve: <strong>${formatRaidNumber(usableTotal)}</strong></span>
        <span>Verplant: <strong>${formatRaidNumber(plannedTotal)}</strong></span>
        <span>Kapazitaet: <strong>${formatRaidNumber(plannedCapacity)}</strong></span>
        <span>Beute/h gesamt: <strong>${formatRaidNumber(totalLootPerHour, 2)}</strong></span>
        <span>Bestand: <strong>${formatRaidUnits(availableUnits) || '-'}</strong></span>
        <span>Nutzbar: <strong>${formatRaidUnits(usableUnits) || '-'}</strong></span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Raubzug</th>
            <th>Truppen</th>
            <th>Verteilung</th>
            <th>Beute</th>
            <th>Beute/h</th>
            <th>Dauer</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>Slot ${row.index}</td>
              <td>${formatRaidNumber(sumRaidUnits(row.units))}</td>
              <td>${formatRaidUnits(row.units) || '-'}</td>
              <td>${formatRaidNumber(row.loot, 2)}</td>
              <td>${formatRaidNumber(row.lootPerHour, 2)}</td>
              <td>${row.duration ? formatDuration(row.duration * 1000) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  });
}

function updateRaidConfigPreview(modal) {
  const target = modal.querySelector('[data-raid-preview="1"]');
  if (!target) return;

  const snapshot = readRaidConfigFromModal(modal);
  target.innerHTML = renderRaidPreview(snapshot);
  applyOptimizedRaidPlanToModal(modal, snapshot);
}

function applyOptimizedRaidPlanToModal(modal, snapshot) {
  if (snapshot.distributionMode === 'manual') return;

  const availableUnits = readAvailableRaidUnits();
  const plan = withTemporaryRaidConfig(snapshot, () => getRaidPreviewPlan(availableUnits));

  [1, 2, 3, 4].forEach(index => {
    RAID_UNITS.forEach(unit => {
      const input = modal.querySelector(`[data-slot="${index}"][data-unit="${unit}"]`);
      if (!input) return;

      input.value = String(Math.max(0, Math.floor(Number(plan?.[index]?.[unit] || 0))));
    });
  });
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
        <div class="ds-raid-config-controls">
          <label>
            Modus
            <select data-raid-distribution-mode="1">
              <option value="manual" ${RAID_CONFIG.distributionMode === 'manual' ? 'selected' : ''}>Manuell konfigurierte Truppen</option>
              <option value="optimizedEqual" ${RAID_CONFIG.distributionMode === 'optimizedEqual' ? 'selected' : ''}>Optimiert: alle Raubzuege gleich lang</option>
              <option value="optimizedRun" ${RAID_CONFIG.distributionMode === 'optimizedRun' ? 'selected' : ''}>Optimiert: Ressourcen pro Lauf</option>
              <option value="optimizedHour" ${RAID_CONFIG.distributionMode === 'optimizedHour' ? 'selected' : ''}>Optimiert: Ressourcen pro Stunde</option>
            </select>
          </label>
          <label>
            Max. Laufzeit
            <span>
              <input type="number" min="0" step="1" data-raid-max-hours="1" value="${Number(RAID_CONFIG.maxRaidDurationHours || 0)}"> h
              <input type="number" min="0" step="1" data-raid-max-minutes="1" value="${Number(RAID_CONFIG.maxRaidDurationMinutes || 0)}"> min
            </span>
          </label>
        </div>
        <div class="ds-raid-reserve-grid">
          <strong>Reserve</strong>
          ${RAID_UNITS.map(unit => `
            <label>
              ${RAID_UNIT_LABELS[unit] || unit}
              <input type="number" min="0" step="1" data-reserve-unit="${unit}" value="${Number(RAID_CONFIG.reserve?.[unit] || 0)}">
            </label>
          `).join('')}
        </div>
        <div class="ds-raid-preview" data-raid-preview="1"></div>
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
  const updatePreview = () => updateRaidConfigPreview(modal);
  modal.addEventListener('input', updatePreview);
  modal.addEventListener('change', updatePreview);
  updatePreview();
}

function closeRecruitConfigModal() {
  document.getElementById('ds-recruit-config-backdrop')?.remove();
}

function buildRecruitConfigRows() {
  return BARRACKS_RECRUIT_UNITS.map(unit => `
    <tr>
      <th>${RAID_UNIT_LABELS[unit] || unit}</th>
      <td>
        <input type="number" min="0" step="1" data-recruit-unit="${unit}" value="${Number(RECRUIT_CONFIG.units?.[unit] || 0)}">
      </td>
    </tr>
  `).join('');
}

function readRecruitConfigFromModal(modal) {
  const snapshot = {
    enabled: Boolean(modal.querySelector('[data-recruit-enabled="1"]')?.checked),
    units: {}
  };

  BARRACKS_RECRUIT_UNITS.forEach(unit => {
    const input = modal.querySelector(`[data-recruit-unit="${unit}"]`);
    snapshot.units[unit] = Math.max(0, Math.floor(Number(input?.value || 0)));
  });

  return snapshot;
}

function openRecruitConfigModal() {
  closeRecruitConfigModal();

  const backdrop = document.createElement('div');
  backdrop.id = 'ds-recruit-config-backdrop';
  backdrop.innerHTML = `
    <div id="ds-recruit-config-modal" role="dialog" aria-modal="true">
      <div class="ds-modal-head">
        <div class="ds-modal-title">Rekrutierung-Konfiguration</div>
        <button type="button" data-action="closeRecruitConfig">Schliessen</button>
      </div>
      <div class="ds-modal-body">
        <table>
          <thead>
            <tr>
              <th colspan="2">
                <label>
                  <input type="checkbox" data-recruit-enabled="1" ${RECRUIT_CONFIG.enabled !== false ? 'checked' : ''}>
                  Automatisch in der Kaserne rekrutieren
                </label>
              </th>
            </tr>
            <tr>
              <th>Einheit</th>
              <th>Menge pro Besuch</th>
            </tr>
          </thead>
          <tbody>
            ${buildRecruitConfigRows()}
          </tbody>
        </table>
      </div>
      <div class="ds-modal-actions">
        <button type="button" data-action="resetRecruitConfig">Zuruecksetzen</button>
        <div>
          <button type="button" data-action="cancelRecruitConfig">Abbrechen</button>
          <button type="button" data-action="saveRecruitConfig">Speichern</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  const modal = backdrop.querySelector('#ds-recruit-config-modal');

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) closeRecruitConfigModal();
  });
  modal.querySelector('[data-action="closeRecruitConfig"]').addEventListener('click', closeRecruitConfigModal);
  modal.querySelector('[data-action="cancelRecruitConfig"]').addEventListener('click', closeRecruitConfigModal);
  modal.querySelector('[data-action="saveRecruitConfig"]').addEventListener('click', () => {
    savePersistentRecruitConfig(readRecruitConfigFromModal(modal));
    closeRecruitConfigModal();
  });
  modal.querySelector('[data-action="resetRecruitConfig"]').addEventListener('click', () => {
    resetPersistentRecruitConfig();
    closeRecruitConfigModal();
  });
}

function closeNightQueueModal() {
  document.getElementById('ds-night-config-backdrop')?.remove();
}

function getNightTargetLevel(buildingKey) {
  const entry = nightQueue.find(item => item.building === buildingKey);
  const currentLevel = Number(getStoredNightCurrentLevel(buildingKey));
  const minimumLevel = Number.isFinite(currentLevel) && currentLevel > 0 ? currentLevel : 1;
  return Math.max(Number(entry?.level || 0), minimumLevel);
}

function buildNightQueueRows() {
  return NIGHT_BUILDINGS.map((building, index) => {
    const currentLevel = getStoredNightCurrentLevel(building.key);
    const minimumLevel = Number(currentLevel) > 0 ? Number(currentLevel) : 1;
    const targetLevel = getNightTargetLevel(building.key);

    return `
    <tr data-night-row="1">
      <td>${index + 1}</td>
      <td>${building.label}</td>
      <td data-night-current-level="1">${currentLevel}</td>
      <td>${formatNightUpgradeCost(building.key)}</td>
      <td>${formatNightUpgradeTime(building.key)}</td>
      <td>
        <input type="number" min="${minimumLevel}" step="1" data-night-building="${building.key}" data-night-level="1" value="${targetLevel}">
      </td>
    </tr>
    `;
  }).join('');
}

function readNightQueueFromModal(modal) {
  return Array.from(modal.querySelectorAll('[data-night-row="1"]'))
    .map(row => ({
      building: row.querySelector('[data-night-building][data-night-level="1"]')?.dataset?.nightBuilding,
      level: row.querySelector('[data-night-level="1"]')?.value
    }));
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
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Gebaeude</th>
              <th>Aktuell</th>
              <th>Kosten</th>
              <th>Bauzeit</th>
              <th>Ziellevel</th>
            </tr>
          </thead>
          <tbody data-night-rows="1">
            ${buildNightQueueRows()}
          </tbody>
        </table>
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
  const enforceMinimumTargetLevel = event => {
    if (!event.target?.matches?.('[data-night-level="1"]')) return;

    const minimumLevel = Number(event.target.min || 1);
    const targetLevel = Math.max(minimumLevel, Math.floor(Number(event.target.value || minimumLevel)));
    event.target.value = String(targetLevel);
  };
  modal.addEventListener('input', enforceMinimumTargetLevel);
  modal.addEventListener('change', enforceMinimumTargetLevel);
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
  const autoCalcButton = document.querySelector('#ds-status-banner [data-field="autoCalcButton"]');
  if (autoCalcButton) autoCalcButton.textContent = `Auto-Truppen: ${isRaidAutoCalcActive() ? 'AN' : 'AUS'}`;
  updateNightPlanDisplays();
  updateRaidActionButtons();
}

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

function isMainBuildingPage() {
  return location.href.includes('screen=main');
}

function getCurrentVillageId() {
  return new URLSearchParams(location.search).get('village');
}

function getCurrentScreen() {
  return new URLSearchParams(location.search).get('screen') || '';
}

function isRecruitPage() {
  return ['barracks', 'stable'].includes(getCurrentScreen());
}

function isBarracksPage() {
  return getCurrentScreen() === 'barracks';
}

function isStablePage() {
  return getCurrentScreen() === 'stable';
}

function buildGameUrl(screen, mode) {
  const params = new URLSearchParams(location.search);
  const villageId = getCurrentVillageId();
  if (villageId) params.set('village', villageId);
  params.set('screen', screen);
  if (mode) params.set('mode', mode);
  else params.delete('mode');
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function getBuildingsUrl() {
  return buildGameUrl('overview_villages', 'buildings');
}

function getBarracksUrl() {
  return buildGameUrl('barracks');
}

function getStableUrl() {
  return buildGameUrl('stable');
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

// GEAENDERT: Laeuft jetzt auch ohne gespeicherte Fertig-Zeit weiter (Selbstheilung),
// damit der Zyklus nicht auf der Gebaeudeuebersicht haengen bleibt.
function scheduleRaidPageSwitch() {
  if (!RAID_CONFIG.switchPages || !isRaidAutomationActive() || !isBuildingsOverviewPage()) return;

  const nextReadyAt = getStoredNextRaidReadyAt();
  const bufferMs = random(RAID_CONFIG.nextRaidBufferMin, RAID_CONFIG.nextRaidBufferMax);

  // Bekannte Fertig-Zeit -> bis dahin warten. Sonst kurzer Fallback,
  // damit der Zyklus auch ohne gespeicherte Zeit weiterlaeuft.
  const waitMs = nextReadyAt
    ? Math.max(0, nextReadyAt - Date.now() + bufferMs)
    : random(RELOAD_WAIT_MIN, RELOAD_WAIT_MAX);

  const switchAt = Date.now() + waitMs;
  localStorage.setItem(RAID_NEXT_SWITCH_KEY, String(switchAt));
  updateStatusBanner();
  console.log(`Raubzug-Wechsel geplant um ${new Date(switchAt).toLocaleTimeString('de-DE')}.`);

  setTimeout(() => {
    if (!isRaidAutomationActive()) return;
    if (BOT_PROTECTION_TRIGGERED) return;
    localStorage.removeItem(RAID_NEXT_READY_KEY);
    localStorage.removeItem(RAID_READY_TIMES_KEY);
    localStorage.removeItem(RAID_NEXT_SWITCH_KEY);
    localStorage.setItem(RAID_PREFETCH_UNITS_KEY, '1');
    window.location.href = getBarracksUrl();
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

function parseTotalUnitCountText(text) {
  const slashMatch = String(text || '').replace(/\./g, '').match(/(\d+)\s*\/\s*(\d+)/);
  if (slashMatch) return Number(slashMatch[2]);

  const singleMatch = String(text || '').replace(/\./g, '').match(/\d+/);
  return singleMatch ? Number(singleMatch[0]) : 0;
}

function getRecruitUnitRow(unit) {
  const trainForm = document.querySelector('#train_form');
  if (!trainForm) return null;

  const unitLink = trainForm.querySelector(`a.unit_link[data-unit="${unit}"]`);
  return unitLink?.closest('tr') || null;
}

function readRecruitPageUnitTotal(unit) {
  if (!isRecruitPage()) return 0;

  const row = getRecruitUnitRow(unit);
  if (!row) return 0;

  const countCell = Array.from(row.children)
    .find(cell => /^\s*\d[\d.]*\s*\/\s*\d[\d.]*\s*$/.test(cell.textContent || ''));

  return countCell ? parseTotalUnitCountText(countCell.textContent || '') : 0;
}

function readAvailableRaidUnitsFromRecruitPage() {
  const result = getEmptyRaidUnits();
  if (!isRecruitPage()) return result;

  RAID_UNITS.forEach(unit => {
    result[unit] = readRecruitPageUnitTotal(unit);
  });

  return result;
}

function getEmptyRaidUnits() {
  return Object.fromEntries(RAID_UNITS.map(unit => [unit, 0]));
}

function sumRaidUnits(units) {
  return RAID_UNITS.reduce((sum, unit) => sum + Math.max(0, Number(units?.[unit] || 0)), 0);
}

function normalizeRaidUnits(units) {
  const normalized = getEmptyRaidUnits();
  RAID_UNITS.forEach(unit => {
    normalized[unit] = Math.max(0, Math.floor(Number(units?.[unit] || 0)));
  });
  return normalized;
}

function readStoredRaidUnits() {
  try {
    const raw = localStorage.getItem(RAID_STORED_UNITS_KEY);
    if (!raw) return getEmptyRaidUnits();
    return normalizeRaidUnits(JSON.parse(raw));
  } catch (e) {
    return getEmptyRaidUnits();
  }
}

function saveStoredRaidUnits(units) {
  localStorage.setItem(RAID_STORED_UNITS_KEY, JSON.stringify(normalizeRaidUnits(units)));
}

function readAvailableRaidUnitsFromPage() {
  if (isRecruitPage()) return readAvailableRaidUnitsFromRecruitPage();

  const result = {};
  const unitInputs = getRaidUnitInputs();
  RAID_UNITS.forEach(unit => {
    const input = unitInputs[unit] || document.querySelector(`#units_home input[name="${unit}"], #units_home input[data-unit="${unit}"], input.unitsInput[name="${unit}"]`);
    const countNode = document.querySelector(`#units_home .unit-item-${unit}, #units_home [data-unit="${unit}"], .unit-item-${unit}`);
    const fromInput = input ? Number(input.getAttribute('data-all-count') || input.dataset.allCount || 0) : 0;
    const fromTable = input ? readRaidUnitCountFromTable(input) : 0;
    const fromText = countNode ? parseTotalUnitCountText(countNode.textContent || '') : 0;
    const fromRecruitPage = readRecruitPageUnitTotal(unit);
    const fromScavengeData = readScavengeHomeUnitCount(unit);
    result[unit] = Math.max(fromRecruitPage || 0, fromInput || 0, fromTable || 0, fromText || 0, fromScavengeData || 0);
  });
  return result;
}

function readScavengeHomeUnitCount(unit) {
  const villageId = getCurrentVillageId();
  return Number(
    window.ScavengeScreen?.village?.unit_counts_home?.[unit] ||
    window.ScavengeScreen?.village_data?.unit_counts_home?.[unit] ||
    window.ScavengeScreen?.village?.get?.('unit_counts_home')?.[unit] ||
    window.ScavengingOverview?.village_data?.[villageId]?.unit_counts_home?.[unit] ||
    window.game_data?.village?.unit_counts_home?.[unit] ||
    0
  );
}

function getRecruitUnitInput(unit) {
  return document.querySelector(`#train_form input[name="${unit}"], #train_form input[data-unit="${unit}"]`);
}

function getRecruitAffordableCount(unit) {
  const row = getRecruitUnitRow(unit);
  const maxLink = row?.querySelector(`#${unit}_0_a, a[href*="set_max('${unit}')"], a[href*='set_max("${unit}")']`);
  const match = (maxLink?.textContent || '').match(/\((\d+)\)/);
  return match ? Number(match[1]) : 0;
}

function isRecruitCooldownActive() {
  const lastActionAt = Number(localStorage.getItem(RECRUIT_LAST_ACTION_KEY) || 0);
  return Number.isFinite(lastActionAt) && Date.now() - lastActionAt < RECRUIT_CONFIG.cooldownMs;
}

function setRecruitInputValue(input, value) {
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

function runBarracksAutoRecruitment() {
  if (!RECRUIT_CONFIG.enabled || !isBarracksPage()) return false;
  if (isRecruitCooldownActive()) return false;
  if (BOT_PROTECTION_TRIGGERED) return false;
  if (isBotProtectionActive()) { triggerBotProtectionStop(); return false; }

  const form = document.querySelector('#train_form');
  if (!form) return false;
  storeCurrentRaidUnitsFromRecruitPages();

  let totalQueued = 0;

  BARRACKS_RECRUIT_UNITS.forEach(unit => {
    const input = getRecruitUnitInput(unit);
    if (input) setRecruitInputValue(input, 0);
  });

  BARRACKS_RECRUIT_UNITS.forEach(unit => {
    const requested = Math.max(0, Math.floor(Number(RECRUIT_CONFIG.units?.[unit] || 0)));
    if (requested <= 0) return;

    const input = getRecruitUnitInput(unit);
    if (!input) return;

    const affordable = getRecruitAffordableCount(unit);
    if (affordable < requested) return;

    setRecruitInputValue(input, requested);
    totalQueued += requested;
  });

  if (totalQueued <= 0) return false;

  localStorage.setItem(RECRUIT_LAST_ACTION_KEY, String(Date.now()));
  const submit = form.querySelector('input[type="submit"], button[type="submit"], .btn-recruit');
  if (submit) submit.click();
  else form.submit();

  return true;
}

function storeCurrentRaidUnitsFromRecruitPages() {
  if (!isRecruitPage()) return;

  const screen = getCurrentScreen();
  const relevantUnits = RAID_RECRUIT_UNITS_BY_SCREEN[screen] || [];
  const pageUnits = readAvailableRaidUnitsFromPage();
  const storedUnits = readStoredRaidUnits();
  const foundRelevantUnits = relevantUnits.some(unit => Number(pageUnits[unit] || 0) > 0);
  if (!foundRelevantUnits) return;

  relevantUnits.forEach(unit => {
    storedUnits[unit] = Math.max(0, Math.floor(Number(pageUnits[unit] || 0)));
  });

  saveStoredRaidUnits(storedUnits);
}

function readAvailableRaidUnits() {
  const pageUnits = normalizeRaidUnits(readAvailableRaidUnitsFromPage());
  if (sumRaidUnits(pageUnits) > 0) {
    saveStoredRaidUnits(pageUnits);
    return pageUnits;
  }

  return readStoredRaidUnits();
}

// NEU: Auf der Raubzugseite die ZUHAUSE stehenden, sofort sendbaren Truppen.
function readScavengeHomeUnits() {
  return normalizeRaidUnits(readAvailableRaidUnitsFromPage());
}

// GEAENDERT: Quelle fuer die Verteilungsrechnung ist jetzt der GESAMTBESTAND
// aus der Kaserne/dem Stall ("Insgesamt"), nicht nur die zuhause stehenden Truppen.
function readAvailableRaidUnitsForSending() {
  // Vorzug: Gesamtbestand (inkl. unterwegs) – zuletzt in der Kaserne/im Stall ausgelesen.
  const storedTotals = readStoredRaidUnits();
  if (sumRaidUnits(storedTotals) > 0) return storedTotals;

  // Fallback, falls noch nichts gespeichert wurde: zuhause stehende Truppen.
  return readScavengeHomeUnits();
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

function getRaidMaxDurationSeconds() {
  const hours = Math.max(0, Math.floor(Number(RAID_CONFIG.maxRaidDurationHours || 0)));
  const minutes = Math.max(0, Math.floor(Number(RAID_CONFIG.maxRaidDurationMinutes || 0)));
  const seconds = (hours * 3600) + (minutes * 60);
  return seconds > 0 ? seconds : null;
}

function getRaidWorldSpeed() {
  const speed = Number(window.game_data?.speed || window.TribalWars?.worldConfig?.speed || 0);
  return Number.isFinite(speed) && speed > 0 ? speed : 1.6;
}

function getRaidDurationFactor() {
  return Math.pow(getRaidWorldSpeed(), -0.55);
}

function getRaidDurationSeconds(capacity, ratio, durationFactor) {
  if (capacity <= 0 || ratio <= 0) return 0;
  return (Math.pow((capacity * capacity) * 100 * (ratio * ratio), 0.45) + 1800) * durationFactor;
}

function getRaidMaxCapacityForDuration(maxDurationSeconds, ratio, durationFactor) {
  if (!maxDurationSeconds) return Infinity;
  const base = (maxDurationSeconds / durationFactor) - 1800;
  if (base <= 0) return 0;
  return Math.sqrt(Math.pow(base, 1 / 0.45) / (100 * ratio * ratio));
}

function getRaidCapacity(units) {
  return RAID_UNITS.reduce((sum, unit) => {
    return sum + Math.max(0, Number(units?.[unit] || 0)) * RAID_UNIT_CARRY[unit];
  }, 0);
}

function getAvailableRaidUnitsAfterReserve(availableUnits) {
  const result = {};
  RAID_UNITS.forEach(unit => {
    const reserve = Math.max(0, Number(RAID_CONFIG.reserve?.[unit] || 0));
    result[unit] = Math.max(0, Number(availableUnits?.[unit] || 0) - reserve);
  });
  return result;
}

function getEqualDurationCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor) {
  const inverseSum = ratios.reduce((sum, ratio) => sum + (1 / ratio), 0);
  let capacities = ratios.map(ratio => totalCapacity / (ratio * inverseSum));

  if (maxDurationSeconds) {
    const caps = ratios.map(ratio => getRaidMaxCapacityForDuration(maxDurationSeconds, ratio, durationFactor));
    const scale = Math.min(...capacities.map((capacity, index) => capacity > 0 ? caps[index] / capacity : Infinity));
    if (Number.isFinite(scale) && scale < 1) capacities = capacities.map(capacity => capacity * scale);
  }

  return capacities;
}

function getPerRunCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor) {
  const order = ratios.map((ratio, index) => ({ ratio, index })).sort((a, b) => b.ratio - a.ratio);
  const capacities = new Array(ratios.length).fill(0);
  let remaining = totalCapacity;

  order.forEach(({ ratio, index }) => {
    if (remaining <= 0) return;
    const maxCapacity = getRaidMaxCapacityForDuration(maxDurationSeconds, ratio, durationFactor);
    const take = Math.min(remaining, maxCapacity);
    capacities[index] = take;
    remaining -= take;
  });

  return capacities;
}

function getPerHourCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor) {
  return maxDurationSeconds
    ? getPerHourCapacitiesWithLimits(totalCapacity, ratios, maxDurationSeconds, durationFactor)
    : getPerHourCapacitiesSimple(totalCapacity, ratios, durationFactor);
}

function getPerHourCapacitiesSimple(totalCapacity, ratios, durationFactor) {
  const count = ratios.length;
  if (totalCapacity <= 0 || count === 0) return new Array(count).fill(0);

  let shares = new Array(count).fill(1 / count);
  let bestScore = getPerHourCapacityScore(shares, totalCapacity, ratios, durationFactor);

  for (let iteration = 0; iteration < 400; iteration++) {
    let improved = false;

    for (let index = 0; index < count - 1; index++) {
      const nextIndex = index + 1;
      const deltaCurrent = shares[index] * 0.5 || (1 / (2 * count));
      const deltaNext = shares[nextIndex] * 0.5 || (1 / (2 * count));
      const candidates = [
        shares,
        normalizeRaidCapacityShares(shares.map((share, shareIndex) => {
          if (shareIndex === index) return share - deltaCurrent;
          if (shareIndex === nextIndex) return share + deltaCurrent;
          return share;
        })),
        normalizeRaidCapacityShares(shares.map((share, shareIndex) => {
          if (shareIndex === index) return share + deltaNext;
          if (shareIndex === nextIndex) return share - deltaNext;
          return share;
        }))
      ];

      candidates.forEach(candidate => {
        const score = getPerHourCapacityScore(candidate, totalCapacity, ratios, durationFactor);
        if (score > bestScore + 1e-9) {
          shares = candidate;
          bestScore = score;
          improved = true;
        }
      });
    }

    if (!improved) break;
  }

  return shares.map(share => Math.max(0, share) * totalCapacity);
}

function normalizeRaidCapacityShares(shares) {
  const sum = shares.reduce((total, share) => total + Math.max(0, share), 0);
  return shares.map(share => sum > 0 ? Math.max(0, share) / sum : 0);
}

function getPerHourCapacityScore(shares, totalCapacity, ratios, durationFactor) {
  return shares.reduce((score, share, index) => {
    const capacity = Math.max(0, share * totalCapacity);
    const loot = capacity * ratios[index];
    const duration = getRaidDurationSeconds(capacity, ratios[index], durationFactor);
    return duration > 0 ? score + (loot / duration) : score;
  }, 0);
}

function getPerHourCapacitiesWithLimits(totalCapacity, ratios, maxDurationSeconds, durationFactor) {
  const count = ratios.length;
  if (count === 0 || totalCapacity <= 0) return new Array(count).fill(0);

  const maxCapacities = ratios.map(ratio => getRaidMaxCapacityForDuration(maxDurationSeconds, ratio, durationFactor));
  let remainingCapacity = Math.min(totalCapacity, maxCapacities.reduce((sum, capacity) => {
    return sum + (Number.isFinite(capacity) ? capacity : 0);
  }, 0));
  const fixedCapacities = new Array(count).fill(0);
  let activeIndexes = Array.from({ length: count }, (_, index) => index).filter(index => maxCapacities[index] > 0);

  while (activeIndexes.length > 0 && remainingCapacity > 1e-9) {
    const activeRatios = activeIndexes.map(index => ratios[index]);
    const activeCapacities = getPerHourCapacitiesSimple(remainingCapacity, activeRatios, durationFactor);
    const overloaded = [];

    activeIndexes.forEach((index, activePosition) => {
      if (activeCapacities[activePosition] > maxCapacities[index] + 1e-9) overloaded.push(activePosition);
    });

    if (overloaded.length === 0) {
      activeIndexes.forEach((index, activePosition) => {
        fixedCapacities[index] += activeCapacities[activePosition];
      });
      remainingCapacity = 0;
      break;
    }

    let frozenCapacity = 0;
    const keepIndexes = [];

    activeIndexes.forEach((index, activePosition) => {
      if (activeCapacities[activePosition] > maxCapacities[index] + 1e-9) {
        fixedCapacities[index] += maxCapacities[index];
        frozenCapacity += maxCapacities[index];
      } else {
        keepIndexes.push(index);
      }
    });

    remainingCapacity = Math.max(0, remainingCapacity - frozenCapacity);
    activeIndexes = keepIndexes;
  }

  return fixedCapacities;
}

function allocateRaidUnitsToCapacities(targetCapacities, availableUnits, activeIndexes) {
  const allocation = {};
  const remainingUnits = normalizeRaidUnits(availableUnits);
  const unitsByCarry = RAID_UNITS.slice().sort((a, b) => RAID_UNIT_CARRY[b] - RAID_UNIT_CARRY[a]);

  activeIndexes.forEach((index, position) => {
    allocation[index] = getEmptyRaidUnits();
    let remainingCapacity = Math.max(0, Number(targetCapacities[position] || 0));

    unitsByCarry.forEach(unit => {
      if (remainingCapacity <= 0) return;

      const carry = RAID_UNIT_CARRY[unit];
      const available = Math.max(0, Number(remainingUnits[unit] || 0));
      const take = Math.min(available, Math.floor(remainingCapacity / carry));
      if (take <= 0) return;

      allocation[index][unit] = take;
      remainingUnits[unit] -= take;
      remainingCapacity -= take * carry;
    });
  });

  if (!getRaidMaxDurationSeconds()) {
    unitsByCarry.forEach(unit => {
      let left = Math.max(0, Number(remainingUnits[unit] || 0));
      while (left > 0) {
        let bestPosition = -1;
        let smallestOverflow = Infinity;

        activeIndexes.forEach((index, position) => {
          const currentCapacity = getRaidCapacity(allocation[index]);
          const overflow = Math.max(0, currentCapacity + RAID_UNIT_CARRY[unit] - targetCapacities[position]);
          if (overflow < smallestOverflow) {
            smallestOverflow = overflow;
            bestPosition = position;
          }
        });

        if (bestPosition < 0) break;
        const index = activeIndexes[bestPosition];
        allocation[index][unit] += 1;
        left--;
      }
    });
  }

  return allocation;
}

function calculateOptimizedRaidPlan(availableUnits, freeOptions) {
  const activeIndexes = freeOptions
    .map(({ index }) => index)
    .filter(index => RAID_CONFIG.enabledOptions.includes(index) && getRaidConfig(index)?.enabled !== false && RAID_SLOT_RATIOS[index])
    .sort((a, b) => a - b);

  if (activeIndexes.length === 0) return {};

  const usableUnits = getAvailableRaidUnitsAfterReserve(availableUnits);
  const totalCapacity = getRaidCapacity(usableUnits);
  if (totalCapacity <= 0) return {};

  const ratios = activeIndexes.map(index => RAID_SLOT_RATIOS[index]);
  const maxDurationSeconds = getRaidMaxDurationSeconds();
  const durationFactor = getRaidDurationFactor();
  let targetCapacities;

  if (RAID_CONFIG.distributionMode === 'optimizedRun') {
    targetCapacities = getPerRunCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor);
  } else if (RAID_CONFIG.distributionMode === 'optimizedHour') {
    targetCapacities = getPerHourCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor);
  } else {
    targetCapacities = getEqualDurationCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor);
  }

  return allocateRaidUnitsToCapacities(targetCapacities, usableUnits, activeIndexes);
}

// NEU: Ziel-Kapazitaet pro AKTIVEM Slot (alle enabled Slots, nicht nur freie),
// berechnet aus dem Gesamtbestand. So bekommt jeder Slot seinen fairen Anteil,
// statt dass alles in die gerade freien Slots gekippt wird.
function getRaidTargetCapacities(armyUnits, mode) {
  const activeIndexes = RAID_CONFIG.enabledOptions
    .filter(index => getRaidConfig(index)?.enabled !== false && RAID_SLOT_RATIOS[index])
    .sort((a, b) => a - b);

  if (activeIndexes.length === 0) return {};

  const usableUnits = getAvailableRaidUnitsAfterReserve(armyUnits);
  const totalCapacity = getRaidCapacity(usableUnits);
  if (totalCapacity <= 0) return {};

  const ratios = activeIndexes.map(index => RAID_SLOT_RATIOS[index]);
  const maxDurationSeconds = getRaidMaxDurationSeconds();
  const durationFactor = getRaidDurationFactor();
  let capacities;

  if (mode === 'optimizedRun') {
    capacities = getPerRunCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor);
  } else if (mode === 'optimizedHour') {
    capacities = getPerHourCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor);
  } else {
    capacities = getEqualDurationCapacities(totalCapacity, ratios, maxDurationSeconds, durationFactor);
  }

  const result = {};
  activeIndexes.forEach((index, position) => {
    result[index] = Math.max(0, Number(capacities[position] || 0));
  });
  return result;
}

// NEU: Fuellt die uebergebenen (freien) Slots bis zu ihrer Ziel-Kapazitaet aus
// dem sendbaren Bestand auf – OHNE Rest-Verteilung, damit kein Slot ueberlaeuft.
function allocateUnitsToTargetCapacities(freeIndexes, targetCapacityByIndex, sourceUnits) {
  const allocation = {};
  const remaining = normalizeRaidUnits(sourceUnits);
  const unitsByCarry = RAID_UNITS.slice().sort((a, b) => RAID_UNIT_CARRY[b] - RAID_UNIT_CARRY[a]);

  freeIndexes.forEach(index => {
    allocation[index] = getEmptyRaidUnits();
    let remainingCapacity = Math.max(0, Number(targetCapacityByIndex[index] || 0));

    unitsByCarry.forEach(unit => {
      if (remainingCapacity <= 0) return;
      const carry = RAID_UNIT_CARRY[unit];
      const available = Math.max(0, Number(remaining[unit] || 0));
      const take = Math.min(available, Math.floor(remainingCapacity / carry));
      if (take <= 0) return;
      allocation[index][unit] = take;
      remaining[unit] -= take;
      remainingCapacity -= take * carry;
    });
  });

  return allocation;
}

// GEAENDERT: Sende-Plan fuer die freien Slots.
//  - manuell: konfigurierte Truppen (begrenzt auf sendbaren Bestand)
//  - optimiert: Ziel-Kapazitaet je Slot ueber ALLE aktiven Slots aus dem
//    Gesamtbestand; gefuellt werden nur die freien Slots aus dem sendbaren Bestand.
function buildRaidSendPlan(armyUnits, homeUnits, freeOptions) {
  const mode = getEffectiveDistributionMode();

  const freeIndexes = freeOptions
    .map(({ index }) => index)
    .filter(index => getRaidConfig(index)?.enabled !== false && RAID_SLOT_RATIOS[index])
    .sort((a, b) => a - b);

  if (freeIndexes.length === 0) return {};

  // Sendbarer Bestand: nur zuhause stehende Truppen (oder Gesamt, falls Schalter aus
  // bzw. Heimatzahl nicht lesbar war), jeweils abzueglich Reserve.
  const useHome = RAID_CONFIG.limitToHomeUnits && sumRaidUnits(homeUnits) > 0;
  const sendSource = getAvailableRaidUnitsAfterReserve(useHome ? homeUnits : armyUnits);

  if (mode === 'manual') {
    const remaining = normalizeRaidUnits(sendSource);
    const plan = {};

    freeIndexes.forEach(index => {
      const config = getRaidConfig(index);
      if (!config) return;

      const units = getEmptyRaidUnits();
      RAID_UNITS.forEach(unit => {
        const requested = Math.max(0, Math.floor(Number(config.units?.[unit] || 0)));
        units[unit] = Math.min(requested, remaining[unit]);
      });

      if (sumRaidUnits(units) < RAID_CONFIG.minUnitsPerRaid) return;
      plan[index] = units;
      subtractRaidUnits(remaining, units);
    });

    return plan;
  }

  // Ziel-Kapazitaeten ueber ALLE aktiven Slots aus dem Gesamtbestand.
  const targetCapacities = getRaidTargetCapacities(armyUnits, mode);
  return allocateUnitsToTargetCapacities(freeIndexes, targetCapacities, sendSource);
}

function getRaidUnitsForOption(index, availableUnits) {
  return getConfiguredRaidUnits(index, availableUnits);
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

// GEAENDERT: Plant die Verteilung jetzt auf Basis des GESAMTBESTANDS (Kaserne)
// und begrenzt den tatsaechlichen Versand auf die zuhause stehenden Truppen.
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

    // Verteilung auf Basis des GESAMTBESTANDS (Kaserne "Insgesamt") berechnen.
    const totalUnits = readAvailableRaidUnitsForSending();
    if (sumRaidUnits(totalUnits) === 0) {
      setStatus('Kein Truppenbestand bekannt (Kaserne noch nicht ausgelesen?).');
      storeNextRaidReadyAt();
      await returnToBuildingsOverview();
      return;
    }

    // Zuhause stehende Truppen (sofort sendbar) – begrenzen den tatsaechlichen Versand.
    const homeUnits = readScavengeHomeUnits();

    // Plan: Ziel-Anteile ueber ALLE aktiven Slots aus dem Gesamtbestand,
    // gefuellt werden nur die freien Slots aus dem Heimatbestand.
    const sendPlan = buildRaidSendPlan(totalUnits, homeUnits, options);

    let sent = 0;
    for (let i = 0; i < options.length; i++) {
      if (BOT_PROTECTION_TRIGGERED) return;

      const { option, index } = options[i];
      const raidUnits = sendPlan[index];
      if (!raidUnits || sumRaidUnits(raidUnits) < RAID_CONFIG.minUnitsPerRaid) {
        setStatus(`Raubzug ${index}: zu wenig Truppen zuhause.`);
        continue;
      }

      clearRaidOptionInputs(option);
      await Sleep(random(RAID_CONFIG.actionDelayMin, RAID_CONFIG.actionDelayMax));

      const totalUnitsSent = applyRaidUnitsToOption(option, raidUnits);
      if (totalUnitsSent < RAID_CONFIG.minUnitsPerRaid) {
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

async function startNightBuilding() {

  if (!location.href.includes('screen=overview_villages') || !location.href.includes('mode=buildings')) return;

  if (isBotProtectionActive()) { triggerBotProtectionStop(); return; }

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
  let queueFinished = true;

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

      let queueIcons = lastCell.querySelectorAll('.queue_icon');
      for (let y = 0; y < queueIcons.length; y++) {
        let img = queueIcons[y].firstElementChild;
        if (img && img.src.indexOf(targetBuilding) > 0) currentLevel++;
      }

      if (currentLevel >= targetLevel) continue;

      queueFinished = false;

      let btn = cell.querySelector(':scope > a');
      // GEAENDERT: nur dieses Gebaeude ueberspringen (z. B. zu wenig Rohstoffe oder
      // Voraussetzungen fehlen), nicht die restliche Warteschlange abbrechen. Sonst
      // werden weiter hinten gelistete Gebaeude wie Schmiede/Marktplatz nie gebaut.
      if (cell.childElementCount === 0 || !btn) continue;

      btn.click();
      currentQueueCount++;
      console.log(`🔨 ${targetBuilding} → Level ${targetLevel} (aktuell ${currentLevel})`);

      await Sleep(random(CLICK_DELAY_MIN, CLICK_DELAY_MAX));
      if (BOT_PROTECTION_TRIGGERED) return;
    }
  }

  if (BOT_PROTECTION_TRIGGERED) return;

  if (queueFinished) {
    console.log(
      '%c✅ Nacht-Warteschlange vollständig abgearbeitet – Skript stoppt.',
      'color: #4CAF50; font-size: 14px; font-weight: bold'
    );
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

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
  loadPersistentRecruitConfig();
  loadPersistentNightQueue();
  storeCurrentRaidUnitsFromRecruitPages();
  storeCurrentNightLevelsFromMainPage();
  storeCurrentNightLevelsFromBuildingsOverview();
  initStatusBanner();
  insertRaidPanel();

  // Automatik aktiv, aber wir stehen ausserhalb des Zyklus -> in die Kaserne.
  if (enterRaidCycleFromAnywhere()) return;

  // Kaserne im Zyklus: erst rekrutieren (Reload), sonst Truppen einlesen
  // und zur Raubzugseite wechseln.
  if (isRaidAutomationActive() && isBarracksPage() && !BOT_PROTECTION_TRIGGERED) {
    if (runBarracksAutoRecruitment()) return;            // rekrutiert -> Seite laedt neu
    localStorage.setItem(RAID_PREFETCH_UNITS_KEY, '1');  // sonst Prefetch erzwingen
  }

  scheduleRaidPageSwitch();

  handleRaidUnitPrefetch().then(prefetchHandled => {
    if (prefetchHandled) return;
    if (runBarracksAutoRecruitment()) return;
    if (RAID_CONFIG.autoStart && isRaidAutomationActive() && isScavengePage()) {
      startScavengingRaids();
    }
  });

  startNightBuilding();
})();