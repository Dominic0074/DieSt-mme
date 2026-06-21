const STORAGE_KEY = 'dsAuto.readerState.v1';

export class StorageService {
  loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? sanitizeStoredState(JSON.parse(raw)) : {};
    } catch (error) {
      console.warn('[DS Auto] Speicher konnte nicht gelesen werden', error);
      return {};
    }
  }

  merge(patch) {
    const current = this.loadAll();
    const next = deepMerge(current, patch || {});
    this.saveAll(next);
    return next;
  }

  saveAll(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value || {}));
    } catch (error) {
      console.warn('[DS Auto] Speicher konnte nicht geschrieben werden', error);
    }
  }
}

export function mergeInto(target, patch) {
  if (!target || !patch) return target;
  deepMerge(target, patch);
  return target;
}

function sanitizeStoredState(state) {
  if (state?.village?.resourceProductionPerSecond) {
    delete state.village.resourceProductionPerSecond;
  }

  return state || {};
}

function deepMerge(target, patch) {
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) target[key] = {};
      deepMerge(target[key], value);
      return;
    }

    target[key] = value;
  });

  return target;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
