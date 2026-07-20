// ==UserScript==
// @name         Massen-Raubzug
// @namespace    https://github.com/Dominic0074/DieSt-mme
// @version      0.1.28
// @description  Massen-Raubzug fuer Die Staemme mit Safety und Status-Banner.
// @author       kk
// @match        https://*.die-staemme.de/game.php*
// @match        https://die-staemme.de/game.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/Massen-Raubzug/dist/Massen-Raubzug.user.js
// @downloadURL  https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/Massen-Raubzug/dist/Massen-Raubzug.user.js
// ==/UserScript==

(() => {
  // Massen-Raubzug/src/core/default-state.js
  function createDefaultState() {
    return {
      runtime: {
        botProtectionTriggered: false,
        botProtectionLastCheckAt: null,
        running: false,
        status: "bereit"
      }
    };
  }

  // Massen-Raubzug/src/core/bot-protection-service.js
  var BotProtectionService = class {
    /**
     * @param {{ runtime: { botProtectionTriggered: boolean, botProtectionLastCheckAt: number | null } }} state
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
      const bodyClone = document.body?.cloneNode(true);
      bodyClone?.querySelector("#ds-massen-raubzug-status-banner")?.remove();
      const bodyText = bodyClone?.innerText || "";
      return /du bist ein bot|bot.{0,30}schutz|captcha|bitte best.{0,5}tige|are you human/i.test(bodyText);
    }
    triggerStop() {
      if (this.state.runtime.botProtectionTriggered) return;
      this.state.runtime.botProtectionTriggered = true;
      this.playAlertSound();
      this.hooks.onTriggered?.();
      console.warn(
        "%cBOT-SCHUTZ ERKANNT - Massen-Raubzug gestoppt. Bitte manuell loesen und Seite neu laden.",
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

  // Massen-Raubzug/src/ui/status-banner.js
  var BANNER_ID = "ds-massen-raubzug-status-banner";
  var STYLE_ID = "ds-massen-raubzug-status-style";
  var StatusBanner = class {
    /**
     * @param {{ runtime: { botProtectionTriggered: boolean, botProtectionLastCheckAt: number | null, running: boolean, status: string } }} state
     */
    constructor(state) {
      this.state = state;
      this.root = null;
    }
    mount() {
      if (document.getElementById(BANNER_ID)) {
        this.root = document.getElementById(BANNER_ID);
        this.update();
        return;
      }
      this.injectStyle();
      const root = document.createElement("div");
      root.id = BANNER_ID;
      root.innerHTML = `
      <div class="ds-mr-title">Massen-Raubzug</div>
      <div class="ds-mr-line">
        <span>Safety</span>
        <strong data-field="safety">-</strong>
      </div>
      <div class="ds-mr-line">
        <span>Letzter Check</span>
        <strong data-field="lastCheck">-</strong>
      </div>
      <div class="ds-mr-line">
        <span>Status</span>
        <strong data-field="status">-</strong>
      </div>
      <div class="ds-mr-actions">
        <button type="button" data-action="start">Start</button>
        <button type="button" data-action="stop">Stop</button>
      </div>
    `;
      document.body.appendChild(root);
      this.root = root;
      this.update();
    }
    update() {
      if (!this.root) return;
      const isTriggered = this.state.runtime.botProtectionTriggered;
      this.root.classList.toggle("is-stopped", isTriggered);
      this.setField("safety", isTriggered ? "erkannt" : "ok");
      this.setField("lastCheck", this.formatLastCheck());
      this.setField("status", this.state.runtime.status);
      this.updateButtons();
    }
    onStart(callback) {
      this.root?.addEventListener("click", (event) => {
        if (!event.target?.matches?.('[data-action="start"]')) return;
        callback?.();
      });
    }
    onStop(callback) {
      this.root?.addEventListener("click", (event) => {
        if (!event.target?.matches?.('[data-action="stop"]')) return;
        callback?.();
      });
    }
    formatLastCheck() {
      const timestamp = this.state.runtime.botProtectionLastCheckAt;
      if (!timestamp) return "-";
      return new Date(timestamp).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }
    setField(name, value) {
      const node = this.root?.querySelector(`[data-field="${name}"]`);
      if (node) node.textContent = String(value);
    }
    updateButtons() {
      const startButton = this.root?.querySelector('[data-action="start"]');
      const stopButton = this.root?.querySelector('[data-action="stop"]');
      const isTriggered = this.state.runtime.botProtectionTriggered;
      if (startButton) startButton.disabled = isTriggered;
      if (stopButton) stopButton.disabled = isTriggered;
    }
    injectStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
      #${BANNER_ID} {
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
      #${BANNER_ID}.is-stopped {
        border-color: #a40000;
        background: rgba(243, 199, 199, 0.96);
      }
      #${BANNER_ID} .ds-mr-title {
        margin-bottom: 6px;
        font-weight: bold;
        font-size: 13px;
        color: #5b2d14;
      }
      #${BANNER_ID} .ds-mr-line {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        line-height: 1.55;
        white-space: nowrap;
      }
      #${BANNER_ID} .ds-mr-line span {
        flex: 0 0 auto;
        color: #6f5635;
      }
      #${BANNER_ID} .ds-mr-line strong {
        overflow: hidden;
        max-width: 128px;
        text-align: right;
        text-overflow: ellipsis;
      }
      #${BANNER_ID} .ds-mr-actions {
        display: flex;
        justify-content: flex-end;
        gap: 5px;
        margin-top: 8px;
      }
      #${BANNER_ID} button {
        padding: 2px 8px;
        border: 1px solid #8c6d3f;
        background: #f5e6bd;
        color: #2f2417;
        font: 12px Arial, sans-serif;
        cursor: pointer;
      }
      #${BANNER_ID} button:disabled {
        cursor: default;
        opacity: 0.55;
      }
    `;
      document.head.appendChild(style);
    }
  };

  // Massen-Raubzug/src/app.js
  var RUNNING_STORAGE_KEY = "massenRaubzug.running";
  var PHASE_STORAGE_KEY = "massenRaubzug.phase";
  var STOPPED_STORAGE_KEY = "massenRaubzug.stopped";
  var NEXT_RUN_AT_STORAGE_KEY = "massenRaubzug.nextRunAt";
  var MASS_SCAVENGE_SCRIPT_URL = "https://shinko-to-kuma.com/scripts/massScavenge.js";
  var MIN_DELAY_MS = 1e3;
  var MAX_DELAY_MS = 3e3;
  var BUTTON_WAIT_TIMEOUT_MS = 2e4;
  var BUTTON_WAIT_INTERVAL_MS = 250;
  var CYCLE_DELAY_MS = 3 * 60 * 60 * 1e3;
  var App = class {
    constructor() {
      this.state = createDefaultState();
      this.hydrateRuntime();
      this.banner = new StatusBanner(this.state);
      this.botProtection = new BotProtectionService(this.state, {
        onChecked: () => this.banner.update(),
        onTriggered: () => {
          this.state.runtime.running = false;
          this.state.runtime.status = "Safety erkannt";
          this.persistRunning(false);
          this.persistPhase("");
          this.persistNextRunAt(null);
          this.banner.update();
        }
      });
      this.bannerIntervalId = null;
      this.timeoutIds = /* @__PURE__ */ new Set();
      this.runToken = 0;
    }
    start() {
      this.banner.mount();
      this.banner.onStart(() => this.startMassenRaubzug());
      this.banner.onStop(() => this.stopMassenRaubzug());
      this.botProtection.start();
      this.startBannerTicker();
      this.resumeIfRunning();
    }
    async startMassenRaubzug() {
      this.runToken += 1;
      this.clearScheduledActions();
      this.persistStopped(false);
      this.persistPhase("");
      this.persistNextRunAt(null);
      const token = this.runToken;
      if (this.botProtection.checkNow()) return;
      this.state.runtime.running = true;
      this.persistRunning(true);
      this.state.runtime.status = "lade Raubzug";
      this.persistPhase("open_mass_scavenge");
      this.banner.update();
      const loaded = await this.loadMassScavengeTool();
      if (loaded && this.canContinue(token) && this.isMassScavengePage()) {
        this.persistPhase("calculate_runtimes");
        this.scheduleCalculateRuntimesClick();
      }
    }
    stopMassenRaubzug() {
      this.runToken += 1;
      this.clearScheduledActions();
      this.state.runtime.running = false;
      this.state.runtime.status = "angehalten";
      this.persistRunning(false);
      this.persistPhase("");
      this.persistNextRunAt(null);
      this.persistStopped(true);
      this.banner.update();
    }
    resumeIfRunning() {
      if (this.readPersistedStopped()) return;
      if (!this.state.runtime.running) return;
      const phase = this.readPersistedPhase();
      if (phase === "timer_wait") {
        this.scheduleNextCycle();
        return;
      }
      if (phase === "calculate_runtimes") {
        this.scheduleCalculateRuntimesClick();
        return;
      }
      if (phase === "launch_group") {
        this.scheduleLaunchGroupClick(this.runToken);
        return;
      }
      if (phase === "open_mass_scavenge" || this.isMassScavengePage()) {
        this.scheduleMassScavengeToolLoad();
      }
    }
    scheduleMassScavengeToolLoad() {
      const token = this.runToken;
      const delay = this.getRandomDelayMs();
      this.setStatus(`warte ${delay} ms`);
      this.schedule(async () => {
        if (!this.canContinue(token)) return;
        if (this.botProtection.checkNow()) return;
        this.setStatus("lade Massenraubzug");
        this.persistPhase("calculate_runtimes");
        const loaded = await this.loadMassScavengeTool();
        if (loaded && this.canContinue(token)) {
          this.scheduleCalculateRuntimesClick();
        }
      }, delay);
    }
    async loadMassScavengeTool() {
      if (!window.jQuery?.getScript && !window.$?.getScript) {
        this.failRun("jQuery fehlt");
        return false;
      }
      try {
        window.premiumBtnEnabled = false;
        await new Promise((resolve, reject) => {
          (window.jQuery || window.$).getScript(MASS_SCAVENGE_SCRIPT_URL).done(resolve).fail((xhr, status, error) => reject(error || status || xhr));
        });
        if (this.readPersistedStopped()) return false;
        return true;
      } catch (error) {
        console.error("[Massen-Raubzug] massScavenge.js konnte nicht geladen werden.", error);
        this.failRun("Raubzug-Tool nicht geladen");
        return false;
      }
    }
    scheduleCalculateRuntimesClick() {
      const token = this.runToken;
      const delay = this.getRandomDelayMs();
      this.persistPhase("calculate_runtimes");
      this.setStatus(`warte ${delay} ms`);
      this.schedule(async () => {
        if (!this.canContinue(token)) return;
        if (this.botProtection.checkNow()) return;
        this.setStatus("suche Calculate");
        const button = await this.waitForCalculateRuntimesButton(token);
        if (!button) {
          this.failRun("Calculate nicht gefunden");
          return;
        }
        this.setStatus("klicke Calculate");
        this.activateElement(button);
        this.setStatus("Calculate geklickt");
        this.scheduleLaunchGroupClick(token);
      }, delay);
    }
    scheduleLaunchGroupClick(token) {
      const delay = this.getRandomDelayMs();
      this.persistPhase("launch_group");
      this.setStatus(`warte ${delay} ms`);
      this.schedule(async () => {
        if (!this.canContinue(token)) return;
        if (this.botProtection.checkNow()) return;
        this.setStatus("suche Launch");
        const button = await this.waitForLaunchGroupButton(token);
        if (!button) {
          this.failRun("Launch nicht gefunden");
          return;
        }
        this.setStatus("klicke Launch");
        this.activateElement(button);
        this.setStatus("Launch geklickt");
        this.startCycleTimer();
      }, delay);
    }
    startCycleTimer() {
      const nextRunAt = Date.now() + CYCLE_DELAY_MS;
      this.persistNextRunAt(nextRunAt);
      this.persistPhase("timer_wait");
      this.persistRunning(true);
      this.setStatus(`naechster Start ${this.formatTime(nextRunAt)}`);
      window.location.href = this.buildOverviewUrl();
    }
    scheduleNextCycle() {
      const token = this.runToken;
      const nextRunAt = this.readPersistedNextRunAt();
      if (!nextRunAt) {
        this.failRun("Timer fehlt");
        return;
      }
      const delay = Math.max(0, nextRunAt - Date.now());
      this.setStatus(delay > 0 ? `naechster Start ${this.formatTime(nextRunAt)}` : "starte erneut");
      this.schedule(async () => {
        if (!this.canContinue(token)) return;
        if (this.botProtection.checkNow()) return;
        this.persistNextRunAt(null);
        this.persistPhase("");
        await this.startMassenRaubzug();
      }, delay);
    }
    async waitForCalculateRuntimesButton(token) {
      return this.waitForButton(token, () => this.findCalculateRuntimesButton());
    }
    async waitForLaunchGroupButton(token) {
      return this.waitForButton(token, () => this.findLaunchGroupButton());
    }
    async waitForButton(token, finder) {
      return new Promise((resolve) => {
        const startedAt = Date.now();
        let observer = null;
        let intervalId = null;
        const finish = (button) => {
          if (observer) observer.disconnect();
          if (intervalId) window.clearInterval(intervalId);
          resolve(button);
        };
        const check = () => {
          if (!this.canContinue(token)) {
            finish(null);
            return;
          }
          const button = finder();
          if (button) {
            finish(button);
            return;
          }
          if (Date.now() - startedAt >= BUTTON_WAIT_TIMEOUT_MS) {
            finish(null);
          }
        };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
        intervalId = window.setInterval(check, BUTTON_WAIT_INTERVAL_MS);
        check();
      });
    }
    delay(ms) {
      return new Promise((resolve) => {
        this.schedule(resolve, ms);
      });
    }
    schedule(callback, delay) {
      const timeoutId = window.setTimeout(() => {
        this.timeoutIds.delete(timeoutId);
        callback();
      }, delay);
      this.timeoutIds.add(timeoutId);
    }
    clearScheduledActions() {
      for (const timeoutId of this.timeoutIds) {
        window.clearTimeout(timeoutId);
      }
      this.timeoutIds.clear();
    }
    canContinue(token) {
      return token === this.runToken && this.state.runtime.running && !this.state.runtime.botProtectionTriggered && !this.readPersistedStopped();
    }
    failRun(status) {
      this.state.runtime.running = false;
      this.state.runtime.status = status;
      this.persistRunning(false);
      this.persistPhase("");
      this.persistNextRunAt(null);
      this.banner.update();
      console.warn(`[Massen-Raubzug] ${status}.`);
    }
    setStatus(status) {
      this.state.runtime.status = status;
      this.banner.update();
    }
    updateTimerStatus() {
      if (this.readPersistedPhase() !== "timer_wait" || this.readPersistedStopped()) return;
      const nextRunAt = this.readPersistedNextRunAt();
      if (!nextRunAt) return;
      const remainingMs = Math.max(0, nextRunAt - Date.now());
      this.state.runtime.status = `Timer ${this.formatDuration(remainingMs)}`;
    }
    getRandomDelayMs() {
      return Math.floor(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
    }
    hydrateRuntime() {
      if (this.readPersistedStopped()) {
        this.state.runtime.running = false;
        this.state.runtime.status = "angehalten";
        return;
      }
      if (this.readPersistedPhase() === "timer_wait") {
        const nextRunAt = this.readPersistedNextRunAt();
        this.state.runtime.running = true;
        this.state.runtime.status = nextRunAt ? `naechster Start ${this.formatTime(nextRunAt)}` : "Timer fehlt";
        return;
      }
      if (this.readPersistedRunning() || this.readPersistedPhase()) {
        this.state.runtime.running = true;
        this.state.runtime.status = "aktiv";
      }
    }
    readPersistedRunning() {
      try {
        return window.localStorage?.getItem(RUNNING_STORAGE_KEY) === "1";
      } catch {
        return false;
      }
    }
    persistRunning(isRunning) {
      try {
        window.localStorage?.setItem(RUNNING_STORAGE_KEY, isRunning ? "1" : "0");
      } catch {
      }
    }
    readPersistedPhase() {
      try {
        return window.localStorage?.getItem(PHASE_STORAGE_KEY) || "";
      } catch {
        return "";
      }
    }
    persistPhase(phase) {
      try {
        if (phase) {
          window.localStorage?.setItem(PHASE_STORAGE_KEY, phase);
        } else {
          window.localStorage?.removeItem(PHASE_STORAGE_KEY);
        }
      } catch {
      }
    }
    readPersistedNextRunAt() {
      try {
        const value = Number(window.localStorage?.getItem(NEXT_RUN_AT_STORAGE_KEY));
        return Number.isFinite(value) && value > 0 ? value : null;
      } catch {
        return null;
      }
    }
    persistNextRunAt(timestamp) {
      try {
        if (timestamp) {
          window.localStorage?.setItem(NEXT_RUN_AT_STORAGE_KEY, String(timestamp));
        } else {
          window.localStorage?.removeItem(NEXT_RUN_AT_STORAGE_KEY);
        }
      } catch {
      }
    }
    readPersistedStopped() {
      try {
        return window.localStorage?.getItem(STOPPED_STORAGE_KEY) === "1";
      } catch {
        return false;
      }
    }
    persistStopped(isStopped) {
      try {
        if (isStopped) {
          window.localStorage?.setItem(STOPPED_STORAGE_KEY, "1");
        } else {
          window.localStorage?.removeItem(STOPPED_STORAGE_KEY);
        }
      } catch {
      }
    }
    findRaidMenuLink() {
      const massScavengeScriptLink = Array.from(document.querySelectorAll("a[href]")).find((link) => {
        const href = link.getAttribute("href") || "";
        return href.includes("massScavenge.js") || href.includes("shinko-to-kuma.com/scripts/massScavenge");
      });
      if (massScavengeScriptLink) return massScavengeScriptLink;
      const quickbarRaidLink = Array.from(document.querySelectorAll("a.quickbar_link")).find((link) => {
        return this.normalizeText(link.textContent || "") === "raubzug";
      });
      if (quickbarRaidLink) return quickbarRaidLink;
      const selectors = [
        'a[href*="screen=am_farm"]',
        "#manager_icon_farm",
        'a[href*="screen=place"][href*="mode=scavenge"]'
      ];
      for (const selector of selectors) {
        const link = document.querySelector(selector);
        if (link) return link;
      }
      return Array.from(document.querySelectorAll("a[href]")).find((link) => {
        const label = this.normalizeText(`${link.textContent || ""} ${link.title || ""} ${link.getAttribute("href") || ""}`);
        return label.includes("raubzug") || label.includes("raubzuege") || label.includes("raubzuge") || label.includes("farm assistent") || label.includes("am farm");
      }) || null;
    }
    activateElement(element) {
      const href = element.getAttribute?.("href") || "";
      if (href.trim().toLowerCase().startsWith("javascript:")) {
        this.runJavascriptHref(href);
        return;
      }
      this.clickElement(element);
    }
    runJavascriptHref(href) {
      const code = href.replace(/^javascript:\s*/i, "");
      try {
        Function(code).call(window);
      } catch (error) {
        console.error("[Massen-Raubzug] javascript-Link konnte nicht ausgefuehrt werden.", error);
        this.failRun("Raubzug-Start fehlgeschlagen");
      }
    }
    findCalculateRuntimesButton() {
      const primary = Array.from(document.querySelectorAll("#sendMass")).find((element) => {
        const onclick = element.getAttribute("onclick") || "";
        return onclick.includes("readyToSend") && this.isClickableElement(element);
      });
      if (primary) return primary;
      const root = document.querySelector("#scavenge_mass_screen") || document;
      const fallbackPrimary = root.querySelector("#sendMass");
      if (fallbackPrimary && this.isClickableElement(fallbackPrimary)) return fallbackPrimary;
      const candidates = Array.from(root.querySelectorAll([
        "button",
        'input[type="button"]',
        'input[type="submit"]',
        "a",
        '[role="button"]',
        ".btn"
      ].join(",")));
      return candidates.find((element) => {
        if (!this.isClickableElement(element)) return false;
        const label = this.normalizeText([
          element.value,
          element.textContent,
          element.getAttribute("title"),
          element.getAttribute("aria-label"),
          element.getAttribute("data-title")
        ].filter(Boolean).join(" "));
        return label.includes("calculate runtimes for each page") || label.includes("calculate runtimes") || label.includes("calculate runtime");
      }) || null;
    }
    findLaunchGroupButton() {
      const primary = Array.from(document.querySelectorAll("#sendMass")).find((element) => {
        const onclick = element.getAttribute("onclick") || "";
        const label = this.normalizeText(element.value || element.textContent || "");
        return onclick.includes("sendGroup(0") && label.includes("launch group 1") && this.isClickableElement(element);
      });
      if (primary) return primary;
      return Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a, [role="button"], .btn')).find((element) => {
        if (!this.isClickableElement(element)) return false;
        const onclick = element.getAttribute("onclick") || "";
        const label = this.normalizeText([
          element.value,
          element.textContent,
          element.getAttribute("title"),
          element.getAttribute("aria-label")
        ].filter(Boolean).join(" "));
        return onclick.includes("sendGroup(0") || label.includes("launch group 1");
      }) || null;
    }
    clickElement(element) {
      element.scrollIntoView?.({ block: "center", inline: "center" });
      for (const type of ["pointerdown", "mousedown", "mouseup", "click"]) {
        element.dispatchEvent(new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
      element.click?.();
    }
    isClickableElement(element) {
      if (element.disabled) return false;
      if (element.getAttribute("aria-disabled") === "true") return false;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    isMassScavengePage() {
      const params = new URLSearchParams(window.location.search);
      return params.get("screen") === "place" && params.get("mode") === "scavenge_mass";
    }
    buildOverviewUrl() {
      const url = new URL(window.location.href);
      const villageId = url.searchParams.get("village") || window.game_data?.village?.id || "";
      url.pathname = "/game.php";
      url.search = "";
      if (villageId) url.searchParams.set("village", villageId);
      url.searchParams.set("screen", "overview");
      url.hash = "";
      return url.toString();
    }
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }
    formatDuration(ms) {
      const totalSeconds = Math.ceil(ms / 1e3);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor(totalSeconds % 3600 / 60);
      const seconds = totalSeconds % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    normalizeText(value) {
      return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();
    }
    startBannerTicker() {
      if (this.bannerIntervalId) return;
      this.bannerIntervalId = window.setInterval(() => {
        this.updateTimerStatus();
        this.banner.update();
      }, 1e3);
    }
  };

  // Massen-Raubzug/src/main.js
  console.info("[Massen-Raubzug] Userscript geladen", window.location.href);
  function startApp() {
    try {
      const app = new App();
      window.massenRaubzugApp = app;
      app.start();
      console.info("[Massen-Raubzug] App gestartet");
    } catch (error) {
      console.error("[Massen-Raubzug] Start fehlgeschlagen", error);
    }
  }
  if (document.body) {
    startApp();
  } else {
    window.addEventListener("DOMContentLoaded", startApp, { once: true });
  }
})();
