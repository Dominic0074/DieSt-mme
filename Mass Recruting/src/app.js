import { createDefaultState } from './core/default-state.js';
import { BotProtectionService } from './core/bot-protection-service.js';
import { StatusBanner } from './ui/status-banner.js';

const RUNNING_STORAGE_KEY = 'massRecruting.running';

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
  }

  start() {
    this.banner.mount();
    this.banner.onStart(() => this.startMassRecruting());
    this.banner.onStop(() => this.stopMassRecruting());
    this.botProtection.start();
    this.startBannerTicker();
  }

  startMassRecruting() {
    if (this.botProtection.checkNow()) return;

    this.state.runtime.running = true;
    this.state.runtime.status = 'oeffne Raubzug';
    this.persistRunning(true);
    this.banner.update();

    const raidMenuLink = this.findRaidMenuLink();
    if (raidMenuLink) {
      raidMenuLink.click();
      return;
    }

    this.state.runtime.status = 'Raubzug nicht gefunden';
    this.state.runtime.running = false;
    this.persistRunning(false);
    this.banner.update();
    console.warn('[Mass Recruting] Raubzug-Link in der Menueleiste nicht gefunden.');
  }

  stopMassRecruting() {
    this.state.runtime.running = false;
    this.state.runtime.status = 'angehalten';
    this.persistRunning(false);
    this.banner.update();
  }

  hydrateRuntime() {
    if (this.readPersistedRunning()) {
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

  findRaidMenuLink() {
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
