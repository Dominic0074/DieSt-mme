import { createDefaultState } from './core/default-state.js';
import { BotProtectionService } from './core/bot-protection-service.js';
import { StatusBanner } from './ui/status-banner.js';

const RUNNING_STORAGE_KEY = 'massRecruting.running';
const PHASE_STORAGE_KEY = 'massRecruting.phase';
const STOPPED_STORAGE_KEY = 'massRecruting.stopped';
const MASS_SCAVENGE_SCRIPT_URL = 'https://shinko-to-kuma.com/scripts/massScavenge.js';
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

  async startMassRecruting() {
    this.runToken += 1;
    this.clearScheduledActions();
    this.persistStopped(false);
    this.persistPhase('');
    const token = this.runToken;

    if (this.botProtection.checkNow()) return;

    this.state.runtime.running = true;
    this.persistRunning(true);

    this.state.runtime.status = 'lade Raubzug';
    this.persistPhase('open_mass_scavenge');
    this.banner.update();

    const loaded = await this.loadMassScavengeTool();
    if (loaded && this.canContinue(token) && this.isMassScavengePage()) {
      this.persistPhase('calculate_runtimes');
      this.scheduleCalculateRuntimesClick();
    }
  }

  stopMassRecruting() {
    this.runToken += 1;
    this.clearScheduledActions();
    this.state.runtime.running = false;
    this.state.runtime.status = 'angehalten';
    this.persistRunning(false);
    this.persistPhase('');
    this.persistStopped(true);
    this.banner.update();
  }

  resumeIfRunning() {
    if (this.readPersistedStopped()) return;
    if (!this.state.runtime.running) return;

    const phase = this.readPersistedPhase();
    if (phase === 'calculate_runtimes') {
      this.scheduleCalculateRuntimesClick();
      return;
    }

    if (phase === 'launch_group') {
      this.scheduleLaunchGroupClick(this.runToken);
      return;
    }

    if (phase === 'open_mass_scavenge' || this.isMassScavengePage()) {
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

      this.setStatus('lade Massenraubzug');
      this.persistPhase('calculate_runtimes');
      const loaded = await this.loadMassScavengeTool();
      if (loaded && this.canContinue(token)) {
        this.scheduleCalculateRuntimesClick();
      }
    }, delay);
  }

  async loadMassScavengeTool() {
    if (!window.jQuery?.getScript && !window.$?.getScript) {
      this.failRun('jQuery fehlt');
      return false;
    }

    try {
      window.premiumBtnEnabled = false;
      await new Promise((resolve, reject) => {
        (window.jQuery || window.$).getScript(MASS_SCAVENGE_SCRIPT_URL)
          .done(resolve)
          .fail((xhr, status, error) => reject(error || status || xhr));
      });
      if (this.readPersistedStopped()) return false;
      return true;
    } catch (error) {
      console.error('[Mass Recruting] massScavenge.js konnte nicht geladen werden.', error);
      this.failRun('Raubzug-Tool nicht geladen');
      return false;
    }
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
      this.scheduleLaunchGroupClick(token);
    }, delay);
  }

  scheduleLaunchGroupClick(token) {
    const delay = this.getRandomDelayMs();
    this.persistPhase('launch_group');
    this.setStatus(`warte ${delay} ms`);

    this.schedule(async () => {
      if (!this.canContinue(token)) return;
      if (this.botProtection.checkNow()) return;

      this.setStatus('suche Launch');
      const button = await this.waitForLaunchGroupButton(token);
      if (!button) {
        this.failRun('Launch nicht gefunden');
        return;
      }

      this.setStatus('klicke Launch');
      this.activateElement(button);
      this.setStatus('Launch geklickt');
      this.state.runtime.running = false;
      this.persistRunning(false);
      this.persistPhase('');
      this.banner.update();
    }, delay);
  }

  async waitForCalculateRuntimesButton(token) {
    return this.waitForButton(token, () => this.findCalculateRuntimesButton());
  }

  async waitForLaunchGroupButton(token) {
    return this.waitForButton(token, () => this.findLaunchGroupButton());
  }

  async waitForButton(token, finder) {
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
      && !this.state.runtime.botProtectionTriggered
      && !this.readPersistedStopped();
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
    if (this.readPersistedStopped()) {
      this.state.runtime.running = false;
      this.state.runtime.status = 'angehalten';
      return;
    }

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

  readPersistedStopped() {
    try {
      return window.localStorage?.getItem(STOPPED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  persistStopped(isStopped) {
    try {
      if (isStopped) {
        window.localStorage?.setItem(STOPPED_STORAGE_KEY, '1');
      } else {
        window.localStorage?.removeItem(STOPPED_STORAGE_KEY);
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
    const primary = Array.from(document.querySelectorAll('#sendMass')).find(element => {
      const onclick = element.getAttribute('onclick') || '';
      return onclick.includes('readyToSend') && this.isClickableElement(element);
    });
    if (primary) return primary;

    const root = document.querySelector('#scavenge_mass_screen') || document;
    const fallbackPrimary = root.querySelector('#sendMass');
    if (fallbackPrimary && this.isClickableElement(fallbackPrimary)) return fallbackPrimary;

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

  findLaunchGroupButton() {
    const primary = Array.from(document.querySelectorAll('#sendMass')).find(element => {
      const onclick = element.getAttribute('onclick') || '';
      const label = this.normalizeText(element.value || element.textContent || '');
      return onclick.includes('sendGroup(0')
        && label.includes('launch group 1')
        && this.isClickableElement(element);
    });
    if (primary) return primary;

    return Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a, [role="button"], .btn'))
      .find(element => {
        if (!this.isClickableElement(element)) return false;

        const onclick = element.getAttribute('onclick') || '';
        const label = this.normalizeText([
          element.value,
          element.textContent,
          element.getAttribute('title'),
          element.getAttribute('aria-label')
        ].filter(Boolean).join(' '));

        return onclick.includes('sendGroup(0')
          || label.includes('launch group 1');
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
