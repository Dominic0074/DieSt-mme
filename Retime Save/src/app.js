import { CONFIG } from './config/config.js';
import { BotProtectionService } from './core/bot-protection-service.js';
import { SupportCommandService } from './core/support-command-service.js';
import { ExecutionStorage } from './storage/execution-storage.js';
import { createRuntimeState } from './types/runtime-state.js';
import { StatusBanner } from './ui/status-banner.js';
import {
  buildPlaceUrl,
  getCurrentScreen,
  getCurrentVillageId,
  hasMode
} from './utils/page.js';
import { formatRemaining, getServerNow, parseServerTime } from './utils/time.js';

export class RetimeSaveApp {
  constructor(config = CONFIG) {
    this.config = config;
    this.state = createRuntimeState();
    this.state.sourceVillageId = config.sourceVillageId === null
      ? getCurrentVillageId()
      : String(config.sourceVillageId);
    this.banner = new StatusBanner();
    this.botProtection = new BotProtectionService();
    this.commands = new SupportCommandService();
    this.storage = new ExecutionStorage({
      sourceVillageId: this.state.sourceVillageId,
      target: config.target
    });
  }

  start() {
    if (!this.config.enabled) {
      console.info('Retime Save: deaktiviert. enabled in config/config.js auf true setzen.');
      return;
    }

    this.state.sendAt = parseServerTime(this.config.sendAt);
    const error = this.validateConfiguration();
    if (error) {
      this.stopWithError(error);
      return;
    }
    this.run();
  }

  validateConfiguration() {
    const config = this.config;
    if (!this.state.sendAt) {
      return 'sendAt hat nicht das Format JJJJ-MM-TT HH:MM:SS.mmm.';
    }
    if (!Number.isInteger(config.target.x) || config.target.x < 0 || config.target.x > 999
      || !Number.isInteger(config.target.y) || config.target.y < 0 || config.target.y > 999) {
      return 'Die Zielkoordinaten muessen ganze Zahlen zwischen 0 und 999 sein.';
    }
    if (!Number.isFinite(config.prepareSeconds) || config.prepareSeconds < 5) {
      return 'prepareSeconds muss mindestens 5 sein.';
    }
    if (!Number.isFinite(config.maxLateMs) || config.maxLateMs < 0) {
      return 'maxLateMs darf nicht negativ sein.';
    }
    if (!Number.isFinite(config.confirmTimeoutMs) || config.confirmTimeoutMs < 1000) {
      return 'confirmTimeoutMs muss mindestens 1000 sein.';
    }

    const units = Object.entries(config.units);
    if (!units.some(([, amount]) => Number(amount) > 0)) {
      return 'In units ist keine Truppe eingetragen.';
    }
    const invalidUnit = units.find(([, amount]) => (
      !Number.isInteger(Number(amount)) || Number(amount) < 0
    ));
    if (invalidUnit) return `Die Truppenanzahl fuer "${invalidUnit[0]}" ist ungueltig.`;
    if (config.sourceVillageId !== null && !/^\d+$/.test(String(config.sourceVillageId))) {
      return 'sourceVillageId muss null oder eine numerische Dorf-ID sein.';
    }
    return null;
  }

