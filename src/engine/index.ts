// Computation engine exports
export { getEffectiveSunlight, getSunlightMultiplier, isWareSunlightAffected } from './sunlight';
export {
  calculateWorkforceStats,
  getWorkforceMultiplier,
  getWorkforceUpkeep,
  HOUR_IN_SECONDS,
  type WorkforceStats,
} from './workforce';
export { computeStation } from './computeStation';
export { computeModuleIO, findRecipeForModule, getModuleType } from './computeModule';
export {
  computeNetwork,
  getStationComputed,
  getStationDeficits,
  hasStationDeficits,
  getStationDeficitCount,
  getModuleComputed,
  getConnectionComputed,
} from './computeNetwork';
