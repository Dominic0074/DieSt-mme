import { AttackCommandService } from './attack-command-service.js';
import { buildPlaceUrl, getCurrentScreen, getCurrentVillageId, hasMode } from '../utils/page.js';
import { formatRemaining, getServerNow } from '../utils/time.js';

export class AttackDispatcher {
  constructor({ config, storage, botProtection, onStatus }) {
    this.config = config;
    this.storage = storage;
    this.botProtection = botProtection;
    this.commands = new AttackCommandService();
    this.onStatus = onStatus;
  }

  async resumeOnTribalWarsPage() {
    const state = await this.storage.loadState();
    const attack = state.attacks.find(item => item.id === state.runtime.activeAttackId);
    if (!attack) return;

    if (this.commands.isConfirmationPage()) {
      await this.submitConfirmation(state, attack);
      return;
    }

    await this.prepareAndSend(state, attack);
  }

  async prepareAndSend(state, attack) {
    const remaining = attack.sendAt - getServerNow();
    if (remaining < -this.config.maxLateMs) {
      this.status(`Angriff ${attack.id}: Send Time verpasst.`);
      await this.storage.patchRuntime({ activeAttackId: null, preparedAttackId: null, firstClickAt: null });
      return;
    }

    const sourceVillageId = this.readSourceVillageId(attack);
    if (sourceVillageId && getCurrentVillageId() !== sourceVillageId) {
      this.status(`Angriff ${attack.id}: wechselt ins Startdorf.`);
      location.href = buildPlaceUrl(sourceVillageId);
      return;
    }

    if (getCurrentScreen() !== 'place' || hasMode() || !this.commands.getForm()) {
      this.status(`Angriff ${attack.id}: oeffnet den Versammlungsplatz.`);
      location.href = buildPlaceUrl(sourceVillageId);
      return;
    }

    const units = this.resolveUnits(state, attack);
    const controls = this.commands.fillFirstForm(attack, units);
    if (controls.error) {
      this.status(controls.error, true);
      return;
    }
    if (this.botProtection.checkNow()) {
      this.status('Bot-Schutz erkannt. Versand wurde gestoppt.', true);
      return;
    }

    await this.waitForFirstClick(attack, controls);
  }

  async waitForFirstClick(attack, controls) {
    const remaining = attack.sendAt - getServerNow();
    if (remaining > 1000) {
      this.status(`Angriff ${attack.id}: Formular bereit, Abschicken in ${formatRemaining(remaining)}.`);
      window.setTimeout(() => this.waitForFirstClick(attack, controls), Math.min(remaining - 500, 1000));
      return;
    }
    if (remaining > 20) {
      window.setTimeout(() => this.waitForFirstClick(attack, controls), Math.max(1, remaining - 10));
      return;
    }
    if (remaining > 0) {
      window.requestAnimationFrame(() => this.waitForFirstClick(attack, controls));
      return;
    }
    if (-remaining > this.config.maxLateMs) {
      this.status(`Angriff ${attack.id}: ersten Klick um ${Math.round(-remaining)} ms verpasst.`, true);
      return;
    }
    if (this.botProtection.checkNow()) {
      this.status('Bot-Schutz erkannt. Versand wurde gestoppt.', true);
      return;
    }

    await this.storage.patchRuntime({
      preparedAttackId: attack.id,
      firstClickAt: getServerNow()
    });
    this.status(`Angriff ${attack.id}: Bestaetigungsseite wird geoeffnet.`);
    this.commands.submit(controls.form, controls.button);
  }

  async submitConfirmation(state, attack) {
    const controls = this.commands.getConfirmationControls();
    if (controls.error) {
      this.status(controls.error, true);
      return;
    }

    if (state.runtime.preparedAttackId !== attack.id || !Number.isFinite(state.runtime.firstClickAt)) {
      this.status('Bestaetigungsseite gehoert nicht zum vorbereiteten Angriff.', true);
      return;
    }

    const confirmationAge = getServerNow() - state.runtime.firstClickAt;
    if (confirmationAge > this.config.confirmTimeoutMs) {
      this.status(`Bestaetigungsseite brauchte ${Math.round(confirmationAge)} ms. Kein Versand.`, true);
      return;
    }
    if (this.botProtection.checkNow()) {
      this.status('Bot-Schutz erkannt. Versand wurde gestoppt.', true);
      return;
    }

    const sentAttackIds = [...new Set([...(state.runtime.sentAttackIds || []), attack.id])];
    await this.storage.patchRuntime({
      activeAttackId: null,
      preparedAttackId: null,
      firstClickAt: null,
      sentAttackIds
    });

    this.status(`Angriff ${attack.id}: finaler Klick.`);
    this.commands.submit(controls.form, controls.button);
  }

  resolveUnits(state, attack) {
    return state.templates?.[attack.categoryKey]?.units || attack.units || {};
  }

  readSourceVillageId(attack) {
    const url = attack.playUrl ? new URL(attack.playUrl, location.href) : null;
    return url?.searchParams.get('village') || null;
  }

  status(message, isError = false) {
    this.onStatus?.(message, isError);
    if (isError) console.error(`AngriffsPlaner: ${message}`);
    else console.log(`AngriffsPlaner: ${message}`);
  }
}