  run() {
    const sendAt = this.state.sendAt;
    if (this.storage.wasSent(sendAt)) {
      this.banner.show('Dieser konfigurierte Auftrag wurde bereits gesendet.');
      return;
    }
    if (this.commands.isConfirmationPage()) {
      this.submitConfirmation();
      return;
    }

    const remaining = sendAt - getServerNow();
    if (remaining < -this.config.maxLateMs) {
      this.stopWithError('Absendezeit liegt in der Vergangenheit. Es wird nicht nachtraeglich gesendet.');
      return;
    }

    const untilPreparation = sendAt - this.config.prepareSeconds * 1000 - getServerNow();
    if (untilPreparation > 0) {
      this.banner.show(`Wartet. Vorbereitung in ${formatRemaining(untilPreparation)}.`);
      setTimeout(() => this.run(), Math.min(untilPreparation, 2147483647));
      return;
    }

    if (this.state.sourceVillageId && getCurrentVillageId() !== this.state.sourceVillageId) {
      this.banner.show('Wechselt zum konfigurierten Ausgangsdorf.');
      location.href = buildPlaceUrl(this.state.sourceVillageId);
      return;
    }
    if (getCurrentScreen() !== 'place' || hasMode() || !this.commands.getForm()) {
      this.banner.show('Oeffnet den Versammlungsplatz.');
      location.href = buildPlaceUrl(this.state.sourceVillageId);
      return;
    }
    this.prepareFirstForm();
  }

  prepareFirstForm() {
    const controls = this.commands.fillFirstForm(this.config);
    if (controls.error) {
      this.stopWithError(controls.error);
      return;
    }
    if (this.botProtection.isActive()) {
      this.stopWithError('Bot-Schutz erkannt. Versand wurde gestoppt.');
      return;
    }
    this.waitForFirstClick(controls);
  }

  waitForFirstClick(controls) {
    if (this.state.stopped) return;
    if (this.botProtection.isActive()) {
      this.stopWithError('Bot-Schutz erkannt. Versand wurde gestoppt.');
      return;
    }

    const remaining = this.state.sendAt - getServerNow();
    if (remaining > 1000) {
      this.banner.show(`Erstes Formular ausgefuellt. Abschicken in ${formatRemaining(remaining)}.`);
      setTimeout(() => this.waitForFirstClick(controls), Math.min(remaining - 500, 1000));
      return;
    }
    if (remaining > 20) {
      setTimeout(() => this.waitForFirstClick(controls), Math.max(1, remaining - 10));
      return;
    }
    if (remaining > 0) {
      requestAnimationFrame(() => this.waitForFirstClick(controls));
      return;
    }
    if (-remaining > this.config.maxLateMs) {
      this.stopWithError(`Ersten Klick um ${Math.round(-remaining)} ms verpasst. Es wird nicht gesendet.`);
      return;
    }

    this.storage.markFirstClick(this.state.sendAt, getServerNow());
    this.banner.show('Truppen sind eingetroffen; Bestaetigungsseite wird geoeffnet.');
    this.commands.submit(controls.form, controls.button);
  }

  submitConfirmation() {
    const controls = this.commands.getConfirmationControls();
    if (controls.error) {
      this.stopWithError(controls.error);
      return;
    }

    const firstClickAt = this.storage.getFirstClickAt(this.state.sendAt);
    if (!Number.isFinite(firstClickAt) || firstClickAt <= 0) {
      this.stopWithError('Bestaetigungsseite gehoert nicht zum vorbereiteten Retime-Save-Auftrag.');
      return;
    }
    const confirmationAge = getServerNow() - firstClickAt;
    if (confirmationAge > this.config.confirmTimeoutMs) {
      this.stopWithError(
        `Bestaetigungsseite brauchte ${Math.round(confirmationAge)} ms. Es wird nicht mehr gesendet.`
      );
      return;
    }
    if (this.botProtection.isActive()) {
      this.stopWithError('Bot-Schutz erkannt. Versand wurde gestoppt.');
      return;
    }

    this.storage.markSent(this.state.sendAt, getServerNow());
    this.storage.clearFirstClick(this.state.sendAt);
    this.banner.show('Bestaetigungsseite geladen; Unterstuetzung wird sofort gesendet.');
    console.log(
      `Retime Save: Unterstuetzung an ${this.config.target.x}|${this.config.target.y} wird gesendet.`
    );
    this.commands.submit(controls.form, controls.button);
  }

  stopWithError(message) {
    this.state.stopped = true;
    this.banner.error(message);
    console.error(`Retime Save: ${message}`);
  }
}
