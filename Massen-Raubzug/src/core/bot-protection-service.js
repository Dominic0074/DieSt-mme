export class BotProtectionService {
  /**
   * @param {{ runtime: { botProtectionTriggered: boolean, botProtectionLastCheckAt: number | null } }} state
   * @param {{ onTriggered?: () => void, onChecked?: () => void }} hooks
   */
  constructor(state, hooks = {}) {
    this.state = state;
    this.hooks = hooks;
    this.intervalId = null;
    this.checkIntervalMs = 5000;
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

    const botProtection = document.querySelector('#botprotection_quest');
    if (botProtection) {
      const style = window.getComputedStyle(botProtection);
      if (style.display !== 'none' && style.visibility !== 'hidden') return true;
    }

    const bodyClone = document.body?.cloneNode(true);
    bodyClone?.querySelector('#ds-massen-raubzug-status-banner')?.remove();

    const bodyText = bodyClone?.innerText || '';
    return /du bist ein bot|bot.{0,30}schutz|captcha|bitte best.{0,5}tige|are you human/i.test(bodyText);
  }

  triggerStop() {
    if (this.state.runtime.botProtectionTriggered) return;

    this.state.runtime.botProtectionTriggered = true;
    this.playAlertSound();
    this.hooks.onTriggered?.();

    console.warn(
      '%cBOT-SCHUTZ ERKANNT - Massen-Raubzug gestoppt. Bitte manuell loesen und Seite neu laden.',
      'color: red; font-size: 14px; font-weight: bold'
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
      console.warn('Ton konnte nicht abgespielt werden:', e);
    }
  }
}
