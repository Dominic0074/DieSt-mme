import { createDefaultState } from './core/default-state.js';
import { BotProtectionService } from './core/bot-protection-service.js';
import { StatusBanner } from './ui/status-banner.js';

export class App {
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
    }, 1000);
  }
}
