/**
 * @typedef {Object} PageState
 * @property {string} name
 * @property {string} screen
 * @property {string} mode
 * @property {string | null} villageId
 */

/**
 * @typedef {Object} RuntimeState
 * @property {boolean} botProtectionTriggered
 * @property {boolean} raidRunning
 * @property {number | null} botProtectionLastCheckAt
 */

/**
 * @typedef {Object} RaidState
 * @property {boolean} enabled
 * @property {boolean} autoStart
 */

/**
 * @typedef {Object} ScavengeSquadState
 * @property {string} id
 * @property {string} name
 * @property {number} returnAt
 * @property {Object<string, number>} units
 * @property {number} carryMax
 * @property {Object<string, number>} loot
 */

/**
 * @typedef {Object} ScavengeState
 * @property {number | null} lastReadAt
 * @property {Object<string, number>} readyTimes
 * @property {number | null} nextReadyAt
 * @property {number} activeCount
 * @property {Object<string, number>} homeUnits
 * @property {Object<string, ScavengeSquadState>} squads
 */

/**
 * @typedef {Object} BarracksUnitState
 * @property {number} inVillage
 * @property {number} total
 * @property {number} maxRecruitable
 * @property {{ wood: number, stone: number, iron: number, population: number }} costs
 * @property {string} buildTime
 */

/**
 * @typedef {Object} BarracksState
 * @property {number | null} lastReadAt
 * @property {Object<string, BarracksUnitState>} units
 */

/**
 * @typedef {Object} TrainingUnitConfig
 * @property {number} target
 * @property {number} batch
 */

/**
 * @typedef {Object} TrainingState
 * @property {Object<string, TrainingUnitConfig>} units
 */

/**
 * @typedef {Object} RecruitState
 * @property {boolean} enabled
 */

/**
 * Ein bewusst kleiner Startpunkt fuer spaeter verschachtelte globale Variablen.
 *
 * @typedef {Object} AppState
 * @property {PageState} page
 * @property {RuntimeState} runtime
 * @property {RaidState} raid
 * @property {ScavengeState} scavenge
 * @property {BarracksState} barracks
 * @property {TrainingState} training
 * @property {RecruitState} recruit
 */

export {};