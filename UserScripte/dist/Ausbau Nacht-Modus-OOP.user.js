// ==UserScript==
// @name         Ausbau Nacht-Modus OOP
// @namespace    http://tampermonkey.net/
// @version      0.1.4
// @description  Objektorientierter Neuaufbau fuer Die Staemme Automation.
// @author       kk
// @match        https://*.die-staemme.de/game.php*
// @match        https://die-staemme.de/game.php*
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
      this.setField("raid", this.state.raid.enabled ? "aktiv" : "aus");
      this.setField("recruit", this.state.recruit.enabled ? "aktiv" : "aus");
      this.setField("status", this.state.runtime.botProtectionTriggered ? "gestoppt" : "ok");
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
        width: 210px;
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
      #ds-oo-status-banner .ds-oo-line span {
        color: #6f5635;
      }
      #ds-oo-status-banner .ds-oo-line strong {
        overflow: hidden;
        max-width: 118px;
        text-align: right;
        text-overflow: ellipsis;
      }
    `;
      document.head.appendChild(style);
    }
  };

  // UserScripte/src/app.js
  var App = class {
    constructor() {
      this.state = createDefaultState();
      this.banner = new StatusBanner(this.state);
      this.botProtection = new BotProtectionService(this.state, {
        onChecked: () => this.banner.update(),
        onTriggered: () => this.banner.update()
      });
    }
    start() {
      this.state.page = readCurrentPage();
      this.banner.mount();
      this.botProtection.start();
    }
  };

  // UserScripte/src/main.js
  function startApp() {
    try {
      const app = new App();
      window.dsAutoApp = app;
      app.start();
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
