export class VillageReader {
  supports() {
    return true;
  }

  read() {
    const village = window.game_data?.village;
    if (!village) return null;

    const wood = toNumber(village.wood);
    const stone = toNumber(village.stone);
    const iron = toNumber(village.iron);
    const storageMax = toNumber(village.storage_max);
    const populationUsed = toNumber(village.pop);
    const populationMax = toNumber(village.pop_max);

    return {
      village: {
        lastReadAt: Date.now(),
        id: String(village.id || ''),
        name: village.name || '',
        displayName: village.display_name || '',
        coord: village.coord || buildCoord(village),
        resources: {
          wood,
          stone,
          iron,
          storageMax
        },
        resourceProduction: {
          wood: toProductionPerHour(village.wood_prod),
          stone: toProductionPerHour(village.stone_prod),
          iron: toProductionPerHour(village.iron_prod)
        },
        population: {
          used: populationUsed,
          max: populationMax,
          free: Math.max(0, populationMax - populationUsed)
        }
      }
    };
  }
}

function buildCoord(village) {
  const x = village?.x;
  const y = village?.y;
  return x !== undefined && y !== undefined ? `${x}|${y}` : '';
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toProductionPerHour(value) {
  return Math.round(toNumber(value) * 3600);
}
