/**
 * Workforce calculation for production bonuses and upkeep.
 *
 * Workers consume food rations and medical supplies at different rates
 * depending on whether they are busy (filling production slots) or idle.
 *
 * All outputs are normalized to per-hour (3600 seconds) rates.
 */

import type { ResourceAmount } from '@/types';

// Standard time unit for all calculations (1 hour)
export const HOUR_IN_SECONDS = 3600;

// Workforce consumption per 600s cycle per 200 work units (from mod data)
const WORKFORCE_BUSY = { food: 75, medical: 45, per: 200, cycle: 600 };
const WORKFORCE_IDLE = { food: 50, medical: 30, per: 200, cycle: 600 };

// Ware IDs for workforce upkeep
const FOOD_WARE_ID = 'foodrations';
const MEDICAL_WARE_ID = 'medicalsupplies';

export interface WorkforceStats {
  totalRequired: number;      // Sum of all production module workforce requirements
  totalCapacity: number;      // Sum of all habitat module workforce capacities
  actualPopulation: number;   // Actual population (based on fillHabitats setting)
  busyWorkers: number;        // Workers actively working
  idleWorkers: number;        // Workers not working (excess population)
  workerRatio: number;        // Ratio of population to requirement (0-1, capped at 1)
  foodDemand: number;         // Food rations per hour
  medicalDemand: number;      // Medical supplies per hour
}

/**
 * Calculate workforce statistics for a station.
 *
 * @param totalWorkforceRequired - Sum of all production module workforce needs
 * @param totalWorkforceCapacity - Sum of all habitat module capacities
 * @param fillHabitats - If true, populate all habitat capacity. If false, cap to production needs.
 */
export function calculateWorkforceStats(
  totalWorkforceRequired: number,
  totalWorkforceCapacity: number,
  fillHabitats: boolean = false
): WorkforceStats {
  // Calculate actual population based on fillHabitats setting
  let actualPopulation: number;
  if (fillHabitats) {
    // Fill all habitat capacity
    actualPopulation = totalWorkforceCapacity;
  } else {
    // Cap to production needs (no idle workers)
    actualPopulation = Math.min(totalWorkforceRequired, totalWorkforceCapacity);
  }

  // Busy workers = min(population, required)
  const busyWorkers = Math.min(actualPopulation, totalWorkforceRequired);
  // Idle workers = population beyond what's needed
  const idleWorkers = Math.max(actualPopulation - totalWorkforceRequired, 0);

  // Worker ratio is how much of the required workforce we have
  // Capped at 1.0 (having more workers than needed doesn't increase bonus)
  const workerRatio = totalWorkforceRequired > 0
    ? Math.min(actualPopulation / totalWorkforceRequired, 1.0)
    : 0;

  // Calculate consumption per 600s cycle
  const busyFoodPerCycle = busyWorkers * (WORKFORCE_BUSY.food / WORKFORCE_BUSY.per);
  const idleFoodPerCycle = idleWorkers * (WORKFORCE_IDLE.food / WORKFORCE_IDLE.per);
  const busyMedicalPerCycle = busyWorkers * (WORKFORCE_BUSY.medical / WORKFORCE_BUSY.per);
  const idleMedicalPerCycle = idleWorkers * (WORKFORCE_IDLE.medical / WORKFORCE_IDLE.per);

  // Convert to per-hour rates (3600s / 600s = 6x)
  const hourlyMultiplier = HOUR_IN_SECONDS / WORKFORCE_BUSY.cycle;
  const foodDemand = (busyFoodPerCycle + idleFoodPerCycle) * hourlyMultiplier;
  const medicalDemand = (busyMedicalPerCycle + idleMedicalPerCycle) * hourlyMultiplier;

  return {
    totalRequired: totalWorkforceRequired,
    totalCapacity: totalWorkforceCapacity,
    actualPopulation,
    busyWorkers,
    idleWorkers,
    workerRatio,
    foodDemand,
    medicalDemand,
  };
}

/**
 * Calculate the workforce production multiplier for a module.
 *
 * @param workforceBonus - The recipe's workforce bonus (e.g., 0.43 = +43%)
 * @param workerRatio - The station's worker ratio (0-1)
 * @returns The production multiplier (1.0 = no bonus, 1.43 = +43% bonus)
 */
export function getWorkforceMultiplier(
  workforceBonus: number,
  workerRatio: number
): number {
  return 1.0 + (workforceBonus * workerRatio);
}

/**
 * Get workforce upkeep for a single habitat module based on its share of total capacity.
 *
 * @param stats - Station-wide workforce statistics
 * @param moduleCapacity - This habitat module's total workforce capacity (capacity * count)
 */
export function getWorkforceUpkeepForCapacity(
  stats: WorkforceStats,
  moduleCapacity: number
): ResourceAmount[] {
  if (stats.totalCapacity <= 0 || moduleCapacity <= 0) return [];

  const share = moduleCapacity / stats.totalCapacity;
  const upkeep: ResourceAmount[] = [];

  if (stats.foodDemand > 0) {
    upkeep.push({ wareId: FOOD_WARE_ID, amount: stats.foodDemand * share });
  }
  if (stats.medicalDemand > 0) {
    upkeep.push({ wareId: MEDICAL_WARE_ID, amount: stats.medicalDemand * share });
  }

  return upkeep;
}

/**
 * Get workforce upkeep as resource amounts (per hour).
 */
export function getWorkforceUpkeep(stats: WorkforceStats): ResourceAmount[] {
  const upkeep: ResourceAmount[] = [];

  if (stats.foodDemand > 0) {
    upkeep.push({
      wareId: FOOD_WARE_ID,
      amount: stats.foodDemand,
    });
  }

  if (stats.medicalDemand > 0) {
    upkeep.push({
      wareId: MEDICAL_WARE_ID,
      amount: stats.medicalDemand,
    });
  }

  return upkeep;
}
