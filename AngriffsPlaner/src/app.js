import { CONFIG } from './config/config.js';
import { AttackDispatcher } from './core/attack-dispatcher.js';
import { AttackPlannerReader } from './core/attack-planner-reader.js';
import { BotProtectionService } from './core/bot-protection-service.js';
import { AttackStorage } from './storage/attack-storage.js';
import { ControlPanel } from './ui/control-panel.js';
import { StatusBanner } from './ui/status-banner.js';
import { WatchWindow } from './ui/watch-window.js';
import { isDsUltimateAttackPlannerPage, isTribalWarsPage } from './utils/page.js';

export class AttackPlannerApp {
  constructor(config = CONFIG) {
    this.config = config;
    this.storage = new AttackStorage(config.storageKey);
    this.status = new StatusBanner();
    this.botProtection = new BotProtectionService({
      onTriggered: () => this.status.error('Bot-Schutz erkannt. Versand wurde gestoppt.')
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
}
