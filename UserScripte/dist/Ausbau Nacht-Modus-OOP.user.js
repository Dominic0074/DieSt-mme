// ==UserScript==
// @name         Ausbau Nacht-Modus OOP
// @namespace    http://tampermonkey.net/
// @version      0.1.10
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
        return raw ? JSON.parse(raw) : {};
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
    `;
      document.head.appendChild(style);
    }
  };

  // UserScripte/src/app.js
  var App = class {
    constructor() {
      this.state = createDefaultState();
      this.storage = new StorageService();
      this.banner = new StatusBanner(this.state);
      this.botProtection = new BotProtectionService(this.state, {
        onChecked: () => this.banner.update(),
        onTriggered: () => this.banner.update()
      });
      this.readerOrchestrator = new ReaderOrchestrator(this.state, {
        storage: this.storage,
        readers: [
          new ScavengeReader()
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
