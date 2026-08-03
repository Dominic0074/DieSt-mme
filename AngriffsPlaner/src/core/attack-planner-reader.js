import { parseServerTime } from '../utils/time.js';

const UNIT_NAMES = [
  'spear',
  'sword',
  'axe',
  'archer',
  'spy',
  'light',
  'marcher',
  'heavy',
  'ram',
  'catapult',
  'knight',
  'snob',
  'militia'
];

export class AttackPlannerReader {
  async readAll() {
    const table = this.getDataTable();
    const ajaxUrl = this.getAjaxUrl(table);
    if (!ajaxUrl) {
      throw new Error('DataTables-Ajax-URL wurde nicht gefunden.');
    }

    const rows = await this.fetchRows(ajaxUrl);
    return rows
      .map(row => this.mapRow(row))
      .filter(attack => attack.id && Number.isFinite(attack.sendAt));
  }

  getDataTable() {
    if (!window.jQuery?.fn?.dataTable?.isDataTable?.('#data1')) return null;
    return window.jQuery('#data1').DataTable();
  }

  getAjaxUrl(table) {
    const tableUrl = table?.ajax?.url?.();
    if (tableUrl) return tableUrl;

    const scripts = [...document.scripts].map(script => script.textContent || '').join('\n');
    const match = scripts.match(/ajax:\s*['"]([^'"]+attackListItem\/data\/[^'"]+)['"]/);
    return match?.[1] || null;
  }

  async fetchRows(ajaxUrl) {
    const url = new URL(ajaxUrl, location.href);
    const params = new URLSearchParams(url.search);
    params.set('draw', '1');
    params.set('start', '0');
    params.set('length', '10000');

    const columns = [
      'select',
      'start_village_id',
      'attacker',
      'target_village_id',
      'defender',
      'slowest_unit',
      'type',
      'send_time',
      'arrival_time',
      'time',
      'info',
      'action',
      'delete'
    ];

    columns.forEach((column, index) => {
      params.set(`columns[${index}][data]`, column);
      params.set(`columns[${index}][name]`, column);
      params.set(`columns[${index}][searchable]`, 'true');
      params.set(`columns[${index}][orderable]`, index >= 10 ? 'false' : 'true');
      params.set(`columns[${index}][search][value]`, '');
      params.set(`columns[${index}][search][regex]`, 'false');
    });
    params.set('order[0][column]', '7');
    params.set('order[0][dir]', 'asc');
    params.set('search[value]', '');
    params.set('search[regex]', 'false');

    url.search = params.toString();

    const response = await fetch(url.toString(), {
      credentials: 'include',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Angriffsliste konnte nicht geladen werden (${response.status}).`);
    }

    const payload = await response.json();
    return Array.isArray(payload.data) ? payload.data : [];
  }

  mapRow(row) {
    const rowData = row.DT_RowData || {};
    const sendAt = parseServerTime(row.send_time || row.time || `${rowData.sday || ''} ${rowData.stime || ''}`);
    const arrivalAt = parseServerTime(row.arrival_time || `${rowData.day || ''} ${rowData.time || ''}`);
    const playUrl = this.extractPlayUrl(row.action);
    const target = this.extractCoords(row.target_village_id || rowData.target || playUrl);
    const source = this.extractCoords(row.start_village_id || rowData.start || row.attacker);
    const categoryLabel = this.stripHtml(row.type || rowData.type || 'Unbekannt').trim() || 'Unbekannt';

    return {
      id: String(row.id || rowData.id || ''),
      source,
      sourceLabel: this.stripHtml(row.attacker || row.start_village_id || ''),
      target,
      targetLabel: this.stripHtml(row.defender || row.target_village_id || ''),
      categoryKey: this.normalizeCategoryKey(categoryLabel),
      categoryLabel,
      slowestUnit: this.stripHtml(row.slowest_unit || ''),
      sendAt,
      arrivalAt,
      playUrl,
      actionHtml: String(row.action || ''),
      info: this.stripHtml(row.info || ''),
      units: this.readUnits(row),
      raw: row
    };
  }

  readUnits(row) {
    const units = {};
    for (const unit of UNIT_NAMES) {
      units[unit] = this.toNonNegativeInteger(row[unit] ?? row.DT_RowData?.[unit] ?? 0);
    }
    return units;
  }

  extractPlayUrl(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');

    const link = [...template.content.querySelectorAll('a[href]')].find(anchor => {
      const text = `${anchor.textContent || ''} ${anchor.className || ''} ${anchor.innerHTML || ''}`;
      return /play|fa-play|game\.php|screen=place/i.test(text + anchor.href);
    });

    return link ? new URL(link.getAttribute('href'), location.href).toString() : '';
  }

  extractCoords(value) {
    const text = this.stripHtml(value);
    const match = text.match(/(\d{1,3})\|(\d{1,3})/);
    if (!match) return null;
    return {
      x: Number(match[1]),
      y: Number(match[2])
    };
  }

  stripHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');
    return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
  }

  normalizeCategoryKey(value) {
    return String(value || 'unknown')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'unknown';
  }

  toNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : 0;
  }
}
