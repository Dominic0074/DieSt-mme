/**
 * @import { AppState } from '../types/global-state.js'
 */

/**
 * @returns {AppState}
 */
export function createDefaultState() {
  return {
    page: {
      name: 'Unbekannt',
      screen: '',
      mode: '',
      villageId: null
    },
    village: {
      lastReadAt: null,
      id: '',
      name: '',
      displayName: '',
      coord: '',
      resources: {
        wood: 0,
        stone: 0,
        iron: 0,
        storageMax: 0
      },
      resourceProduction: {
        wood: 0,
        stone: 0,
        iron: 0
      },
      population: {
        used: 0,
        max: 0,
        free: 0
      }
    },
    runtime: {
      botProtectionTriggered: false,
      raidRunning: false,
      botProtectionLastCheckAt: null
    },
    raid: {
      enabled: true,
      autoStart: false
    },
    scavenge: {
      lastReadAt: null,
      readyTimes: {},
      nextReadyAt: null,
      activeCount: 0,
      homeUnits: {},
      squads: {}
    },
    barracks: {
      lastReadAt: null,
      units: {}
    },
    stable: {
      lastReadAt: null,
      units: {}
    },
    mainBuilding: {
      lastReadAt: null,
      levels: {},
      queue: [],
      upgradeInfo: {}
    },
    buildPlan: {
      queue: []
    },
    training: {
      units: {}
    },
    recruit: {
      enabled: false
    }
  };
}