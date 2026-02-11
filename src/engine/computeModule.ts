/**
 * Module I/O computation.
 *
 * Calculates per-module inputs and outputs from recipes,
 * applying sunlight and workforce multipliers.
 *
 * All outputs are normalized to per-hour (3600 seconds) rates.
 */

import type {
  PlanModule,
  ResourceAmount,
  GameData,
  ProductionModule,
  Recipe,
  ModuleComputed,
} from '@/types';
import { getSunlightMultiplier } from './sunlight';
import { getWorkforceMultiplier, HOUR_IN_SECONDS } from './workforce';

/**
 * Find the recipe for a production module.
 * Tries different method patterns to find a matching recipe.
 */
export function findRecipeForModule(
  module: ProductionModule,
  recipes: Record<string, Recipe>
): Recipe | null {
  const wareId = module.producedWareId;

  // Try to infer method from module ID
  let inferredMethod = 'default';
  if (module.id.includes('_imp_')) {
    inferredMethod = 'imperial';
  } else if (module.id.includes('_sith_')) {
    inferredMethod = 'sith';
  } else if (module.id.includes('_ter_')) {
    inferredMethod = 'terran';
  }

  // Try inferred method first
  const inferredKey = `${wareId}_${inferredMethod}`;
  if (recipes[inferredKey]) {
    return recipes[inferredKey];
  }

  // Fall back to default method
  const defaultKey = `${wareId}_default`;
  if (recipes[defaultKey]) {
    return recipes[defaultKey];
  }

  // Try to find any recipe for this ware
  for (const recipe of Object.values(recipes)) {
    if (recipe.wareId === wareId) {
      return recipe;
    }
  }

  return null;
}

/**
 * Get the type of a module by its blueprint ID.
 */
export function getModuleType(
  blueprintId: string,
  gameData: GameData
): 'production' | 'habitat' | 'storage' | null {
  if (gameData.modules.production[blueprintId]) return 'production';
  if (gameData.modules.habitat[blueprintId]) return 'habitat';
  if (gameData.modules.storage[blueprintId]) return 'storage';
  return null;
}

/**
 * Compute a single module's I/O.
 * Returns gross inputs and outputs (before any connections).
 */
export function computeModuleIO(
  planModule: PlanModule,
  gameData: GameData,
  effectiveSunlight: number,
  workerRatio: number
): ModuleComputed {
  const moduleType = getModuleType(planModule.blueprintId, gameData);

  const grossInputs: ResourceAmount[] = [];
  const grossOutputs: ResourceAmount[] = [];

  if (moduleType === 'production') {
    const prodModule = gameData.modules.production[planModule.blueprintId];
    if (prodModule) {
      const recipe = findRecipeForModule(prodModule, gameData.recipes);
      if (recipe) {
        // Calculate output multiplier
        const sunlightMult = getSunlightMultiplier(
          prodModule.producedWareId,
          effectiveSunlight
        );
        const workforceMult = getWorkforceMultiplier(
          recipe.workforceBonus,
          workerRatio
        );
        const outputMultiplier = sunlightMult * workforceMult;

        // Convert recipe cycle to hourly rate
        const cyclesPerHour = HOUR_IN_SECONDS / recipe.time;

        // Calculate output per hour
        const outputPerHour =
          recipe.amount * planModule.count * outputMultiplier * cyclesPerHour;
        grossOutputs.push({
          wareId: prodModule.producedWareId,
          amount: outputPerHour,
        });

        // Calculate inputs per hour
        for (const input of recipe.inputs) {
          const inputPerHour =
            input.amount * planModule.count * outputMultiplier * cyclesPerHour;
          grossInputs.push({
            wareId: input.ware,
            amount: inputPerHour,
          });
        }
      }
    }
  }

  // For now, net = gross (will be adjusted by connections in computeStation)
  return {
    moduleId: planModule.id,
    blueprintId: planModule.blueprintId,
    grossInputs,
    grossOutputs,
    netInputs: [...grossInputs],
    netOutputs: [...grossOutputs],
  };
}
