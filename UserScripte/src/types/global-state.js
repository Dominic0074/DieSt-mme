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
 * @property {RecruitState} recruit
 */

export {};
