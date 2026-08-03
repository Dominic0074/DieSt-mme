const ROOT_ID = 'dorf-renamer-controls';
const REFERENCE_STORAGE_PREFIX = 'dorfRenamer.referenceVillage';
const KNOWN_VILLAGES_STORAGE_PREFIX = 'dorfRenamer.knownVillages';

export class App {
  start() {
    if (!this.isMainScreen()) return;

    this.cacheCurrentVillage();
    this.mountControls();
  }

  isMainScreen() {
    const params = new URLSearchParams(window.location.search);
    return params.get('screen') === 'main' && !params.has('ajax');
  }

  mountControls() {
    if (document.getElementById(ROOT_ID)) return;

    const form = this.findRenameForm();
    if (!form) {
      console.warn('[DorfRenamer] Umbenennen-Formular nicht gefunden.');
      return;
    }

    const submitCell = form.querySelector('input[type="submit"]')?.closest('td');
    if (!submitCell) {
      console.warn('[DorfRenamer] Umbenennen-Button nicht gefunden.');
      return;
    }

    const controls = document.createElement('span');
    controls.id = ROOT_ID;
    controls.style.display = 'inline-flex';
    controls.style.alignItems = 'center';
    controls.style.gap = '6px';
    controls.style.marginLeft = '6px';
    controls.style.flexWrap = 'wrap';

    const renameButton = this.createButton('Naming Convention Anpassen', () => this.renameCurrentVillage());
    const referenceButton = this.createButton('Dieses Dorf als Referenzdorf nehmen', () => this.saveCurrentVillageAsReference());
    const referenceInfo = document.createElement('span');
    referenceInfo.id = 'dorf-renamer-reference-info';
    referenceInfo.style.color = '#603000';
    referenceInfo.style.whiteSpace = 'nowrap';

    controls.append(renameButton, referenceButton, referenceInfo);
    submitCell.appendChild(controls);
    this.updateReferenceInfo();
  }

  createButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = label;
    button.addEventListener('click', event => {
      event.preventDefault();
      onClick();
    });
    return button;
  }

  findRenameForm() {
    return Array.from(document.querySelectorAll('form')).find(form => {
      const action = form.getAttribute('action') || '';
      return action.includes('action=change_name') && form.querySelector('input[name="name"]');
    }) || null;
  }

  saveCurrentVillageAsReference() {
    const village = this.readCurrentVillage();
    if (!village) {
      this.showError('Aktuelles Dorf konnte nicht gelesen werden.');
      return;
    }

    this.writeJson(this.getReferenceStorageKey(), village);
    this.cacheKnownVillage(village);
    this.updateReferenceInfo();
    this.showSuccess(`Referenzdorf gespeichert: ${village.name} (${village.x}|${village.y})`);
  }

  async renameCurrentVillage() {
    const reference = this.readReferenceVillage();
    if (!reference) {
      this.showError('Kein Referenzdorf gesetzt. Bitte zuerst ein Referenzdorf speichern.');
      throw new Error('[DorfRenamer] Kein Referenzdorf gesetzt.');
    }

    const currentVillage = this.readCurrentVillage();
    if (!currentVillage) {
      this.showError('Aktuelles Dorf konnte nicht gelesen werden.');
      throw new Error('[DorfRenamer] Aktuelles Dorf konnte nicht gelesen werden.');
    }

    this.cacheKnownVillage(currentVillage);

    const villages = await this.loadVillageList(reference, currentVillage);
    const villageNumber = this.getVillageNumber(villages, reference, currentVillage);
    if (!villageNumber) {
      this.showError('Dorfnummer konnte nicht berechnet werden. Dorfliste ist unvollstaendig.');
      throw new Error('[DorfRenamer] Dorfnummer konnte nicht berechnet werden.');
    }

    const nextName = this.buildVillageName(villageNumber, reference, currentVillage);
    const form = this.findRenameForm();
    const nameInput = form?.querySelector('input[name="name"]');
    if (!form || !nameInput) {
      this.showError('Umbenennen-Formular nicht gefunden.');
      throw new Error('[DorfRenamer] Umbenennen-Formular nicht gefunden.');
    }

    if (nameInput.value === nextName) {
      this.showSuccess(`Dorfname ist bereits korrekt: ${nextName}`);
      return;
    }

    nameInput.value = nextName;
    form.submit();
  }

  async loadVillageList(reference, currentVillage) {
    const apiVillages = await this.fetchVillagesFromGameApi();
    const fetchedVillages = apiVillages.length > 0 ? apiVillages : await this.fetchVillagesFromOverview();
    if (fetchedVillages.length > 0) {
      this.writeJson(this.getKnownVillagesStorageKey(), fetchedVillages);
      return fetchedVillages;
    }

    const cachedVillages = this.readKnownVillages();
    return this.mergeVillages(cachedVillages, [reference, currentVillage]);
  }

  async fetchVillagesFromGameApi() {
    try {
      const response = await fetch(this.buildVillageGroupApiUrl(), {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json, text/html;q=0.9, */*;q=0.8'
        }
      });
      if (!response.ok) return [];

      const text = await response.text();
      const trimmed = text.trim();
      if (!trimmed) return [];

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return this.parseVillagesFromJson(JSON.parse(trimmed));
      }

      return this.parseVillagesFromHtml(text);
    } catch (error) {
      console.warn('[DorfRenamer] Dorfliste konnte nicht ueber die Spiel-API geladen werden.', error);
      return [];
    }
  }

  buildVillageGroupApiUrl() {
    const configuredLink = document.getElementById('show_groups_villages_link')?.value;
    const url = new URL(configuredLink || '/game.php', window.location.origin);
    if (!configuredLink) {
      if (window.game_data?.village?.id) {
        url.searchParams.set('village', String(window.game_data.village.id));
      }
      url.searchParams.set('screen', 'groups');
      url.searchParams.set('ajax', 'load_villages_from_group');
      url.searchParams.set('mode', 'overview');
    }
    if (!url.searchParams.has('group_id')) url.searchParams.set('group_id', '0');
    return url.toString();
  }

  async fetchVillagesFromOverview() {
    try {
      const response = await fetch(this.buildOverviewVillagesUrl(), {
        credentials: 'same-origin'
      });
      if (!response.ok) return [];

      const html = await response.text();
      return this.parseVillagesFromHtml(html);
    } catch (error) {
      console.warn('[DorfRenamer] Dorfliste konnte nicht geladen werden.', error);
      return [];
    }
  }

  buildOverviewVillagesUrl() {
    const url = new URL(window.location.href);
    url.pathname = '/game.php';
    url.search = '';
    if (window.game_data?.village?.id) {
      url.searchParams.set('village', String(window.game_data.village.id));
    }
    url.searchParams.set('screen', 'overview_villages');
    url.searchParams.set('mode', 'combined');
    url.hash = '';
    return url.toString();
  }

  parseVillagesFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const byId = new Map();

    for (const link of doc.querySelectorAll('a[href*="village="]')) {
      const href = link.getAttribute('href') || '';
      const idMatch = href.match(/[?&]village=(\d+)/);
      if (!idMatch) continue;

      const text = this.normalizeSpace(`${link.textContent || ''} ${link.closest('tr')?.textContent || ''}`);
      const coordMatch = text.match(/\((\d{1,3})\|(\d{1,3})\)|\b(\d{1,3})\|(\d{1,3})\b/);
      if (!coordMatch) continue;

      const x = Number(coordMatch[1] || coordMatch[3]);
      const y = Number(coordMatch[2] || coordMatch[4]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

      const name = this.extractName(link.textContent || '', x, y);
      byId.set(String(idMatch[1]), {
        id: String(idMatch[1]),
        name,
        x,
        y
      });
    }

    return Array.from(byId.values());
  }

  parseVillagesFromJson(payload) {
    const byId = new Map();

    for (const item of this.walkJson(payload)) {
      const village = this.normalizeVillageFromApiItem(item);
      if (village) byId.set(village.id, village);
    }

    return Array.from(byId.values());
  }

  *walkJson(value) {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      for (const item of value) yield* this.walkJson(item);
      return;
    }

    yield value;
    for (const item of Object.values(value)) {
      yield* this.walkJson(item);
    }
  }

  normalizeVillageFromApiItem(item) {
    const id = item.id ?? item.village_id ?? item.villageId;
    const name = item.name ?? item.village_name ?? item.villageName ?? item.text;
    const coord = item.coord ?? item.coords ?? item.coordinate ?? item.coordinates;
    const coordMatch = String(coord || name || '').match(/\(?(\d{1,3})\|(\d{1,3})\)?/);
    const x = Number(item.x ?? coordMatch?.[1]);
    const y = Number(item.y ?? coordMatch?.[2]);

    if (id === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return null;

    return {
      id: String(id),
      name: this.extractName(String(name || ''), x, y),
      x,
      y
    };
  }

  getVillageNumber(villages, reference, currentVillage) {
    if (String(currentVillage.id) === String(reference.id)) return 1;

    const otherVillages = this.mergeVillages(villages, this.readKnownVillages())
      .filter(village => String(village.id) !== String(currentVillage.id))
      .filter(village => String(village.id) !== String(reference.id));
    const highestIndex = otherVillages.reduce((highest, village) => {
      const index = this.extractNamingIndex(village.name);
      return index ? Math.max(highest, index) : highest;
    }, 1);

    return highestIndex + 1;
  }

  buildVillageName(villageNumber, reference, currentVillage) {
    const relativeX = currentVillage.x - reference.x;
    const relativeY = reference.y - currentVillage.y;
    return `${String(villageNumber).padStart(3, '0')} ${this.formatSigned(relativeX)} ${this.formatSigned(relativeY)}`;
  }

  formatSigned(value) {
    const prefix = value >= 0 ? '+' : '-';
    return `${prefix}${String(Math.abs(value)).padStart(2, '0')}`;
  }

  readCurrentVillage() {
    const village = window.game_data?.village;
    if (!village) return null;

    const x = Number(village.x);
    const y = Number(village.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    return {
      id: String(village.id || ''),
      name: String(village.name || ''),
      x,
      y
    };
  }

  cacheCurrentVillage() {
    const village = this.readCurrentVillage();
    if (village) this.cacheKnownVillage(village);
  }

  cacheKnownVillage(village) {
    const villages = this.mergeVillages(this.readKnownVillages(), [village]);
    this.writeJson(this.getKnownVillagesStorageKey(), villages);
  }

  readReferenceVillage() {
    const reference = this.readJson(this.getReferenceStorageKey());
    return this.isValidVillage(reference) ? reference : null;
  }

  readKnownVillages() {
    const villages = this.readJson(this.getKnownVillagesStorageKey());
    return Array.isArray(villages) ? villages.filter(village => this.isValidVillage(village)) : [];
  }

  mergeVillages(...groups) {
    const byId = new Map();
    for (const group of groups) {
      for (const village of group || []) {
        if (this.isValidVillage(village)) {
          byId.set(String(village.id), {
            id: String(village.id),
            name: String(village.name || ''),
            x: Number(village.x),
            y: Number(village.y)
          });
        }
      }
    }
    return Array.from(byId.values());
  }

  isValidVillage(village) {
    return Boolean(village)
      && village.id !== undefined
      && Number.isFinite(Number(village.x))
      && Number.isFinite(Number(village.y));
  }

  extractNamingIndex(name) {
    const match = String(name || '').trim().match(/^(\d{3})\s+[+-]\d{2}\s+[+-]\d{2}\b/);
    if (!match) return null;

    const index = Number(match[1]);
    return Number.isInteger(index) && index > 0 ? index : null;
  }

  updateReferenceInfo() {
    const info = document.getElementById('dorf-renamer-reference-info');
    if (!info) return;

    const reference = this.readReferenceVillage();
    info.textContent = reference
      ? `Referenzdorf: ${reference.name || reference.id} (${reference.x}|${reference.y})`
      : 'Referenzdorf: nicht gesetzt';
  }

  getReferenceStorageKey() {
    return `${REFERENCE_STORAGE_PREFIX}.${this.getStorageScope()}`;
  }

  getKnownVillagesStorageKey() {
    return `${KNOWN_VILLAGES_STORAGE_PREFIX}.${this.getStorageScope()}`;
  }

  getStorageScope() {
    const world = window.game_data?.world || location.hostname;
    const playerId = window.game_data?.player?.id || 'unknown';
    return `${world}.${playerId}`;
  }

  readJson(key) {
    try {
      const raw = window.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  writeJson(key, value) {
    try {
      window.localStorage?.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('[DorfRenamer] LocalStorage konnte nicht geschrieben werden.', error);
    }
  }

  showSuccess(message) {
    if (window.UI?.SuccessMessage) {
      window.UI.SuccessMessage(message);
      return;
    }
    console.info(`[DorfRenamer] ${message}`);
  }

  showError(message) {
    if (window.UI?.ErrorMessage) {
      window.UI.ErrorMessage(message);
      return;
    }
    window.alert(message);
  }

  extractName(text, x, y) {
    return this.normalizeSpace(text)
      .replace(new RegExp(`\\(?${x}\\|${y}\\)?\\s*K?\\d*`, 'g'), '')
      .trim();
  }

  normalizeSpace(value) {
    return String(value).replace(/\s+/g, ' ').trim();
  }
}
