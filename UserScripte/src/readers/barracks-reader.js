const BARRACKS_UNITS = ['spear', 'sword', 'axe', 'archer'];

export class BarracksReader {
  supports(page) {
    return page.screen === 'barracks';
  }

  read() {
    const units = {};

    BARRACKS_UNITS.forEach(unit => {
      const row = this.getUnitRow(unit);
      if (!row) return;

      units[unit] = this.readUnit(row, unit);
    });

    return {
      barracks: {
        lastReadAt: Date.now(),
        units
      }
    };
  }

  getUnitRow(unit) {
    const input = document.querySelector(`#train_form input[name="${unit}"], #train_form input[data-unit="${unit}"]`);
    if (input) return input.closest('tr');

    const unitLink = document.querySelector(`#train_form .unit_link[data-unit="${unit}"]`);
    return unitLink?.closest('tr') || null;
  }

  readUnit(row, unit) {
    const counts = this.readUnitCounts(row);

    return {
      inVillage: counts.inVillage,
      total: counts.total,
      maxRecruitable: this.readMaxRecruitable(row, unit),
      costs: this.readCosts(unit),
      buildTime: this.readText(`#${unit}_0_cost_time`)
    };
  }

  readUnitCounts(row) {
    const countCell = row.querySelector('td:nth-child(3)');
    const text = countCell?.textContent || '';
    const match = text.match(/([\d.]+)\s*\/\s*([\d.]+)/);

    if (!match) {
      const value = parseCompactNumber(text);
      return { inVillage: value, total: value };
    }

    return {
      inVillage: parseCompactNumber(match[1]),
      total: parseCompactNumber(match[2])
    };
  }

  readMaxRecruitable(row, unit) {
    const link = row.querySelector(`#${unit}_0_a`) || row.querySelector('a[href*="set_max"]');
    const match = (link?.textContent || '').match(/\((\d+)\)/);
    return match ? Number(match[1]) : 0;
  }

  readCosts(unit) {
    return {
      wood: parseCompactNumber(this.readText(`#${unit}_0_cost_wood`)),
      stone: parseCompactNumber(this.readText(`#${unit}_0_cost_stone`)),
      iron: parseCompactNumber(this.readText(`#${unit}_0_cost_iron`)),
      population: parseCompactNumber(this.readText(`#${unit}_0_cost_pop`))
    };
  }

  readText(selector) {
    return document.querySelector(selector)?.textContent?.trim() || '';
  }
}

function parseCompactNumber(value) {
  const normalized = String(value || '').replace(/\./g, '').replace(/[^\d-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}