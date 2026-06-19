import { parseCountdownMs } from '../utils/time.js';

const OPTION_NAMES = {
  1: 'Faule Sammler',
  2: 'Bescheidene Sammler',
  3: 'Kluge Sammler',
  4: 'Grossartige Sammler'
};

export class ScavengeReader {
  supports(page) {
    return page.screen === 'place' && page.mode === 'scavenge';
  }

  read() {
    const fromGameData = this.readFromGameData();
    const readyTimes = Object.keys(fromGameData.readyTimes).length > 0
      ? fromGameData.readyTimes
      : this.readFromDom();

    const nextReadyAt = Object.values(readyTimes)
      .filter(timestamp => timestamp > Date.now())
      .sort((a, b) => a - b)[0] || null;

    return {
      scavenge: {
        lastReadAt: Date.now(),
        readyTimes,
        nextReadyAt,
        activeCount: Object.keys(readyTimes).length,
        homeUnits: fromGameData.homeUnits,
        squads: fromGameData.squads
      }
    };
  }

  readFromGameData() {
    const village = this.getVillageData();
    const result = {
      readyTimes: {},
      homeUnits: {},
      squads: {}
    };

    if (!village) return result;

    result.homeUnits = village.unit_counts_home || {};

    Object.entries(village.options || {}).forEach(([optionId, option]) => {
      const squad = option?.scavenging_squad;
      if (!squad) return;

      const timestamp = Number(squad.return_time) * 1000;
      if (!Number.isFinite(timestamp) || timestamp <= Date.now()) return;

      result.readyTimes[optionId] = timestamp;
      result.squads[optionId] = {
        id: optionId,
        name: OPTION_NAMES[optionId] || `Slot ${optionId}`,
        returnAt: timestamp,
        units: squad.unit_counts || {},
        carryMax: Number(squad.carry_max || 0),
        loot: squad.loot_res || {}
      };
    });

    return result;
  }

  getVillageData() {
    if (window.village?.options) return window.village;

    const scriptText = Array.from(document.scripts)
      .map(script => script.textContent || '')
      .find(text => text.includes('var village =') && text.includes('scavenging_squad'));

    if (!scriptText) return null;

    const match = scriptText.match(/var\s+village\s*=\s*(\{[\s\S]*?\});/);
    if (!match) return null;

    try {
      return JSON.parse(match[1]);
    } catch (error) {
      console.warn('[DS Auto] Raubzugdaten konnten nicht aus Seiten-JSON gelesen werden', error);
      return null;
    }
  }

  readFromDom() {
    const result = {};
    const options = Array.from(document.querySelectorAll('.scavenge-option'));

    options.forEach((option, fallbackIndex) => {
      const optionId = this.getOptionId(option, fallbackIndex);
      const timestamps = Array.from(option.querySelectorAll(
        '.return-countdown, .timer, [data-endtime], [data-end-time]'
      ))
        .map(element => this.getElementEndTime(element))
        .filter(timestamp => timestamp && timestamp > Date.now());

      if (timestamps.length > 0) result[optionId] = Math.min(...timestamps);
    });

    return result;
  }

  getOptionId(option, fallbackIndex) {
    const fromData = option.getAttribute('data-option-id') || option.dataset?.optionId;
    if (fromData) return String(fromData);

    const classMatch = option.className.match(/option-(\d+)/);
    if (classMatch) return classMatch[1];

    return String(fallbackIndex + 1);
  }

  getElementEndTime(element) {
    const dataValue = element.getAttribute('data-endtime') ||
      element.getAttribute('data-end-time') ||
      element.dataset?.endtime ||
      element.dataset?.endTime;

    if (dataValue) {
      const numeric = Number(dataValue);
      if (Number.isFinite(numeric)) {
        const timestamp = numeric < 10000000000 ? numeric * 1000 : numeric;
        if (timestamp > Date.now()) return timestamp;
      }
    }

    const countdownMs = parseCountdownMs(element.textContent || '');
    return countdownMs ? Date.now() + countdownMs : null;
  }
}
