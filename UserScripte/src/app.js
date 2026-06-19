import { createDefaultState } from './core/default-state.js';
import { BotProtectionService } from './core/bot-protection-service.js';
import { readCurrentPage } from './utils/page.js';
import { StatusBanner } from './ui/status-banner.js';

export class App {
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
}
