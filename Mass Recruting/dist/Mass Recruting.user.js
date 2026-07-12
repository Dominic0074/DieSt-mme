// ==UserScript==
// @name         Mass Recruting
// @namespace    https://github.com/Dominic0074/DieSt-mme
// @version      0.1.4
// @description  Mass Recruting fuer Die Staemme mit Safety und Status-Banner.
// @author       kk
// @match        https://*.die-staemme.de/game.php*
// @match        https://die-staemme.de/game.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/Mass%20Recruting/dist/Mass%20Recruting.user.js
// @downloadURL  https://raw.githubusercontent.com/Dominic0074/DieSt-mme/main/Mass%20Recruting/dist/Mass%20Recruting.user.js
// ==/UserScript==

(() => {
  // Mass Recruting/src/core/default-state.js
  function createDefaultState() {
    return {
      runtime: {
        botProtectionTriggered: false,
        botProtectionLastCheckAt: null
      }
    };
  }

  // Mass Recruting/src/core/bot-protection-service.js
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
      bodyClone?.querySelector("#ds-mass-recruting-status-banner")?.remove();
      const bodyText = bodyClone?.innerText || "";
      return /du bist ein bot|bot.{0,30}schutz|captcha|bitte best.{0,5}tige|are you human/i.test(bodyText);
    }
    triggerStop() {
      if (this.state.runtime.botProtectionTriggered) return;
      this.state.runtime.botProtectionTriggered = true;
      this.playAlertSound();
      this.hooks.onTriggered?.();
      console.warn(
        "%cBOT-SCHUTZ ERKANNT - Mass Recruting gestoppt. Bitte manuell loesen und Seite neu laden.",
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

  // Mass Recruting/src/ui/status-banner.js
  var BANNER_ID = "ds-mass-recruting-status-banner";
  var STYLE_ID = "ds-mass-recruting-status-style";
  var StatusBanner = class {
    /**
     * @param {{ runtime: { botProtectionTriggered: boolean, botProtectionLastCheckAt: number | null } }} state
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
      <div class="ds-mr-title">Mass Recruting</div>
      <div class="ds-mr-line">
        <span>Safety</span>
        <strong data-field="safety">-</strong>
      </div>
      <div class="ds-mr-line">
        <span>Letzter Check</span>
        <strong data-field="lastCheck">-</strong>
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
    `;
      document.head.appendChild(style);
    }
  };

  // Mass Recruting/src/app.js
  var App = class {
    constructor() {
      this.state = createDefaultState();
      this.banner = new StatusBanner(this.state);
      this.botProtection = new BotProtectionService(this.state, {
        onChecked: () => this.banner.update(),
        onTriggered: () => this.banner.update()
      });
      this.bannerIntervalId = null;
    }
    start() {
      this.banner.mount();
      this.botProtection.start();
      this.startBannerTicker();
    }
    startBannerTicker() {
      if (this.bannerIntervalId) return;
      this.bannerIntervalId = window.setInterval(() => {
        this.banner.update();
      }, 1e3);
    }
  };

  // Mass Recruting/src/main.js
  console.info("[Mass Recruting] Userscript geladen", window.location.href);
  function startApp() {
    try {
      const app = new App();
      window.massRecrutingApp = app;
      app.start();
      console.info("[Mass Recruting] App gestartet");
    } catch (error) {
      console.error("[Mass Recruting] Start fehlgeschlagen", error);
    }
  }
  if (document.body) {
    startApp();
  } else {
    window.addEventListener("DOMContentLoaded", startApp, { once: true });
  }
})();
