import { mergeInto } from '../storage/storage-service.js';

export class ReaderOrchestrator {
  constructor(state, { storage, readers = [], hooks = {} }) {
    this.state = state;
    this.storage = storage;
    this.readers = readers;
    this.hooks = hooks;
  }

  hydrate() {
    const storedState = this.storage.loadAll();
    mergeInto(this.state, storedState);
    this.hooks.onUpdated?.();
  }

  readCurrentPage() {
    if (this.state.runtime.botProtectionTriggered) return null;

    const patches = this.readers
      .filter(reader => reader.supports(this.state.page))
      .map(reader => reader.read())
      .filter(Boolean);

    if (patches.length === 0) return null;

    const pagePatch = patches.reduce((result, patch) => mergeInto(result, patch), {});
    const storedState = this.storage.merge(pagePatch);
    mergeInto(this.state, storedState);
    this.hooks.onUpdated?.();

    return pagePatch;
  }
}
