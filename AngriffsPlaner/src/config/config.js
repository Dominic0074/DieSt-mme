export const CONFIG = Object.freeze({
  prepareSeconds: 60,
  maxLateMs: 1500,
  confirmTimeoutMs: 10000,
  watcherWindowName: 'ds-angriffs-planer-watch',
  storageKey: 'ds_angriffs_planer_state_v1',
  defaultUnitTemplate: Object.freeze({
    spear: 0,
    sword: 0,
    axe: 0,
    archer: 0,
    spy: 0,
    light: 0,
    marcher: 0,
    heavy: 0,
    ram: 0,
    catapult: 0,
    knight: 0,
    snob: 0,
    militia: 0
  })
});
