// ==UserScript==
// @name         Ausbau Nacht-Modus OOP
// @namespace    http://tampermonkey.net/
// @version      0.1.22
// @description  Objektorientierter Neuaufbau fuer Die Staemme Automation.
// @author       kk
// @match        *://*.die-staemme.de/game.php*
// @match        *://die-staemme.de/game.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/UserScripte/dist/Ausbau%20Nacht-Modus-OOP.user.js
// @downloadURL  https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/UserScripte/dist/Ausbau%20Nacht-Modus-OOP.user.js
// ==/UserScript==

(() => {
  // UserScripte/src/core/default-state.js
  function createDefaultState() {
    return {
      page: {
        name: "Unbekannt",
        screen: "",
        mode: "",
        villageId: null
      },
      village: {
        lastReadAt: null,
        id: "",
        name: "",
        displayName: "",
        coord: "",
        resources: {
          wood: 0,
          stone: 0,
          iron: 0,
          storageMax: 0
        },
        resourceProduction: {
          wood: 0,
          stone: 0,
          iron: 0
        },
        population: {
          used: 0,
          max: 0,
          free: 0
        }
      },
      runtime: {
        botProtectionTriggered: false,
        raidRunning: false,
        botProtectionLastCheckAt: null
      },
      raid: {
        enabled: true,
        autoStart: false
      },
      scavenge: {
        lastReadAt: null,
        readyTimes: {},
        nextReadyAt: null,
        activeCount: 0,
        homeUnits: {},
        squads: {}
      },
      barracks: {
        lastReadAt: null,
        units: {}
      },
      stable: {
        lastReadAt: null,
        units: {}
      },
      mainBuilding: {
        lastReadAt: null,
        levels: {},
        queue: [],
        upgradeInfo: {}
      },
      buildPlan: {
        queue: []
      },
      training: {
        maxQueueTimeMinutes: 0,
        units: {}
      },
      recruit: {
        enabled: false
      }
    };
  }

  // UserScripte/src/core/bot-protection-service.js
  var BotProtectionService = class {
    /**
     * @param {import('../types/global-state.js').AppState} state
     * @param {{ onTriggered?: () => void, onChecked?: () => void }} hooks
     */
    constructor(state, hooks = {}) {
      this.state = state;
      this.hooks = hooks;
      this.intervalId = null;
      this.checkIntervalMs = 5e3;
    }
    start() {
      if (this.intervalId) return;
      this.checkNow();
      this.intervalId = window.setInterval(() => {
        if (this.state.runtime.botProtectionTriggered) {
          this.stop();
          return;
        }
        this.checkNow();
      }, this.checkIntervalMs);
    }
    stop() {
      if (!this.intervalId) return;
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    checkNow() {
      this.state.runtime.botProtectionLastCheckAt = Date.now();
      this.hooks.onChecked?.();
      if (!this.isActive()) return false;
      this.triggerStop();
      return true;
    }
    isActive() {
      if (document.querySelector('#captcha, .captcha, img[src*="captcha"], img[src*="botcheck"]')) {
        return true;
      }
      const botProtection = document.querySelector("#botprotection_quest");
      if (botProtection) {
        const style = window.getComputedStyle(botProtection);
        if (style.display !== "none" && style.visibility !== "hidden") return true;
      }
      const bodyText = document.body?.innerText || "";
      return /du bist ein bot|bot.{0,30}schutz|captcha|bitte best.{0,5}tige|are you human/i.test(bodyText);
    }
    triggerStop() {
      if (this.state.runtime.botProtectionTriggered) return;
      this.state.runtime.botProtectionTriggered = true;
      this.playAlertSound();
      this.hooks.onTriggered?.();
      console.warn(
        "%cBOT-SCHUTZ ERKANNT - Script gestoppt. Bitte manuell loesen und Seite neu laden.",
        "color: red; font-size: 14px; font-weight: bold"
      );
    }
    playAlertSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const beep = (freq, start, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + start + duration);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + duration);
        };
        beep(880, 0, 0.3);
        beep(660, 0.35, 0.3);
        beep(440, 0.7, 0.5);
      } catch (e) {
        console.warn("Ton konnte nicht abgespielt werden:", e);
      }
    }
  };

  // UserScripte/src/storage/storage-service.js
  var STORAGE_KEY = "dsAuto.readerState.v1";
  var StorageService = class {
    loadAll() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? sanitizeStoredState(JSON.parse(raw)) : {};
      } catch (error) {
        console.warn("[DS Auto] Speicher konnte nicht gelesen werden", error);
        return {};
      }
    }
    merge(patch) {
      const current = this.loadAll();
      const next = deepMerge(current, patch || {});
      this.saveAll(next);
      return next;
    }
    saveAll(value) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value || {}));
      } catch (error) {
        console.warn("[DS Auto] Speicher konnte nicht geschrieben werden", error);
      }
    }
  };
  function mergeInto(target, patch) {
    if (!target || !patch) return target;
    deepMerge(target, patch);
    return target;
  }
  function sanitizeStoredState(state) {
    if (state?.village?.resourceProductionPerSecond) {
      delete state.village.resourceProductionPerSecond;
    }
    return state || {};
  }
  function deepMerge(target, patch) {
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (isPlainObject(value)) {
        if (!isPlainObject(target[key])) target[key] = {};
        deepMerge(target[key], value);
        return;
      }
      target[key] = value;
    });
    return target;
  }
  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  // UserScripte/src/core/reader-orchestrator.js
  var ReaderOrchestrator = class {
    constructor(state, { storage, readers = [], hooks = {} }) {
      this.state = state;
      this.storage = storage;
      this.readers = readers;
      this.hooks = hooks;
    }
    hydrate() {
      const storedState = this.storage.loadAll();
      mergeInto(this.state, storedState);
      this.hooks.onUpdated?.();
    }
    readCurrentPage() {
      if (this.state.runtime.botProtectionTriggered) return null;
      const patches = this.readers.filter((reader) => reader.supports(this.state.page)).map((reader) => reader.read()).filter(Boolean);
      if (patches.length === 0) return null;
      const pagePatch = patches.reduce((result, patch) => mergeInto(result, patch), {});
      const storedState = this.storage.merge(pagePatch);
      mergeInto(this.state, storedState);
      this.hooks.onUpdated?.();
      return pagePatch;
    }
  };

  // UserScripte/src/readers/barracks-reader.js
  var BARRACKS_UNITS = ["spear", "sword", "axe", "archer"];
  var BarracksReader = class {
    supports(page) {
      return page.screen === "barracks";
    }
    read() {
      const units = {};
      BARRACKS_UNITS.forEach((unit) => {
        const row = this.getUnitRow(unit);
        if (!row) return;
        units[unit] = this.readUnit(row, unit);
      });
      return {
        barracks: {
          lastReadAt: Date.now(),
          units
        }
      };
    }
    getUnitRow(unit) {
      const input = document.querySelector(`#train_form input[name="${unit}"], #train_form input[data-unit="${unit}"]`);
      if (input) return input.closest("tr");
      const unitLink = document.querySelector(`#train_form .unit_link[data-unit="${unit}"]`);
      return unitLink?.closest("tr") || null;
    }
    readUnit(row, unit) {
      const counts = this.readUnitCounts(row);
      return {
        inVillage: counts.inVillage,
        total: counts.total,
        maxRecruitable: this.readMaxRecruitable(row, unit),
        costs: this.readCosts(unit),
        buildTime: this.readText(`#${unit}_0_cost_time`)
      };
    }
    readUnitCounts(row) {
      const countCell = row.querySelector("td:nth-child(3)");
      const text = countCell?.textContent || "";
      const match = text.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      if (!match) {
        const value = parseCompactNumber(text);
        return { inVillage: value, total: value };
      }
      return {
        inVillage: parseCompactNumber(match[1]),
        total: parseCompactNumber(match[2])
      };
    }
    readMaxRecruitable(row, unit) {
      const link = row.querySelector(`#${unit}_0_a`) || row.querySelector('a[href*="set_max"]');
      const match = (link?.textContent || "").match(/\((\d+)\)/);
      return match ? Number(match[1]) : 0;
    }
    readCosts(unit) {
      return {
        wood: parseCompactNumber(this.readText(`#${unit}_0_cost_wood`)),
        stone: parseCompactNumber(this.readText(`#${unit}_0_cost_stone`)),
        iron: parseCompactNumber(this.readText(`#${unit}_0_cost_iron`)),
        population: parseCompactNumber(this.readText(`#${unit}_0_cost_pop`))
      };
    }
    readText(selector) {
      return document.querySelector(selector)?.textContent?.trim() || "";
    }
  };
  function parseCompactNumber(value) {
    const normalized = String(value || "").replace(/\./g, "").replace(/[^\d-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // UserScripte/src/utils/time.js
  function parseCountdownMs(text) {
    const match = (text || "").match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    const first = Number(match[1]);
    const second = Number(match[2]);
    const third = match[3] === void 0 ? null : Number(match[3]);
    if (third === null) return (first * 60 + second) * 1e3;
    return (first * 60 * 60 + second * 60 + third) * 1e3;
  }
  function formatDuration(ms) {
    if (!Number.isFinite(ms)) return "-";
    if (ms <= 0) return "jetzt";
    const totalSeconds = Math.ceil(ms / 1e3);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  // UserScripte/src/readers/main-building-reader.js
  var MainBuildingReader = class {
    supports(page) {
      return page.screen === "main";
    }
    read() {
      return {
        mainBuilding: {
          lastReadAt: Date.now(),
          levels: this.readLevels(),
          queue: this.readBuildQueue(),
          upgradeInfo: this.readUpgradeInfo()
        }
      };
    }
    readLevels() {
      const fromGameData = this.readLevelsFromGameData();
      if (Object.keys(fromGameData).length > 0) return fromGameData;
      return this.readLevelsFromRows();
    }
    readLevelsFromGameData() {
      const buildings = window.game_data?.village?.buildings || window.BuildingMain?.buildings || {};
      return Object.fromEntries(
        Object.entries(buildings).map(([key, value]) => {
          const level = typeof value === "object" ? value.level : value;
          return [key, Number(level)];
        }).filter(([, level]) => Number.isFinite(level))
      );
    }
    readLevelsFromRows() {
      const levels = {};
      document.querySelectorAll('#buildings tr[id^="main_buildrow_"]').forEach((row) => {
        const building = row.id.replace("main_buildrow_", "");
        const levelText = Array.from(row.querySelectorAll("span")).map((node) => node.textContent || "").find((text) => /Stufe\s+\d+/i.test(text));
        const match = (levelText || "").match(/Stufe\s+(\d+)/i);
        if (match) levels[building] = Number(match[1]);
      });
      return levels;
    }
    readUpgradeInfo() {
      const buildings = window.BuildingMain?.buildings || {};
      return Object.fromEntries(
        Object.entries(buildings).map(([building, info]) => [building, this.normalizeUpgradeInfo(info)]).filter(([, info]) => info)
      );
    }
    normalizeUpgradeInfo(info) {
      if (!info || typeof info !== "object") return null;
      return {
        name: info.name || "",
        level: toNumber(info.level),
        nextLevel: toNumber(info.level_next),
        maxLevel: toNumber(info.max_level),
        canBuild: Boolean(info.can_build),
        error: info.error || null,
        forecastAt: toTimestamp(info.forecast?.when),
        costs: {
          wood: toNumber(info.wood),
          stone: toNumber(info.stone),
          iron: toNumber(info.iron),
          population: toNumber(info.pop)
        },
        factors: {
          wood: toNumber(info.wood_factor),
          stone: toNumber(info.stone_factor),
          iron: toNumber(info.iron_factor),
          population: toNumber(info.pop_factor)
        },
        buildTimeSeconds: toNumber(info.build_time)
      };
    }
    readBuildQueue() {
      return Array.from(document.querySelectorAll('#build_queue tr[class*="buildorder_"]')).map((row, index) => this.readQueueRow(row, index)).filter(Boolean);
    }
    readQueueRow(row, index) {
      const classMatch = row.className.match(/buildorder_([a-z_]+)/);
      const building = classMatch?.[1] || "";
      const cells = row.querySelectorAll("td");
      const constructionCell = cells[0];
      const durationCell = cells[1];
      const finishCell = cells[2];
      const constructionText = normalizeText(constructionCell?.textContent || "");
      const targetLevel = readTargetLevel(constructionText);
      const durationText = normalizeText(durationCell?.textContent || "");
      const finishText = normalizeText(finishCell?.textContent || "");
      const finishAt = this.readFinishAt(durationCell, durationText);
      if (!building && !targetLevel && !finishAt) return null;
      return {
        index: index + 1,
        building,
        name: readBuildingName(constructionText),
        targetLevel,
        durationText,
        finishText,
        finishAt
      };
    }
    readFinishAt(durationCell, durationText) {
      const timer = durationCell?.querySelector("[data-endtime]");
      const dataEndTime = Number(timer?.getAttribute("data-endtime"));
      if (Number.isFinite(dataEndTime) && dataEndTime > 0) return dataEndTime * 1e3;
      const countdownMs = parseCountdownMs(durationText);
      return countdownMs ? Date.now() + countdownMs : null;
    }
  };
  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function readTargetLevel(text) {
    const match = String(text || "").match(/Stufe\s+(\d+)/i);
    return match ? Number(match[1]) : null;
  }
  function readBuildingName(text) {
    return String(text || "").replace(/Stufe\s+\d+/i, "").trim();
  }
  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  function toTimestamp(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    return number < 1e10 ? number * 1e3 : number;
  }

  // UserScripte/src/readers/scavenge-reader.js
  var OPTION_NAMES = {
    1: "Faule Sammler",
    2: "Bescheidene Sammler",
    3: "Kluge Sammler",
    4: "Grossartige Sammler"
  };
  var ScavengeReader = class {
    supports(page) {
      return page.screen === "place" && page.mode === "scavenge";
    }
    read() {
      const fromGameData = this.readFromGameData();
      const readyTimes = Object.keys(fromGameData.readyTimes).length > 0 ? fromGameData.readyTimes : this.readFromDom();
      const nextReadyAt = Object.values(readyTimes).filter((timestamp) => timestamp > Date.now()).sort((a, b) => a - b)[0] || null;
      return {
        scavenge: {
          lastReadAt: Date.now(),
          readyTimes,
          nextReadyAt,
          activeCount: Object.keys(readyTimes).length,
          homeUnits: fromGameData.homeUnits,
          squads: fromGameData.squads
        }
      };
    }
    readFromGameData() {
      const village = this.getVillageData();
      const result = {
        readyTimes: {},
        homeUnits: {},
        squads: {}
      };
      if (!village) return result;
      result.homeUnits = village.unit_counts_home || {};
      Object.entries(village.options || {}).forEach(([optionId, option]) => {
        const squad = option?.scavenging_squad;
        if (!squad) return;
        const timestamp = Number(squad.return_time) * 1e3;
        if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return;
        result.readyTimes[optionId] = timestamp;
        result.squads[optionId] = {
          id: optionId,
          name: OPTION_NAMES[optionId] || `Slot ${optionId}`,
          returnAt: timestamp,
          units: squad.unit_counts || {},
          carryMax: Number(squad.carry_max || 0),
          loot: squad.loot_res || {}
        };
      });
      return result;
    }
    getVillageData() {
      if (window.village?.options) return window.village;
      const scriptText = Array.from(document.scripts).map((script) => script.textContent || "").find((text) => text.includes("var village =") && text.includes("scavenging_squad"));
      if (!scriptText) return null;
      const match = scriptText.match(/var\s+village\s*=\s*(\{[\s\S]*?\});/);
      if (!match) return null;
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        console.warn("[DS Auto] Raubzugdaten konnten nicht aus Seiten-JSON gelesen werden", error);
        return null;
      }
    }
    readFromDom() {
      const result = {};
      const options = Array.from(document.querySelectorAll(".scavenge-option"));
      options.forEach((option, fallbackIndex) => {
        const optionId = this.getOptionId(option, fallbackIndex);
        const timestamps = Array.from(option.querySelectorAll(
          ".return-countdown, .timer, [data-endtime], [data-end-time]"
        )).map((element) => this.getElementEndTime(element)).filter((timestamp) => timestamp && timestamp > Date.now());
        if (timestamps.length > 0) result[optionId] = Math.min(...timestamps);
      });
      return result;
    }
    getOptionId(option, fallbackIndex) {
      const fromData = option.getAttribute("data-option-id") || option.dataset?.optionId;
      if (fromData) return String(fromData);
      const classMatch = option.className.match(/option-(\d+)/);
      if (classMatch) return classMatch[1];
      return String(fallbackIndex + 1);
    }
    getElementEndTime(element) {
      const dataValue = element.getAttribute("data-endtime") || element.getAttribute("data-end-time") || element.dataset?.endtime || element.dataset?.endTime;
      if (dataValue) {
        const numeric = Number(dataValue);
        if (Number.isFinite(numeric)) {
          const timestamp = numeric < 1e10 ? numeric * 1e3 : numeric;
          if (timestamp > Date.now()) return timestamp;
        }
      }
      const countdownMs = parseCountdownMs(element.textContent || "");
      return countdownMs ? Date.now() + countdownMs : null;
    }
  };

  // UserScripte/src/readers/stable-reader.js
  var STABLE_UNITS = ["spy", "light", "marcher", "heavy"];
  var StableReader = class {
    supports(page) {
      return page.screen === "stable";
    }
    read() {
      const units = {};
      STABLE_UNITS.forEach((unit) => {
        const row = this.getUnitRow(unit);
        if (!row) return;
        units[unit] = this.readUnit(row, unit);
      });
      return {
        stable: {
          lastReadAt: Date.now(),
          units
        }
      };
    }
    getUnitRow(unit) {
      const input = document.querySelector(`#train_form input[name="${unit}"], #train_form input[data-unit="${unit}"]`);
      if (input) return input.closest("tr");
      const unitLink = document.querySelector(`#train_form .unit_link[data-unit="${unit}"]`);
      return unitLink?.closest("tr") || null;
    }
    readUnit(row, unit) {
      const counts = this.readUnitCounts(row);
      return {
        inVillage: counts.inVillage,
        total: counts.total,
        maxRecruitable: this.readMaxRecruitable(row, unit),
        costs: this.readCosts(unit),
        buildTime: this.readText(`#${unit}_0_cost_time`)
      };
    }
    readUnitCounts(row) {
      const countCell = row.querySelector("td:nth-child(3)");
      const text = countCell?.textContent || "";
      const match = text.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      if (!match) {
        const value = parseCompactNumber2(text);
        return { inVillage: value, total: value };
      }
      return {
        inVillage: parseCompactNumber2(match[1]),
        total: parseCompactNumber2(match[2])
      };
    }
    readMaxRecruitable(row, unit) {
      const link = row.querySelector(`#${unit}_0_a`) || row.querySelector('a[href*="set_max"]');
      const match = (link?.textContent || "").match(/\((\d+)\)/);
      return match ? Number(match[1]) : 0;
    }
    readCosts(unit) {
      return {
        wood: parseCompactNumber2(this.readText(`#${unit}_0_cost_wood`)),
        stone: parseCompactNumber2(this.readText(`#${unit}_0_cost_stone`)),
        iron: parseCompactNumber2(this.readText(`#${unit}_0_cost_iron`)),
        population: parseCompactNumber2(this.readText(`#${unit}_0_cost_pop`))
      };
    }
    readText(selector) {
      return document.querySelector(selector)?.textContent?.trim() || "";
    }
  };
  function parseCompactNumber2(value) {
    const normalized = String(value || "").replace(/\./g, "").replace(/[^\d-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // UserScripte/src/readers/village-reader.js
  var VillageReader = class {
    supports() {
      return true;
    }
    read() {
      const village = window.game_data?.village;
      if (!village) return null;
      const wood = toNumber2(village.wood);
      const stone = toNumber2(village.stone);
      const iron = toNumber2(village.iron);
      const storageMax = toNumber2(village.storage_max);
      const populationUsed = toNumber2(village.pop);
      const populationMax = toNumber2(village.pop_max);
      return {
        village: {
          lastReadAt: Date.now(),
          id: String(village.id || ""),
          name: village.name || "",
          displayName: village.display_name || "",
          coord: village.coord || buildCoord(village),
          resources: {
            wood,
            stone,
            iron,
            storageMax
          },
          resourceProduction: {
            wood: toProductionPerHour(village.wood_prod),
            stone: toProductionPerHour(village.stone_prod),
            iron: toProductionPerHour(village.iron_prod)
          },
          population: {
            used: populationUsed,
            max: populationMax,
            free: Math.max(0, populationMax - populationUsed)
          }
        }
      };
    }
  };
  function buildCoord(village) {
    const x = village?.x;
    const y = village?.y;
    return x !== void 0 && y !== void 0 ? `${x}|${y}` : "";
  }
  function toNumber2(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  function toProductionPerHour(value) {
    return Math.round(toNumber2(value) * 3600);
  }

  // UserScripte/src/utils/page.js
  function readCurrentPage() {
    const params = new URLSearchParams(window.location.search);
    const screen = params.get("screen") || "";
    const mode = params.get("mode") || "";
    return {
      name: getPageName(screen, mode),
      screen,
      mode,
      villageId: params.get("village")
    };
  }
  function getPageName(screen, mode) {
    if (screen === "place" && mode === "scavenge") return "Raubzuege";
    if (screen === "barracks") return "Kaserne";
    if (screen === "stable") return "Stall";
    if (screen === "main") return "Hauptgebaeude";
    if (screen === "overview_villages") return "Uebersicht";
    return "Andere";
  }

  // UserScripte/src/ui/status-banner.js
  var StatusBanner = class {
    /**
     * @param {import('../types/global-state.js').AppState} state
     */
    constructor(state) {
      this.state = state;
      this.root = null;
    }
    mount() {
      if (document.getElementById("ds-oo-status-banner")) {
        this.root = document.getElementById("ds-oo-status-banner");
        this.update();
        return;
      }
      this.injectStyle();
      const root = document.createElement("div");
      root.id = "ds-oo-status-banner";
      root.innerHTML = `
      <div class="ds-oo-title">DS Auto</div>
      <div class="ds-oo-line"><span>Seite</span><strong data-field="page">-</strong></div>
      <div class="ds-oo-line"><span>Raubzug</span><strong data-field="raid">-</strong></div>
      <div class="ds-oo-line ds-oo-line-top"><span>Fertig</span><strong class="ds-oo-multiline" data-field="scavengeFinished">-</strong></div>
      <div class="ds-oo-line"><span>Rekrutierung</span><strong data-field="recruit">-</strong></div>
      <div class="ds-oo-line"><span>Status</span><strong data-field="status">-</strong></div>
      <div class="ds-oo-actions">
        <button type="button" data-action="build-config">Ausbau</button>
        <button type="button" data-action="training-config">Ausbildung</button>
      </div>
    `;
      document.body.appendChild(root);
      this.root = root;
      this.update();
    }
    update() {
      if (!this.root) return;
      this.setField("page", this.state.page.name);
      this.setField("raid", this.formatRaidStatus());
      this.setField("scavengeFinished", this.formatScavengeFinished());
      this.setField("recruit", this.state.recruit.enabled ? "aktiv" : "aus");
      this.setField("status", this.state.runtime.botProtectionTriggered ? "gestoppt" : "ok");
    }
    onConfigureTraining(callback) {
      this.root?.addEventListener("click", (event) => {
        if (!event.target?.matches?.('[data-action="training-config"]')) return;
        callback?.();
      });
    }
    onConfigureBuild(callback) {
      this.root?.addEventListener("click", (event) => {
        if (!event.target?.matches?.('[data-action="build-config"]')) return;
        callback?.();
      });
    }
    formatRaidStatus() {
      if (!this.state.raid.enabled) return "aus";
      const activeCount = this.getActiveReadyEntries().length;
      return activeCount > 0 ? `${activeCount} unterwegs` : "bereit";
    }
    formatScavengeFinished() {
      const lines = [1, 2, 3, 4].map((slot) => this.formatScavengeSlotLine(slot)).filter(Boolean);
      return lines.length > 0 ? lines.join("\n") : "-";
    }
    formatScavengeSlotLine(slot) {
      const timestamp = Number(this.state.scavenge.readyTimes?.[slot]);
      if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return null;
      return `${slot}: ${formatDuration(timestamp - Date.now())}`;
    }
    getActiveReadyEntries() {
      return Object.entries(this.state.scavenge.readyTimes || {}).map(([slot, timestamp]) => [slot, Number(timestamp)]).filter(([, timestamp]) => Number.isFinite(timestamp) && timestamp > Date.now());
    }
    setField(name, value) {
      const node = this.root?.querySelector(`[data-field="${name}"]`);
      if (node) node.textContent = String(value);
    }
    injectStyle() {
      if (document.getElementById("ds-oo-status-style")) return;
      const style = document.createElement("style");
      style.id = "ds-oo-status-style";
      style.textContent = `
      #ds-oo-status-banner {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 99999;
        width: 230px;
        padding: 10px;
        border: 1px solid #6f5635;
        background: rgba(248, 244, 232, 0.96);
        color: #2f2417;
        font: 12px Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
      }
      #ds-oo-status-banner .ds-oo-title {
        margin-bottom: 6px;
        font-weight: bold;
        font-size: 13px;
        color: #5b2d14;
      }
      #ds-oo-status-banner .ds-oo-line {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        line-height: 1.55;
        white-space: nowrap;
      }
      #ds-oo-status-banner .ds-oo-line-top {
        align-items: flex-start;
      }
      #ds-oo-status-banner .ds-oo-line span {
        flex: 0 0 auto;
        color: #6f5635;
      }
      #ds-oo-status-banner .ds-oo-line strong {
        overflow: hidden;
        max-width: 128px;
        text-align: right;
        text-overflow: ellipsis;
      }
      #ds-oo-status-banner .ds-oo-multiline {
        white-space: pre-line;
        line-height: 1.35;
      }
      #ds-oo-status-banner .ds-oo-actions {
        display: flex;
        justify-content: flex-end;
        gap: 5px;
        margin-top: 8px;
        text-align: right;
      }
      #ds-oo-status-banner button {
        padding: 2px 8px;
        border: 1px solid #8c6d3f;
        background: #f5e6bd;
        color: #2f2417;
        font: 12px Arial, sans-serif;
        cursor: pointer;
      }
    `;
      document.head.appendChild(style);
    }
  };

  // UserScripte/src/ui/build-config-modal.js
  var BUILDING_LABELS = {
    main: "Hauptgebaeude",
    barracks: "Kaserne",
    stable: "Stall",
    garage: "Werkstatt",
    smith: "Schmiede",
    place: "Versammlungsplatz",
    market: "Marktplatz",
    wood: "Holz",
    stone: "Lehm",
    iron: "Eisen",
    farm: "Bauernhof",
    storage: "Speicher",
    hide: "Versteck",
    wall: "Wall",
    snob: "Adelshof"
  };
  var BUILDING_ORDER = [
    "main",
    "barracks",
    "stable",
    "garage",
    "smith",
    "place",
    "market",
    "wood",
    "stone",
    "iron",
    "farm",
    "storage",
    "hide",
    "wall",
    "snob"
  ];
  var BuildConfigModal = class {
    constructor(state, storage, hooks = {}) {
      this.state = state;
      this.storage = storage;
      this.hooks = hooks;
    }
    open() {
      this.close();
      this.injectStyle();
      const overlay = document.createElement("div");
      overlay.id = "ds-build-config-overlay";
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
      overlay.addEventListener("click", (event) => this.handleClick(event));
    }
    close() {
      document.getElementById("ds-build-config-overlay")?.remove();
    }
    renderCurrentQueue() {
      const queue = this.state.mainBuilding?.queue || [];
      if (queue.length === 0) return '<div class="ds-build-empty">Keine Bauauftraege gespeichert.</div>';
      return `
      <table class="ds-build-table">
        <thead><tr><th>#</th><th>Gebaeude</th><th>Ziel</th><th>Fertig</th></tr></thead>
        <tbody>
          ${queue.map((item) => `
            <tr>
              <td>${item.index}</td>
              <td>${this.getBuildingLabel(item.building, item.name)}</td>
              <td>${formatLevel(item.targetLevel)}</td>
              <td>${item.finishText || "-"}</td>
            </tr>
          `).join("")}
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
              <td>${formatCosts(item.costs)}${item.costsEstimated ? " *" : ""}</td>
              <td><button type="button" data-action="remove-plan" data-id="${item.id}">Entfernen</button></td>
            </tr>
          `).join("")}
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
          ${buildings.map((building) => {
        const nextLevel = this.getNextTargetLevel(building);
        const costs = this.getUpgradeCosts(building, nextLevel);
        return `
              <tr>
                <td>${this.getBuildingLabel(building)}</td>
                <td>${this.getBaseLevel(building)}</td>
                <td>${formatLevel(nextLevel)}</td>
                <td>${formatCosts(costs.costs)}${costs.estimated ? " *" : ""}</td>
                <td><button type="button" data-action="add-upgrade" data-building="${building}">Upgrade</button></td>
              </tr>
            `;
      }).join("")}
        </tbody>
      </table>
    `;
    }
    handleClick(event) {
      const action = event.target?.getAttribute?.("data-action");
      if (!action) return;
      if (action === "close") {
        this.close();
        return;
      }
      if (action === "clear-plan") {
        this.savePlan([]);
        this.open();
        return;
      }
      if (action === "remove-plan") {
        const id = event.target.getAttribute("data-id");
        this.savePlan(this.getPlannedQueue().filter((item) => item.id !== id));
        this.open();
        return;
      }
      if (action === "add-upgrade") {
        const building = event.target.getAttribute("data-building");
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
      return [...normalQueue, ...plannedQueue].filter((item) => item.building === building).map((item) => Number(item.targetLevel || 0)).filter((level) => Number.isFinite(level)).reduce((max, level) => Math.max(max, level), 0);
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
    getBuildingLabel(building, fallback = "") {
      return BUILDING_LABELS[building] || fallback || building || "-";
    }
    injectStyle() {
      if (document.getElementById("ds-build-config-style")) return;
      const style = document.createElement("style");
      style.id = "ds-build-config-style";
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
  };
  function formatLevel(level) {
    const number = Number(level);
    return Number.isFinite(number) && number > 0 ? `Stufe ${number}` : "-";
  }
  function formatCosts(costs) {
    if (!costs) return "-";
    return [
      `H ${formatNumber(costs.wood)}`,
      `L ${formatNumber(costs.stone)}`,
      `E ${formatNumber(costs.iron)}`,
      `B ${formatNumber(costs.population)}`
    ].join(" | ");
  }
  function formatNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString("de-DE") : "0";
  }
  function estimateCost(baseCost, factor, levelDiff) {
    const cost = Number(baseCost || 0);
    const costFactor = Number(factor || 1);
    if (!Number.isFinite(cost) || !Number.isFinite(costFactor)) return 0;
    return Math.round(cost * Math.pow(costFactor, levelDiff));
  }

  // UserScripte/src/ui/training-config-modal.js
  var TRAINING_UNITS = [
    { key: "spear", label: "Speer" },
    { key: "sword", label: "Schwert" },
    { key: "axe", label: "Axt" },
    { key: "archer", label: "Bogen" },
    { key: "spy", label: "Spaeher" },
    { key: "light", label: "LKav" },
    { key: "marcher", label: "Beritt. Bogen" },
    { key: "heavy", label: "SKav" }
  ];
  var TrainingConfigModal = class {
    constructor(state, storage, hooks = {}) {
      this.state = state;
      this.storage = storage;
      this.hooks = hooks;
    }
    open() {
      this.close();
      this.injectStyle();
      const overlay = document.createElement("div");
      overlay.id = "ds-training-config-overlay";
      overlay.innerHTML = `
      <div class="ds-training-modal">
        <div class="ds-training-header">
          <strong>Ausbildungs-Konfiguration</strong>
          <button type="button" data-action="close">Schliessen</button>
        </div>
        <div class="ds-training-options">
          <label class="ds-training-toggle">
            <input type="checkbox" data-field="recruit-enabled" ${this.state.recruit.enabled ? "checked" : ""}>
            <span>Auto-Rekrutierung aktiv</span>
          </label>
          <label class="ds-training-limit">
            <span>Max. Queuezeit</span>
            <input type="number" min="0" step="1" data-field="max-queue-time-minutes" value="${numberValue(this.state.training?.maxQueueTimeMinutes)}">
            <span>Minuten</span>
          </label>
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
            ${TRAINING_UNITS.map((unit) => this.renderRow(unit)).join("")}
          </tbody>
        </table>
        <div class="ds-training-actions">
          <button type="button" data-action="reset">Zuruecksetzen</button>
          <button type="button" data-action="save">Speichern</button>
        </div>
      </div>
    `;
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (event) => this.handleClick(event));
    }
    close() {
      document.getElementById("ds-training-config-overlay")?.remove();
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
      const total = this.state.barracks?.units?.[unit]?.total ?? this.state.stable?.units?.[unit]?.total;
      return Number.isFinite(Number(total)) ? String(Number(total)) : "n.a.";
    }
    handleClick(event) {
      const action = event.target?.getAttribute?.("data-action");
      if (!action) return;
      if (action === "close") {
        this.close();
        return;
      }
      if (action === "reset") {
        this.save({ enabled: false, training: { maxQueueTimeMinutes: 0, units: createEmptyTrainingUnits() } });
        this.open();
        return;
      }
      if (action === "save") {
        this.save(this.readForm());
        this.close();
      }
    }
    readForm() {
      const units = {};
      document.querySelectorAll("#ds-training-config-overlay tr[data-unit]").forEach((row) => {
        const unit = row.getAttribute("data-unit");
        units[unit] = {
          target: readNumber(row, "target"),
          batch: readNumber(row, "batch")
        };
      });
      return {
        enabled: Boolean(document.querySelector('#ds-training-config-overlay [data-field="recruit-enabled"]')?.checked),
        training: {
          maxQueueTimeMinutes: readInputNumber("max-queue-time-minutes"),
          units
        }
      };
    }
    save(config) {
      const patch = {
        recruit: {
          enabled: config.enabled
        },
        training: config.training
      };
      this.storage.merge(patch);
      this.state.recruit.enabled = config.enabled;
      this.state.training = config.training;
      this.hooks.onSaved?.();
    }
    injectStyle() {
      if (document.getElementById("ds-training-config-style")) return;
      const style = document.createElement("style");
      style.id = "ds-training-config-style";
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
        width: 620px;
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
      #ds-training-config-overlay .ds-training-options {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0 8px 8px;
      }
      #ds-training-config-overlay .ds-training-toggle,
      #ds-training-config-overlay .ds-training-limit {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: bold;
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
      #ds-training-config-overlay input[type="number"] {
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
  };
  function readNumber(row, field) {
    const value = Number(row.querySelector(`[data-field="${field}"]`)?.value || 0);
    return normalizePositiveInteger(value);
  }
  function readInputNumber(field) {
    const value = Number(document.querySelector(`#ds-training-config-overlay [data-field="${field}"]`)?.value || 0);
    return normalizePositiveInteger(value);
  }
  function normalizePositiveInteger(value) {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  function numberValue(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? String(Math.floor(number)) : "0";
  }
  function createEmptyTrainingUnits() {
    return Object.fromEntries(
      TRAINING_UNITS.map((unit) => [unit.key, { target: 0, batch: 0 }])
    );
  }

  // UserScripte/src/app.js
  var App = class {
    constructor() {
      this.state = createDefaultState();
      this.storage = new StorageService();
      this.banner = new StatusBanner(this.state);
      this.buildConfigModal = new BuildConfigModal(this.state, this.storage, {
        onSaved: () => this.banner.update()
      });
      this.trainingConfigModal = new TrainingConfigModal(this.state, this.storage, {
        onSaved: () => this.banner.update()
      });
      this.botProtection = new BotProtectionService(this.state, {
        onChecked: () => this.banner.update(),
        onTriggered: () => this.banner.update()
      });
      this.readerOrchestrator = new ReaderOrchestrator(this.state, {
        storage: this.storage,
        readers: [
          new VillageReader(),
          new ScavengeReader(),
          new MainBuildingReader(),
          new BarracksReader(),
          new StableReader()
        ],
        hooks: {
          onUpdated: () => this.banner.update()
        }
      });
      this.bannerIntervalId = null;
    }
    start() {
      this.state.page = readCurrentPage();
      this.readerOrchestrator.hydrate();
      this.banner.mount();
      this.banner.onConfigureBuild(() => this.buildConfigModal.open());
      this.banner.onConfigureTraining(() => this.trainingConfigModal.open());
      this.botProtection.start();
      this.readerOrchestrator.readCurrentPage();
      this.startBannerTicker();
    }
    startBannerTicker() {
      if (this.bannerIntervalId) return;
      this.bannerIntervalId = window.setInterval(() => {
        this.banner.update();
      }, 1e3);
    }
  };

  // UserScripte/src/main.js
  console.info("[DS Auto] Userscript geladen", window.location.href);
  function startApp() {
    try {
      const app = new App();
      window.dsAutoApp = app;
      app.start();
      console.info("[DS Auto] App gestartet", app.state.page);
    } catch (error) {
      console.error("[DS Auto] Start fehlgeschlagen", error);
    }
  }
  if (document.body) {
    startApp();
  } else {
    window.addEventListener("DOMContentLoaded", startApp, { once: true });
  }
})();
