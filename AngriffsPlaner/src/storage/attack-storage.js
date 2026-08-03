export class AttackStorage {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  async loadState() {
    const fallback = {
      attacks: [],
      templates: {},
      runtime: {
        running: false,
        activeAttackId: null,
        preparedAttackId: null,
        firstClickAt: null,
        sentAttackIds: []
      },
      updatedAt: null
    };

    const raw = await this.getValue(this.storageKey);
    if (!raw) return fallback;

    try {
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  }

  async saveState(state) {
    await this.setValue(this.storageKey, JSON.stringify({
      ...state,
      updatedAt: Date.now()
    }));
  }

  async saveAttacks(attacks) {
    const state = await this.loadState();
    state.attacks = attacks;
    state.templates = this.mergeTemplatesWithCategories(state.templates, attacks);
    await this.saveState(state);
    return state;
  }

  async saveTemplates(templates) {
    const state = await this.loadState();
    state.templates = templates;
    await this.saveState(state);
    return state;
  }

  async patchRuntime(patch) {
    const state = await this.loadState();
    state.runtime = { ...state.runtime, ...patch };
    await this.saveState(state);
    return state;
  }

  mergeTemplatesWithCategories(existingTemplates, attacks) {
    const templates = { ...existingTemplates };
    for (const attack of attacks) {
      if (!attack.categoryKey || templates[attack.categoryKey]) continue;
      templates[attack.categoryKey] = {
        label: attack.categoryLabel,
        units: { ...attack.units }
      };
    }
    return templates;
  }

  async getValue(key) {
    if (typeof GM_getValue === 'function') {
      return GM_getValue(key);
    }
    if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') {
      return GM.getValue(key);
    }
    return localStorage.getItem(key);
  }

  async setValue(key, value) {
    if (typeof GM_setValue === 'function') {
      GM_setValue(key, value);
      return;
    }
    if (typeof GM !== 'undefined' && typeof GM.setValue === 'function') {
      await GM.setValue(key, value);
      return;
    }
    localStorage.setItem(key, value);
  }
}
