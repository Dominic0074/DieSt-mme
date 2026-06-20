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
      queue: []
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