import { createDefaultState } from './core/default-state.js';
import { BotProtectionService } from './core/bot-protection-service.js';
import { ReaderOrchestrator } from './core/reader-orchestrator.js';
import { BarracksReader } from './readers/barracks-reader.js';
import { ScavengeReader } from './readers/scavenge-reader.js';
import { StableReader } from './readers/stable-reader.js';
import { StorageService } from './storage/storage-service.js';
import { readCurrentPage } from './utils/page.js';
import { StatusBanner } from './ui/status-banner.js';
import { TrainingConfigModal } from './ui/training-config-modal.js';

export class App {
  constructor() {
    this.state = createDefaultState();
    this.storage = new StorageService();
    this.banner = new StatusBanner(this.state);
    this.trainingConfigModal = new TrainingConfigModal(this.state, this.storage, {
      onSaved: () => this.banner.update()
    });
    this.botProtection = new BotProtectionService(this.state, {
      onChecked: () => this.banner.update(),
      onTriggered: () => this.banner.update()
    });
    this.readerOrchestrator = new ReaderOrchestrator(this.state, {
      storage: this.storage,
      readers: [
        new ScavengeReader(),
        new BarracksReader(),
        new StableReader()
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
    this.banner.onConfigureTraining(() => this.trainingConfigModal.open());
    this.botProtection.start();
    this.readerOrchestrator.readCurrentPage();
    this.startBannerTicker();
  }

  startBannerTicker() {
    if (this.bannerIntervalId) return;

    this.bannerIntervalId = window.setInterval(() => {
      this.banner.update();
    }, 1000);
  }
}
