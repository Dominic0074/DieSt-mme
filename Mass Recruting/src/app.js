import { createDefaultState } from './core/default-state.js';
import { BotProtectionService } from './core/bot-protection-service.js';
import { StatusBanner } from './ui/status-banner.js';

const RUNNING_STORAGE_KEY = 'massRecruting.running';
const PHASE_STORAGE_KEY = 'massRecruting.phase';
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;
const BUTTON_WAIT_TIMEOUT_MS = 20000;
const BUTTON_WAIT_INTERVAL_MS = 250;

export class App {
  constructor() {
    this.state = createDefaultState();
    this.hydrateRuntime();
    this.banner = new StatusBanner(this.state);
    this.botProtection = new BotProtectionService(this.state, {
      onChecked: () => this.banner.update(),
      onTriggered: () => {
        this.state.runtime.running = false;
        this.state.runtime.status = 'Safety erkannt';
        this.persistRunning(false);
        this.banner.update();
      }
    });
    this.bannerIntervalId = null;
    this.timeoutIds = new Set();
    this.runToken = 0;
  }

  start() {
    this.banner.mount();
    this.banner.onStart(() => this.startMassRecruting());
    this.banner.onStop(() => this.stopMassRecruting());
    this.botProtection.start();
    this.startBannerTicker();
    this.resumeIfRunning();
  }

  startMassRecruting() {
    this.runToken += 1;
    this.clearScheduledActions();
    this.persistPhase('');

    if (this.botProtection.checkNow()) return;

    this.state.runtime.running = true;
    this.persistRunning(true);

    if (this.isMassScavengePage()) {
      this.scheduleCalculateRuntimesClick();
      return;
    }

    this.state.runtime.status = 'klicke Raubzug';
    this.persistPhase('second_raid_click');
    this.banner.update();

    const raidMenuLink = this.findRaidMenuLink();
    if (raidMenuLink) {
      this.activateElement(raidMenuLink);
      this.scheduleSecondRaidClick();
      return;
    }

    this.state.runtime.status = 'Raubzug nicht gefunden';
    this.state.runtime.running = false;
    this.persistRunning(false);
    this.persistPhase('');
    this.banner.update();
    console.warn('[Mass Recruting] Raubzug-Link in der Menueleiste nicht gefunden.');
  }

  stopMassRecruting() {
    this.runToken += 1;
    this.clearScheduledActions();
    this.state.runtime.running = false;
    this.state.runtime.status = 'angehalten';
    this.persistRunning(false);
    this.persistPhase('');
    this.banner.update();
  }

  resumeIfRunning() {
    if (!this.state.runtime.running) return;

    const phase = this.readPersistedPhase();
    if (phase === 'calculate_runtimes' || this.isMassScavengePage()) {
      this.scheduleCalculateRuntimesClick();
      return;
    }

    if (phase === 'second_raid_click') {
      this.scheduleSecondRaidClick();
    }
  }

  scheduleSecondRaidClick() {
    const token = this.runToken;
    const delay = this.getRandomDelayMs();
    this.setStatus(`warte ${delay} ms`);

    this.schedule(async () => {
      if (!this.canContinue(token)) return;
      if (this.botProtection.checkNow()) return;

      const raidMenuLink = this.findRaidMenuLink();
      if (!raidMenuLink) {
        this.failRun('Raubzug nicht gefunden');
        return;
      }

      this.setStatus('klicke Raubzug erneut');
      this.persistPhase('calculate_runtimes');
      this.activateElement(raidMenuLink);
      this.scheduleCalculateRuntimesClick();
    }, delay);
  }

  scheduleCalculateRuntimesClick() {
    const token = this.runToken;
    const delay = this.getRandomDelayMs();
    this.persistPhase('calculate_runtimes');
    this.setStatus(`warte ${delay} ms`);

    this.schedule(async () => {
      if (!this.canContinue(token)) return;
      if (this.botProtection.checkNow()) return;

      this.setStatus('suche Calculate');
      const button = await this.waitForCalculateRuntimesButton(token);
      if (!button) {
        this.failRun('Calculate nicht gefunden');
        return;
      }

      this.setStatus('klicke Calculate');
      this.activateElement(button);
      this.setStatus('Calculate geklickt');
    }, delay);
  }

