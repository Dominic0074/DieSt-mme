import { parseCountdownMs } from '../utils/time.js';

export class MainBuildingReader {
  supports(page) {
    return page.screen === 'main';
  }

  read() {
    return {
      mainBuilding: {
        lastReadAt: Date.now(),
        levels: this.readLevels(),
        queue: this.readBuildQueue(),
        upgradeInfo: this.readUpgradeInfo()
      }
    };
  }

  readLevels() {
    const fromGameData = this.readLevelsFromGameData();
    if (Object.keys(fromGameData).length > 0) return fromGameData;

    return this.readLevelsFromRows();
  }

  readLevelsFromGameData() {
    const buildings = window.game_data?.village?.buildings || window.BuildingMain?.buildings || {};

    return Object.fromEntries(
      Object.entries(buildings)
        .map(([key, value]) => {
          const level = typeof value === 'object' ? value.level : value;
          return [key, Number(level)];
        })
        .filter(([, level]) => Number.isFinite(level))
    );
  }

  readLevelsFromRows() {
    const levels = {};

    document.querySelectorAll('#buildings tr[id^="main_buildrow_"]').forEach(row => {
      const building = row.id.replace('main_buildrow_', '');
      const levelText = Array.from(row.querySelectorAll('span'))
        .map(node => node.textContent || '')
        .find(text => /Stufe\s+\d+/i.test(text));
      const match = (levelText || '').match(/Stufe\s+(\d+)/i);
      if (match) levels[building] = Number(match[1]);
    });

    return levels;
  }

  readUpgradeInfo() {
    const buildings = window.BuildingMain?.buildings || {};

    return Object.fromEntries(
      Object.entries(buildings)
        .map(([building, info]) => [building, this.normalizeUpgradeInfo(info)])
        .filter(([, info]) => info)
    );
  }

  normalizeUpgradeInfo(info) {
    if (!info || typeof info !== 'object') return null;

    return {
      name: info.name || '',
      level: toNumber(info.level),
      nextLevel: toNumber(info.level_next),
      maxLevel: toNumber(info.max_level),
      canBuild: Boolean(info.can_build),
      error: info.error || null,
      forecastAt: toTimestamp(info.forecast?.when),
      costs: {
        wood: toNumber(info.wood),
        stone: toNumber(info.stone),
        iron: toNumber(info.iron),
        population: toNumber(info.pop)
      },
      factors: {
        wood: toNumber(info.wood_factor),
        stone: toNumber(info.stone_factor),
        iron: toNumber(info.iron_factor),
        population: toNumber(info.pop_factor)
      },
      buildTimeSeconds: toNumber(info.build_time)
    };
  }

  readBuildQueue() {
    return Array.from(document.querySelectorAll('#build_queue tr[class*="buildorder_"]'))
      .map((row, index) => this.readQueueRow(row, index))
      .filter(Boolean);
  }

  readQueueRow(row, index) {
    const classMatch = row.className.match(/buildorder_([a-z_]+)/);
    const building = classMatch?.[1] || '';
    const cells = row.querySelectorAll('td');
    const constructionCell = cells[0];
    const durationCell = cells[1];
    const finishCell = cells[2];

    const constructionText = normalizeText(constructionCell?.textContent || '');
    const targetLevel = readTargetLevel(constructionText);
    const durationText = normalizeText(durationCell?.textContent || '');
    const finishText = normalizeText(finishCell?.textContent || '');
    const finishAt = this.readFinishAt(durationCell, durationText);

    if (!building && !targetLevel && !finishAt) return null;

    return {
      index: index + 1,
      building,
      name: readBuildingName(constructionText),
      targetLevel,
      durationText,
      finishText,
      finishAt
    };
  }

  readFinishAt(durationCell, durationText) {
    const timer = durationCell?.querySelector('[data-endtime]');
    const dataEndTime = Number(timer?.getAttribute('data-endtime'));
    if (Number.isFinite(dataEndTime) && dataEndTime > 0) return dataEndTime * 1000;

    const countdownMs = parseCountdownMs(durationText);
    return countdownMs ? Date.now() + countdownMs : null;
  }
}

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function readTargetLevel(text) {
  const match = String(text || '').match(/Stufe\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function readBuildingName(text) {
  return String(text || '').replace(/Stufe\s+\d+/i, '').trim();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toTimestamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number < 10000000000 ? number * 1000 : number;
}