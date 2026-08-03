// ==UserScript==
// @name         AngriffsPlaner
// @namespace    https://github.com/Dominic0074/DieSt-mme
// @version      0.1.1
// @description  Liest DS-Ultimate-Angriffsplaene aus, speichert sie lokal und sendet per Monitor zur Send Time.
// @author       kk
// @match        https://ds-ultimate.de/tools/*/attackPlanner/*
// @match        https://ds-ultimate.de/de/*/tools/attackPlanner*
// @match        https://*.die-staemme.de/game.php*
// @match        https://die-staemme.de/game.php*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/AngriffsPlaner/dist/AngriffsPlaner.user.js
// @downloadURL  https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/AngriffsPlaner/dist/AngriffsPlaner.user.js
// ==/UserScript==

(() => {
  // AngriffsPlaner/src/config/config.js
  var CONFIG = Object.freeze({
    prepareSeconds: 60,
    maxLateMs: 1500,
    confirmTimeoutMs: 1e4,
    watcherWindowName: "ds-angriffs-planer-watch",
    storageKey: "ds_angriffs_planer_state_v1",
    defaultUnitTemplate: Object.freeze({
      spear: 0,
      sword: 0,
      axe: 0,
      archer: 0,
      spy: 0,
      light: 0,
      marcher: 0,
      heavy: 0,
      ram: 0,
      catapult: 0,
      knight: 0,
      snob: 0,
      militia: 0
    })
  });

  // AngriffsPlaner/src/core/attack-command-service.js
  var AttackCommandService = class {
    getForm() {
      return document.querySelector("#command-data-form");
    }
    isConfirmationPage() {
      return Boolean(this.getForm()?.querySelector("#troop_confirm_submit"));
    }
    fillFirstForm(attack, units) {
      const form = this.getForm();
      const attackButton = form?.querySelector('#target_attack, [name="attack"]');
      if (!form || !attackButton) {
        return { error: "Befehlsformular oder Angreifen-Button wurde nicht gefunden." };
      }
      for (const [unit, rawAmount] of Object.entries(units)) {
        const amount = Number(rawAmount);
        if (!Number.isInteger(amount) || amount < 0) {
          return { error: `Die Truppenanzahl fuer "${unit}" ist ungueltig.` };
        }
        if (amount === 0) continue;
        const input = form.querySelector(`[name="${unit}"]`);
        if (!input) {
          return { error: `Das Eingabefeld fuer "${unit}" ist in diesem Dorf nicht vorhanden.` };
        }
        this.setInputValue(input, amount);
      }
      if (attack.target) {
        const xInput = form.querySelector('[name="x"]');
        const yInput = form.querySelector('[name="y"]');
        if (!xInput || !yInput) {
          return { error: "Die Eingabefelder fuer die Zielkoordinaten wurden nicht gefunden." };
        }
        this.setInputValue(xInput, attack.target.x);
        this.setInputValue(yInput, attack.target.y);
      }
      return { form, button: attackButton };
    }
    getConfirmationControls() {
      const form = this.getForm();
      const button = form?.querySelector(
        '#troop_confirm_submit[name="submit_confirm"], #troop_confirm_submit'
      );
      return form && button ? { form, button } : { error: "Bestaetigungsformular oder finaler Senden-Button wurde nicht gefunden." };
    }
    submit(form, button) {
      if (typeof form.requestSubmit === "function") form.requestSubmit(button);
      else button.click();
    }
    setInputValue(input, value) {
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  // AngriffsPlaner/src/utils/page.js
  function getCurrentVillageId() {
    return new URLSearchParams(location.search).get("village");
  }
  function getCurrentScreen() {
    return new URLSearchParams(location.search).get("screen") || "";
  }
  function hasMode() {
    return new URLSearchParams(location.search).has("mode");
  }
  function buildPlaceUrl(villageId) {
    const params = new URLSearchParams();
    if (villageId) params.set("village", villageId);
    params.set("screen", "place");
    return `${location.origin}${location.pathname}?${params.toString()}`;
  }
  function isDsUltimateAttackPlannerPage() {
    return location.hostname.endsWith("ds-ultimate.de") && location.pathname.includes("/attackPlanner/");
  }
  function isTribalWarsPage() {
    return /(^|\.)die-staemme\.de$/.test(location.hostname) && location.pathname.endsWith("/game.php");
  }

  // AngriffsPlaner/src/utils/time.js
  function getServerNow() {
    const timingNow = Number(window.Timing?.getCurrentServerTime?.());
    if (Number.isFinite(timingNow) && timingNow > 0) {
      return timingNow < 1e12 ? timingNow * 1e3 : timingNow;
    }
    return Date.now();
  }
  function parseServerTime(value) {
    const text = stripHtml(value).replace(/\s+/g, " ").trim();
    const isoMatch = text.match(
      /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/
    );
    if (isoMatch) return buildLocalTime(isoMatch);
    const deMatch = text.match(
      /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/
    );
    if (deMatch) {
      return buildDate(
        Number(deMatch[3]),
        Number(deMatch[2]),
        Number(deMatch[1]),
        Number(deMatch[4]),
        Number(deMatch[5]),
        Number(deMatch[6]),
        deMatch[7]
      );
    }
    return null;
  }
  function formatDateTime(timestamp) {
    if (!Number.isFinite(timestamp)) return "-";
    const date = new Date(timestamp);
    const pad = (value) => String(value).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
  }
  function formatRemaining(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1e3));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const restSeconds = seconds % 60;
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(restSeconds).padStart(2, "0")
    ].join(":");
  }
  function buildLocalTime(match) {
    return buildDate(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
      match[7]
    );
  }
  function buildDate(year, month, day, hour, minute, second, millisecondText) {
    const millisecond = Number(String(millisecondText || "0").padEnd(3, "0"));
    const date = new Date(year, month - 1, day, hour, minute, second, millisecond);
    const exact = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second;
    return exact ? date.getTime() : null;
  }
  function stripHtml(value) {
    const template = document.createElement("template");
    template.innerHTML = String(value || "");
    return template.content.textContent || "";
  }

  // AngriffsPlaner/src/core/attack-dispatcher.js
  var AttackDispatcher = class {
    constructor({ config, storage, botProtection, onStatus }) {
      this.config = config;
      this.storage = storage;
      this.botProtection = botProtection;
      this.commands = new AttackCommandService();
      this.onStatus = onStatus;
    }
    async resumeOnTribalWarsPage() {
      const state = await this.storage.loadState();
      const attack = state.attacks.find((item) => item.id === state.runtime.activeAttackId);
      if (!attack) return;
      if (this.commands.isConfirmationPage()) {
        await this.submitConfirmation(state, attack);
        return;
      }
      await this.prepareAndSend(state, attack);
    }
    async prepareAndSend(state, attack) {
      const remaining = attack.sendAt - getServerNow();
      if (remaining < -this.config.maxLateMs) {
        this.status(`Angriff ${attack.id}: Send Time verpasst.`);
        await this.storage.patchRuntime({ activeAttackId: null, preparedAttackId: null, firstClickAt: null });
        return;
      }
      const sourceVillageId = this.readSourceVillageId(attack);
      if (sourceVillageId && getCurrentVillageId() !== sourceVillageId) {
        this.status(`Angriff ${attack.id}: wechselt ins Startdorf.`);
        location.href = buildPlaceUrl(sourceVillageId);
        return;
      }
      if (getCurrentScreen() !== "place" || hasMode() || !this.commands.getForm()) {
        this.status(`Angriff ${attack.id}: oeffnet den Versammlungsplatz.`);
        location.href = buildPlaceUrl(sourceVillageId);
        return;
      }
      const units = this.resolveUnits(state, attack);
      const controls = this.commands.fillFirstForm(attack, units);
      if (controls.error) {
        this.status(controls.error, true);
        return;
      }
      if (this.botProtection.checkNow()) {
        this.status("Bot-Schutz erkannt. Versand wurde gestoppt.", true);
        return;
      }
      await this.waitForFirstClick(attack, controls);
    }
    async waitForFirstClick(attack, controls) {
      const remaining = attack.sendAt - getServerNow();
      if (remaining > 1e3) {
        this.status(`Angriff ${attack.id}: Formular bereit, Abschicken in ${formatRemaining(remaining)}.`);
        window.setTimeout(() => this.waitForFirstClick(attack, controls), Math.min(remaining - 500, 1e3));
        return;
      }
      if (remaining > 20) {
        window.setTimeout(() => this.waitForFirstClick(attack, controls), Math.max(1, remaining - 10));
        return;
      }
      if (remaining > 0) {
        window.requestAnimationFrame(() => this.waitForFirstClick(attack, controls));
        return;
      }
      if (-remaining > this.config.maxLateMs) {
        this.status(`Angriff ${attack.id}: ersten Klick um ${Math.round(-remaining)} ms verpasst.`, true);
        return;
      }
      if (this.botProtection.checkNow()) {
        this.status("Bot-Schutz erkannt. Versand wurde gestoppt.", true);
        return;
      }
      await this.storage.patchRuntime({
        preparedAttackId: attack.id,
        firstClickAt: getServerNow()
      });
      this.status(`Angriff ${attack.id}: Bestaetigungsseite wird geoeffnet.`);
      this.commands.submit(controls.form, controls.button);
    }
    async submitConfirmation(state, attack) {
      const controls = this.commands.getConfirmationControls();
      if (controls.error) {
        this.status(controls.error, true);
        return;
      }
      if (state.runtime.preparedAttackId !== attack.id || !Number.isFinite(state.runtime.firstClickAt)) {
        this.status("Bestaetigungsseite gehoert nicht zum vorbereiteten Angriff.", true);
        return;
      }
      const confirmationAge = getServerNow() - state.runtime.firstClickAt;
      if (confirmationAge > this.config.confirmTimeoutMs) {
        this.status(`Bestaetigungsseite brauchte ${Math.round(confirmationAge)} ms. Kein Versand.`, true);
        return;
      }
      if (this.botProtection.checkNow()) {
        this.status("Bot-Schutz erkannt. Versand wurde gestoppt.", true);
        return;
      }
      const sentAttackIds = [.../* @__PURE__ */ new Set([...state.runtime.sentAttackIds || [], attack.id])];
      await this.storage.patchRuntime({
        activeAttackId: null,
        preparedAttackId: null,
        firstClickAt: null,
        sentAttackIds
      });
      this.status(`Angriff ${attack.id}: finaler Klick.`);
      this.commands.submit(controls.form, controls.button);
    }
    resolveUnits(state, attack) {
      return state.templates?.[attack.categoryKey]?.units || attack.units || {};
    }
    readSourceVillageId(attack) {
      const url = attack.playUrl ? new URL(attack.playUrl, location.href) : null;
      return url?.searchParams.get("village") || null;
    }
    status(message, isError = false) {
      this.onStatus?.(message, isError);
      if (isError) console.error(`AngriffsPlaner: ${message}`);
      else console.log(`AngriffsPlaner: ${message}`);
    }
  };

  // AngriffsPlaner/src/core/attack-planner-reader.js
  var UNIT_NAMES = [
    "spear",
    "sword",
    "axe",
    "archer",
    "spy",
    "light",
    "marcher",
    "heavy",
    "ram",
    "catapult",
    "knight",
    "snob",
    "militia"
  ];
  var AttackPlannerReader = class {
    async readAll() {
      const table = this.getDataTable();
      const ajaxUrl = this.getAjaxUrl(table);
      if (!ajaxUrl) {
        throw new Error("DataTables-Ajax-URL wurde nicht gefunden.");
      }
      const rows = await this.fetchRows(ajaxUrl);
      return rows.map((row) => this.mapRow(row)).filter((attack) => attack.id && Number.isFinite(attack.sendAt));
    }
    getDataTable() {
      if (!window.jQuery?.fn?.dataTable?.isDataTable?.("#data1")) return null;
      return window.jQuery("#data1").DataTable();
    }
    getAjaxUrl(table) {
      const tableUrl = table?.ajax?.url?.();
      if (tableUrl) return tableUrl;
      const scripts = [...document.scripts].map((script) => script.textContent || "").join("\n");
      const match = scripts.match(/ajax:\s*['"]([^'"]+attackListItem\/data\/[^'"]+)['"]/);
      return match?.[1] || null;
    }
    async fetchRows(ajaxUrl) {
      const url = new URL(ajaxUrl, location.href);
      const params = new URLSearchParams(url.search);
      params.set("draw", "1");
      params.set("start", "0");
      params.set("length", "10000");
      const columns = [
        "select",
        "start_village_id",
        "attacker",
        "target_village_id",
        "defender",
        "slowest_unit",
        "type",
        "send_time",
        "arrival_time",
        "time",
        "info",
        "action",
        "delete"
      ];
      columns.forEach((column, index) => {
        params.set(`columns[${index}][data]`, column);
        params.set(`columns[${index}][name]`, column);
        params.set(`columns[${index}][searchable]`, "true");
        params.set(`columns[${index}][orderable]`, index >= 10 ? "false" : "true");
        params.set(`columns[${index}][search][value]`, "");
        params.set(`columns[${index}][search][regex]`, "false");
      });
      params.set("order[0][column]", "7");
      params.set("order[0][dir]", "asc");
      params.set("search[value]", "");
      params.set("search[regex]", "false");
      url.search = params.toString();
      const response = await fetch(url.toString(), {
        credentials: "include",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        throw new Error(`Angriffsliste konnte nicht geladen werden (${response.status}).`);
      }
      const payload = await response.json();
      return Array.isArray(payload.data) ? payload.data : [];
    }
    mapRow(row) {
      const rowData = row.DT_RowData || {};
      const sendAt = parseServerTime(row.send_time || row.time || `${rowData.sday || ""} ${rowData.stime || ""}`);
      const arrivalAt = parseServerTime(row.arrival_time || `${rowData.day || ""} ${rowData.time || ""}`);
      const playUrl = this.extractPlayUrl(row.action);
      const target = this.extractCoords(row.target_village_id || rowData.target || playUrl);
      const source = this.extractCoords(row.start_village_id || rowData.start || row.attacker);
      const categoryLabel = this.stripHtml(row.type || rowData.type || "Unbekannt").trim() || "Unbekannt";
      return {
        id: String(row.id || rowData.id || ""),
        source,
        sourceLabel: this.stripHtml(row.attacker || row.start_village_id || ""),
        target,
        targetLabel: this.stripHtml(row.defender || row.target_village_id || ""),
        categoryKey: this.normalizeCategoryKey(categoryLabel),
        categoryLabel,
        slowestUnit: this.stripHtml(row.slowest_unit || ""),
        sendAt,
        arrivalAt,
        playUrl,
        actionHtml: String(row.action || ""),
        info: this.stripHtml(row.info || ""),
        units: this.readUnits(row),
        raw: row
      };
    }
    readUnits(row) {
      const units = {};
      for (const unit of UNIT_NAMES) {
        units[unit] = this.toNonNegativeInteger(row[unit] ?? row.DT_RowData?.[unit] ?? 0);
      }
      return units;
    }
    extractPlayUrl(html) {
      const template = document.createElement("template");
      template.innerHTML = String(html || "");
      const link = [...template.content.querySelectorAll("a[href]")].find((anchor) => {
        const text = `${anchor.textContent || ""} ${anchor.className || ""} ${anchor.innerHTML || ""}`;
        return /play|fa-play|game\.php|screen=place/i.test(text + anchor.href);
      });
      return link ? new URL(link.getAttribute("href"), location.href).toString() : "";
    }
    extractCoords(value) {
      const text = this.stripHtml(value);
      const match = text.match(/(\d{1,3})\|(\d{1,3})/);
      if (!match) return null;
      return {
        x: Number(match[1]),
        y: Number(match[2])
      };
    }
    stripHtml(value) {
      const template = document.createElement("template");
      template.innerHTML = String(value || "");
      return (template.content.textContent || "").replace(/\s+/g, " ").trim();
    }
    normalizeCategoryKey(value) {
      return String(value || "unknown").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
    }
    toNonNegativeInteger(value) {
      const number = Number(value);
      return Number.isInteger(number) && number > 0 ? number : 0;
    }
  };

  // AngriffsPlaner/src/core/bot-protection-service.js
  var BotProtectionService = class {
    constructor(hooks = {}) {
      this.hooks = hooks;
      this.triggered = false;
      this.lastCheckAt = null;
      this.intervalId = null;
      this.checkIntervalMs = 5e3;
    }
    start() {
      if (this.intervalId) return;
      this.checkNow();
      this.intervalId = window.setInterval(() => {
        if (this.triggered) {
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
      this.lastCheckAt = Date.now();
      this.hooks.onChecked?.(this.lastCheckAt);
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
      const bodyClone = document.body?.cloneNode(true);
      bodyClone?.querySelector("#ds-angriffs-planer-panel")?.remove();
      const bodyText = bodyClone?.innerText || "";
      return /du bist ein bot|bot.{0,30}schutz|captcha|bitte best.{0,5}tige|are you human/i.test(bodyText);
    }
    triggerStop() {
      if (this.triggered) return;
      this.triggered = true;
      this.playAlertSound();
      this.hooks.onTriggered?.();
      console.warn(
        "%cBOT-SCHUTZ ERKANNT - AngriffsPlaner gestoppt. Bitte manuell loesen und Seite neu laden.",
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
      } catch (error) {
        console.warn("AngriffsPlaner: Ton konnte nicht abgespielt werden.", error);
      }
    }
  };

  // AngriffsPlaner/src/storage/attack-storage.js
  var AttackStorage = class {
    constructor(storageKey) {
      this.storageKey = storageKey;
    }
    async loadState() {
      const fallback = {
        attacks: [],
        templates: {},
        runtime: {
          running: false,
          activeAttackId: null,
          preparedAttackId: null,
          firstClickAt: null,
          sentAttackIds: []
        },
        updatedAt: null
      };
      const raw = await this.getValue(this.storageKey);
      if (!raw) return fallback;
      try {
        return { ...fallback, ...JSON.parse(raw) };
      } catch {
        return fallback;
      }
    }
    async saveState(state) {
      await this.setValue(this.storageKey, JSON.stringify({
        ...state,
        updatedAt: Date.now()
      }));
    }
    async saveAttacks(attacks) {
      const state = await this.loadState();
      state.attacks = attacks;
      state.templates = this.mergeTemplatesWithCategories(state.templates, attacks);
      await this.saveState(state);
      return state;
    }
    async saveTemplates(templates) {
      const state = await this.loadState();
      state.templates = templates;
      await this.saveState(state);
      return state;
    }
    async patchRuntime(patch) {
      const state = await this.loadState();
      state.runtime = { ...state.runtime, ...patch };
      await this.saveState(state);
      return state;
    }
    mergeTemplatesWithCategories(existingTemplates, attacks) {
      const templates = { ...existingTemplates };
      for (const attack of attacks) {
        if (!attack.categoryKey || templates[attack.categoryKey]) continue;
        templates[attack.categoryKey] = {
          label: attack.categoryLabel,
          units: { ...attack.units }
        };
      }
      return templates;
    }
    async getValue(key) {
      if (typeof GM_getValue === "function") {
        return GM_getValue(key);
      }
      if (typeof GM !== "undefined" && typeof GM.getValue === "function") {
        return GM.getValue(key);
      }
      return localStorage.getItem(key);
    }
    async setValue(key, value) {
      if (typeof GM_setValue === "function") {
        GM_setValue(key, value);
        return;
      }
      if (typeof GM !== "undefined" && typeof GM.setValue === "function") {
        await GM.setValue(key, value);
        return;
      }
      localStorage.setItem(key, value);
    }
  };

  // AngriffsPlaner/src/ui/control-panel.js
  var PANEL_ID = "ds-angriffs-planer-panel";
  var STYLE_ID = "ds-angriffs-planer-panel-style";
  var UNITS = ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob"];
  var UNIT_LABELS = {
    spear: "Speer",
    sword: "Schwert",
    axe: "Axt",
    archer: "Bogen",
    spy: "Spaeher",
    light: "LK",
    marcher: "BB",
    heavy: "SK",
    ram: "Ram",
    catapult: "Kata",
    knight: "Pala",
    snob: "AG"
  };
  var ControlPanel = class {
    constructor({ storage, onReadAttacks, onOpenWatcher }) {
      this.storage = storage;
      this.onReadAttacks = onReadAttacks;
      this.onOpenWatcher = onOpenWatcher;
      this.root = null;
    }
    async mount() {
      this.injectStyle();
      this.root = document.getElementById(PANEL_ID) || document.createElement("div");
      this.root.id = PANEL_ID;
      if (!this.root.parentNode) document.body.appendChild(this.root);
      this.root.addEventListener("click", (event) => this.handleClick(event));
      this.root.addEventListener("change", (event) => this.handleTemplateChange(event));
      await this.render();
    }
    async render(statusText = "") {
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
        ${categories.length ? categories.map(([key, template]) => this.renderTemplate(key, template)).join("") : '<div class="ap-muted">Noch keine Kategorien gespeichert.</div>'}
      </div>
      <div class="ap-section ap-list" hidden>
        <div class="ap-section-title">Ausgelesene Angriffe</div>
        ${attacks.length ? attacks.map((attack) => this.renderAttack(attack)).join("") : '<div class="ap-muted">Keine Angriffe gespeichert.</div>'}
      </div>
    `;
    }
    renderTemplate(key, template) {
      const units = template.units || {};
      return `
      <details class="ap-template">
        <summary>${this.escape(template.label || key)}</summary>
        <div class="ap-unit-grid">
          ${UNITS.map((unit) => `
            <label>
              <span>${UNIT_LABELS[unit]}</span>
              <input type="number" min="0" step="1" value="${Number(units[unit] || 0)}" data-category="${this.escapeAttr(key)}" data-unit="${unit}">
            </label>
          `).join("")}
        </div>
      </details>
    `;
    }
    renderAttack(attack) {
      return `
      <div class="ap-attack">
        <div><b>${this.escape(attack.categoryLabel)}</b> #${this.escape(attack.id)}</div>
        <div>${this.escape(attack.sourceLabel || "-")} -> ${this.escape(attack.targetLabel || "-")}</div>
        <div>Senden: ${this.escape(formatDateTime(attack.sendAt))}</div>
        <div>Ziel-Link: ${attack.playUrl ? "ja" : "fehlt"}</div>
      </div>
    `;
    }
    async handleClick(event) {
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === "read") {
        await this.render("Lese Angriffe ...");
        await this.onReadAttacks?.();
        await this.render();
      }
      if (action === "watch") {
        await this.onOpenWatcher?.();
      }
      if (action === "toggle-list") {
        const list = this.root.querySelector(".ap-list");
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
      const style = document.createElement("style");
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
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    }
    escapeAttr(value) {
      return this.escape(value);
    }
  };

  // AngriffsPlaner/src/ui/status-banner.js
  var STATUS_ID = "ds-angriffs-planer-status";
  var StatusBanner = class {
    show(text, isError = false) {
      const box = this.getOrCreate();
      box.classList.toggle("is-error", isError);
      box.textContent = `AngriffsPlaner: ${text}`;
    }
    error(text) {
      this.show(text, true);
    }
    getOrCreate() {
      let box = document.getElementById(STATUS_ID);
      if (box) return box;
      this.injectStyle();
      box = document.createElement("div");
      box.id = STATUS_ID;
      document.body.appendChild(box);
      return box;
    }
    injectStyle() {
      if (document.getElementById(`${STATUS_ID}-style`)) return;
      const style = document.createElement("style");
      style.id = `${STATUS_ID}-style`;
      style.textContent = `
      #${STATUS_ID} {
        position: fixed;
        right: 12px;
        top: 12px;
        z-index: 10000;
        max-width: 360px;
        padding: 10px 14px;
        border: 1px solid #7d510f;
        border-radius: 4px;
        background: #f4e4bc;
        color: #2f2416;
        font: bold 13px Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      }
      #${STATUS_ID}.is-error {
        border-color: #a40000;
        background: #f3c7c7;
      }
    `;
      document.head.appendChild(style);
    }
  };

  // AngriffsPlaner/src/ui/watch-window.js
  var WatchWindow = class {
    constructor({ config, storage }) {
      this.config = config;
      this.storage = storage;
      this.windowRef = null;
      this.intervalId = null;
    }
    async open() {
      this.windowRef = window.open("", this.config.watcherWindowName, "width=760,height=620");
      if (!this.windowRef) {
        throw new Error("Monitor-Fenster konnte nicht geoeffnet werden.");
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
      doc.querySelector('[data-action="toggle"]').addEventListener("click", () => this.toggleRunning());
    }
    async startTicker() {
      if (this.intervalId) this.windowRef.clearInterval(this.intervalId);
      this.intervalId = this.windowRef.setInterval(async () => {
        await this.renderState();
        await this.activateDueAttack();
      }, 1e3);
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
      const attacks = [...state.attacks].filter((attack) => !sentIds.has(attack.id)).sort((a, b) => a.sendAt - b.sendAt);
      const nextAttack = attacks.find((attack) => attack.sendAt + this.config.maxLateMs >= now);
      const status = state.runtime.running ? nextAttack ? `Aktiv. Naechster Angriff in ${formatRemaining(nextAttack.sendAt - now)}.` : "Aktiv. Kein offener Angriff gefunden." : "Angehalten.";
      const doc = this.windowRef.document;
      doc.querySelector('[data-field="status"]').textContent = status;
      doc.querySelector('[data-action="toggle"]').textContent = state.runtime.running ? "Stop" : "Start";
      doc.querySelector('[data-field="content"]').innerHTML = attacks.length ? attacks.map((attack) => this.renderAttack(attack, nextAttack?.id === attack.id, now)).join("") : '<div class="muted">Keine offenen Angriffe gespeichert.</div>';
    }
    renderAttack(attack, isNext, now) {
      const remaining = attack.sendAt - now;
      return `
      <div class="attack${isNext ? " is-next" : ""}">
        <div>#${this.escape(attack.id)}</div>
        <div>
          <b>${this.escape(attack.categoryLabel)}</b><br>
          <span class="muted">${this.escape(attack.sourceLabel || "-")} -> ${this.escape(attack.targetLabel || "-")}</span>
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
      const attack = [...state.attacks].filter((item) => !sentIds.has(item.id)).sort((a, b) => a.sendAt - b.sendAt).find((item) => item.sendAt - this.config.prepareSeconds * 1e3 <= now && item.sendAt + this.config.maxLateMs >= now);
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
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    }
  };

  // AngriffsPlaner/src/app.js
  var AttackPlannerApp = class {
    constructor(config = CONFIG) {
      this.config = config;
      this.storage = new AttackStorage(config.storageKey);
      this.status = new StatusBanner();
      this.botProtection = new BotProtectionService({
        onTriggered: () => this.status.error("Bot-Schutz erkannt. Versand wurde gestoppt.")
      });
      this.reader = new AttackPlannerReader();
      this.watchWindow = new WatchWindow({ config, storage: this.storage });
      this.dispatcher = new AttackDispatcher({
        config,
        storage: this.storage,
        botProtection: this.botProtection,
        onStatus: (message, isError) => this.status.show(message, isError)
      });
      this.panel = new ControlPanel({
        storage: this.storage,
        onReadAttacks: () => this.readAndStoreAttacks(),
        onOpenWatcher: () => this.openWatcher()
      });
    }
    async start() {
      this.botProtection.start();
      if (isDsUltimateAttackPlannerPage()) {
        await this.panel.mount();
        return;
      }
      if (isTribalWarsPage()) {
        const state = await this.storage.loadState();
        if (state.runtime.activeAttackId) {
          await this.dispatcher.resumeOnTribalWarsPage();
          return;
        }
        if (state.runtime.running && window.name === this.config.watcherWindowName) {
          await this.watchWindow.attachCurrentWindow();
        }
      }
    }
    async readAndStoreAttacks() {
      if (this.botProtection.checkNow()) return;
      const attacks = await this.reader.readAll();
      await this.storage.saveAttacks(attacks);
      this.status.show(`${attacks.length} Angriffe ausgelesen und gespeichert.`);
    }
    async openWatcher() {
      await this.watchWindow.open();
    }
  };

  // AngriffsPlaner/src/main.js
  function startApp() {
    try {
      const app = new AttackPlannerApp();
      window.attackPlannerApp = app;
      app.start();
    } catch (error) {
      console.error("AngriffsPlaner: Start fehlgeschlagen.", error);
    }
  }
  if (document.body) {
    startApp();
  } else {
    window.addEventListener("DOMContentLoaded", startApp, { once: true });
  }
})();