  async waitForCalculateRuntimesButton(token) {
    return new Promise(resolve => {
      const startedAt = Date.now();
      let observer = null;
      let intervalId = null;

      const finish = button => {
        if (observer) observer.disconnect();
        if (intervalId) window.clearInterval(intervalId);
        resolve(button);
      };

      const check = () => {
        if (!this.canContinue(token)) {
          finish(null);
          return;
        }

        const button = this.findCalculateRuntimesButton();
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
    return new Promise(resolve => {
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
    return token === this.runToken
      && this.state.runtime.running
      && !this.state.runtime.botProtectionTriggered;
  }

  failRun(status) {
    this.state.runtime.running = false;
    this.state.runtime.status = status;
    this.persistRunning(false);
    this.persistPhase('');
    this.banner.update();
    console.warn(`[Mass Recruting] ${status}.`);
  }

  setStatus(status) {
    this.state.runtime.status = status;
    this.banner.update();
  }

  getRandomDelayMs() {
    return Math.floor(MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
  }

  hydrateRuntime() {
    if (this.readPersistedRunning() || this.readPersistedPhase()) {
      this.state.runtime.running = true;
      this.state.runtime.status = 'aktiv';
    }
  }

  readPersistedRunning() {
    try {
      return window.localStorage?.getItem(RUNNING_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  persistRunning(isRunning) {
    try {
      window.localStorage?.setItem(RUNNING_STORAGE_KEY, isRunning ? '1' : '0');
    } catch {
      // Ignored: the in-memory state still controls the current page.
    }
  }

  readPersistedPhase() {
    try {
      return window.localStorage?.getItem(PHASE_STORAGE_KEY) || '';
    } catch {
      return '';
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
      // Ignored: the in-memory state still controls the current page.
    }
  }

  findRaidMenuLink() {
    const massScavengeScriptLink = Array.from(document.querySelectorAll('a[href]')).find(link => {
      const href = link.getAttribute('href') || '';
      return href.includes('massScavenge.js') || href.includes('shinko-to-kuma.com/scripts/massScavenge');
    });
    if (massScavengeScriptLink) return massScavengeScriptLink;

    const quickbarRaidLink = Array.from(document.querySelectorAll('a.quickbar_link')).find(link => {
      return this.normalizeText(link.textContent || '') === 'raubzug';
    });
    if (quickbarRaidLink) return quickbarRaidLink;

    const selectors = [
      'a[href*="screen=am_farm"]',
      '#manager_icon_farm',
      'a[href*="screen=place"][href*="mode=scavenge"]'
    ];

    for (const selector of selectors) {
      const link = document.querySelector(selector);
      if (link) return link;
    }

    return Array.from(document.querySelectorAll('a[href]')).find(link => {
      const label = this.normalizeText(`${link.textContent || ''} ${link.title || ''} ${link.getAttribute('href') || ''}`);
      return label.includes('raubzug')
        || label.includes('raubzuege')
        || label.includes('raubzuge')
        || label.includes('farm assistent')
        || label.includes('am farm');
    }) || null;
  }

  activateElement(element) {
    const href = element.getAttribute?.('href') || '';
    if (href.trim().toLowerCase().startsWith('javascript:')) {
      this.runJavascriptHref(href);
      return;
    }

    this.clickElement(element);
  }

  runJavascriptHref(href) {
    const code = href.replace(/^javascript:\s*/i, '');
    try {
      Function(code).call(window);
    } catch (error) {
      console.error('[Mass Recruting] javascript-Link konnte nicht ausgefuehrt werden.', error);
      this.failRun('Raubzug-Start fehlgeschlagen');
    }
  }

  findCalculateRuntimesButton() {
    const root = document.querySelector('#scavenge_mass_screen') || document;
    const candidates = Array.from(root.querySelectorAll([
      'button',
      'input[type="button"]',
      'input[type="submit"]',
      'a',
      '[role="button"]',
      '.btn'
    ].join(',')));

    return candidates.find(element => {
      if (!this.isClickableElement(element)) return false;

      const label = this.normalizeText([
        element.value,
        element.textContent,
        element.getAttribute('title'),
        element.getAttribute('aria-label'),
        element.getAttribute('data-title')
      ].filter(Boolean).join(' '));

      return label.includes('calculate runtimes for each page')
        || label.includes('calculate runtimes')
        || label.includes('calculate runtime');
    }) || null;
  }

  clickElement(element) {
    element.scrollIntoView?.({ block: 'center', inline: 'center' });
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
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
    if (element.getAttribute('aria-disabled') === 'true') return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  isMassScavengePage() {
    const params = new URLSearchParams(window.location.search);
    return params.get('screen') === 'place' && params.get('mode') === 'scavenge_mass';
  }

  normalizeText(value) {
    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  startBannerTicker() {
    if (this.bannerIntervalId) return;

    this.bannerIntervalId = window.setInterval(() => {
      this.banner.update();
    }, 1000);
  }
}
