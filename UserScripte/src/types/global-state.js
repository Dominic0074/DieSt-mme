/**
 * @typedef {Object} PageState
 * @property {string} name
 * @property {string} screen
 * @property {string} mode
 * @property {string | null} villageId
 */

/**
 * @typedef {Object} VillageResourcesState
 * @property {number} wood
 * @property {number} stone
 * @property {number} iron
 * @property {number} storageMax
 */

/**
 * @typedef {Object} VillageProductionState
 * @property {number} wood
 * @property {number} stone
 * @property {number} iron
 */

/**
 * @typedef {Object} VillagePopulationState
 * @property {number} used
 * @property {number} max
 * @property {number} free
 */

/**
 * @typedef {Object} VillageState
 * @property {number | null} lastReadAt
 * @property {string} id
 * @property {string} name
 * @property {string} displayName
 * @property {string} coord
 * @property {VillageResourcesState} resources
 * @property {VillageProductionState} resourceProduction
 * @property {VillagePopulationState} population
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
 * @typedef {Object} ResourceCostState
 * @property {number} wood
 * @property {number} stone
 * @property {number} iron
 * @property {number} population
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
 * @typedef {Object} TrainingBuildingUnitState
 * @property {number} inVillage
 * @property {number} total
 * @property {number} maxRecruitable
 * @property {ResourceCostState} costs
 * @property {string} buildTime
 */

/**
 * @typedef {Object} BarracksState
 * @property {number | null} lastReadAt
 * @property {Object<string, TrainingBuildingUnitState>} units
 */

/**
 * @typedef {Object} StableState
 * @property {number | null} lastReadAt
 * @property {Object<string, TrainingBuildingUnitState>} units
 */

/**
 * @typedef {Object} BuildQueueEntryState
 * @property {number} index
 * @property {string} building
 * @property {string} name
 * @property {number | null} targetLevel
 * @property {string} durationText
 * @property {string} finishText
 * @property {number | null} finishAt
 */

/**
 * @typedef {Object} BuildingUpgradeInfoState
 * @property {string} name
 * @property {number} level
 * @property {number} nextLevel
 * @property {number} maxLevel
 * @property {boolean} canBuild
 * @property {string | null} error
 * @property {number | null} forecastAt
 * @property {ResourceCostState} costs
 * @property {ResourceCostState} factors
 * @property {number} buildTimeSeconds
 */

/**
 * @typedef {Object} MainBuildingState
 * @property {number | null} lastReadAt
 * @property {Object<string, number>} levels
 * @property {BuildQueueEntryState[]} queue
 * @property {Object<string, BuildingUpgradeInfoState>} upgradeInfo
 */

/**
 * @typedef {Object} BuildPlanEntryState
 * @property {string} id
 * @property {string} building
 * @property {string} name
 * @property {number} targetLevel
 * @property {ResourceCostState | null} costs
 * @property {boolean} costsEstimated
 * @property {number} createdAt
 */

/**
 * @typedef {Object} BuildPlanState
 * @property {BuildPlanEntryState[]} queue
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
 * @property {VillageState} village
 * @property {RuntimeState} runtime
 * @property {RaidState} raid
 * @property {ScavengeState} scavenge
 * @property {BarracksState} barracks
 * @property {StableState} stable
 * @property {MainBuildingState} mainBuilding
 * @property {BuildPlanState} buildPlan
 * @property {TrainingState} training
 * @property {RecruitState} recruit
 */

export {};