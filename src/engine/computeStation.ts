/**
 * Station I/O computation.
 *
 * Calculates per-station inputs and outputs from modules,
 * applying sunlight and workforce multipliers.
 * Uses module connections to determine what flows internally
 * vs what needs to be imported/exported at station level.
 *
 * All outputs are normalized to per-hour (3600 seconds) rates.
 */

import type {
  PlanStation,
  PlanSector,
  StationComputed,
  ResourceAmount,
  GameData,
  ModuleComputed,
  ConnectionComputed,
} from '@/types';
import { STATION_INPUT_ID, STATION_OUTPUT_ID } from '@/types/plan';
import { getEffectiveSunlight } from './sunlight';
import {
  calculateWorkforceStats,
  getWorkforceUpkeepForCapacity,
} from './workforce';
import { computeModuleIO, getModuleType } from './computeModule';

/**
 * Aggregate resource amounts by wareId, combining amounts for same wares.
 */
function aggregateResources(resources: ResourceAmount[]): ResourceAmount[] {
  const map = new Map<string, number>();

  for (const res of resources) {
    const current = map.get(res.wareId) || 0;
    map.set(res.wareId, current + res.amount);
  }

  return Array.from(map.entries())
    .map(([wareId, amount]) => ({ wareId, amount }))
    .filter((r) => r.amount > 0.01) // Filter out tiny amounts
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Compute station I/O from its modules and module connections.
 * All outputs are normalized to per-hour rates.
 */
export function computeStation(
  station: PlanStation,
  sectors: PlanSector[],
  gameData: GameData
): StationComputed {
  const effectiveSunlight = getEffectiveSunlight(station, sectors);
  const fillHabitats = station.fillHabitats ?? false;
  const moduleConnections = station.moduleConnections ?? [];

  // Collect workforce requirements and capacities
  let totalWorkforceRequired = 0;
  let totalWorkforceCapacity = 0;

  // First pass: collect workforce totals
  for (const planModule of station.modules) {
    const moduleType = getModuleType(planModule.blueprintId, gameData);

    if (moduleType === 'production') {
      const prodModule = gameData.modules.production[planModule.blueprintId];
      if (prodModule) {
        totalWorkforceRequired += prodModule.workforceMax * planModule.count;
      }
    } else if (moduleType === 'habitat') {
      const habModule = gameData.modules.habitat[planModule.blueprintId];
      if (habModule) {
        totalWorkforceCapacity += habModule.workforceCapacity * planModule.count;
      }
    }
  }

  // Calculate workforce stats
  const workforceStats = calculateWorkforceStats(
    totalWorkforceRequired,
    totalWorkforceCapacity,
    fillHabitats
  );

  // Compute each module's I/O
  const moduleComputeds: ModuleComputed[] = station.modules.map((planModule) =>
    computeModuleIO(
      planModule,
      gameData,
      effectiveSunlight,
      workforceStats.workerRatio
    )
  );

  // Create a map for quick lookup
  const moduleMap = new Map<string, ModuleComputed>();
  for (const mc of moduleComputeds) {
    moduleMap.set(mc.moduleId, mc);
  }

  // Add food/medical inputs to habitat modules based on their share of workforce capacity
  for (const planModule of station.modules) {
    const moduleType = getModuleType(planModule.blueprintId, gameData);
    if (moduleType === 'habitat') {
      const habModule = gameData.modules.habitat[planModule.blueprintId];
      const mc = moduleMap.get(planModule.id);
      if (habModule && mc) {
        const moduleCapacity = habModule.workforceCapacity * planModule.count;
        const upkeep = getWorkforceUpkeepForCapacity(workforceStats, moduleCapacity);
        mc.grossInputs.push(...upkeep);
        mc.netInputs = [...mc.grossInputs];
      }
    }
  }

  // Track what each module receives via internal connections
  // Map<moduleId, Map<wareId, amount>>
  const moduleSupplied = new Map<string, Map<string, number>>();
  for (const mc of moduleComputeds) {
    moduleSupplied.set(mc.moduleId, new Map());
  }

  // Track what each module exports via internal connections
  const moduleExported = new Map<string, Map<string, number>>();
  for (const mc of moduleComputeds) {
    moduleExported.set(mc.moduleId, new Map());
  }

  // Track remaining available output for each module/ware (for computing effective amounts)
  const moduleRemainingOutput = new Map<string, Map<string, number>>();
  for (const mc of moduleComputeds) {
    const remaining = new Map<string, number>();
    for (const output of mc.grossOutputs) {
      remaining.set(output.wareId, output.amount);
    }
    moduleRemainingOutput.set(mc.moduleId, remaining);
  }

  // Track remaining needed input for each module/ware
  const moduleRemainingInput = new Map<string, Map<string, number>>();
  for (const mc of moduleComputeds) {
    const remaining = new Map<string, number>();
    for (const input of mc.grossInputs) {
      remaining.set(input.wareId, input.amount);
    }
    moduleRemainingInput.set(mc.moduleId, remaining);
  }

  // Separate module-to-module connections from station I/O connections
  const moduleToModuleConnections = moduleConnections.filter(
    (c) =>
      c.sourceModuleId !== STATION_INPUT_ID &&
      c.targetModuleId !== STATION_OUTPUT_ID
  );
  const stationInputConnections = moduleConnections.filter(
    (c) => c.sourceModuleId === STATION_INPUT_ID
  );
  const stationOutputConnections = moduleConnections.filter(
    (c) => c.targetModuleId === STATION_OUTPUT_ID
  );

  // Compute effective amounts for all module connections
  const moduleConnectionComputeds: ConnectionComputed[] = [];

  // Process module-to-module connections with mode-aware effective amounts
  for (const conn of moduleToModuleConnections) {
    const mode = conn.mode ?? 'auto'; // Default to 'auto' for backwards compatibility

    // Get source's remaining available output
    const sourceRemaining = moduleRemainingOutput.get(conn.sourceModuleId);
    const sourceAvailable = sourceRemaining?.get(conn.wareId) ?? 0;

    // Get target's remaining needed input
    const targetRemaining = moduleRemainingInput.get(conn.targetModuleId);
    const targetNeed = targetRemaining?.get(conn.wareId) ?? 0;

    // Calculate effective amount based on mode
    let effectiveAmount: number;
    let sourceConstrained = false;
    let targetConstrained = false;

    switch (mode) {
      case 'custom':
        // Use the stored amount, but cap by what's available and needed
        effectiveAmount = Math.min(conn.amount, sourceAvailable, targetNeed);
        sourceConstrained = conn.amount > sourceAvailable;
        targetConstrained = conn.amount > targetNeed;
        break;
      case 'max':
        // Take as much as possible from source (up to target need)
        effectiveAmount = Math.min(sourceAvailable, targetNeed);
        sourceConstrained = sourceAvailable < targetNeed;
        targetConstrained = targetNeed < sourceAvailable;
        break;
      case 'auto':
      default:
        // Same as 'max' - take min of available and needed
        effectiveAmount = Math.min(sourceAvailable, targetNeed);
        sourceConstrained = sourceAvailable < targetNeed;
        targetConstrained = targetNeed < sourceAvailable;
        break;
    }

    moduleConnectionComputeds.push({
      connectionId: conn.id,
      effectiveAmount,
      sourceConstrained,
      targetConstrained,
    });

    // Update remaining amounts
    if (sourceRemaining) {
      sourceRemaining.set(conn.wareId, sourceAvailable - effectiveAmount);
    }
    if (targetRemaining) {
      targetRemaining.set(conn.wareId, targetNeed - effectiveAmount);
    }

    // Add to target module's supplied amounts (actually satisfied internally)
    const targetSupplied = moduleSupplied.get(conn.targetModuleId);
    if (targetSupplied) {
      const current = targetSupplied.get(conn.wareId) || 0;
      targetSupplied.set(conn.wareId, current + effectiveAmount);
    }

    // Add to source module's exported amounts (actually consumed internally)
    const sourceExported = moduleExported.get(conn.sourceModuleId);
    if (sourceExported) {
      const current = sourceExported.get(conn.wareId) || 0;
      sourceExported.set(conn.wareId, current + effectiveAmount);
    }
  }

  // Process Station Input connections (with mode support)
  for (const conn of stationInputConnections) {
    const mode = conn.mode ?? 'auto';

    // For Station Input, source is external (no limit from source module)
    // Target is a module's input
    const targetRemaining = moduleRemainingInput.get(conn.targetModuleId);
    const targetNeed = targetRemaining?.get(conn.wareId) ?? 0;

    // Effective amount depends on mode
    let effectiveAmount: number;
    let sourceConstrained = false;
    let targetConstrained = false;

    switch (mode) {
      case 'custom':
        // Use stored amount, cap by target need
        effectiveAmount = Math.min(conn.amount, targetNeed);
        targetConstrained = conn.amount > targetNeed;
        break;
      case 'max':
      case 'auto':
      default:
        // Take what target needs (external supply is unlimited at this stage)
        effectiveAmount = targetNeed;
        break;
    }

    moduleConnectionComputeds.push({
      connectionId: conn.id,
      effectiveAmount,
      sourceConstrained,
      targetConstrained,
    });

    // Update remaining input for target
    if (targetRemaining) {
      targetRemaining.set(conn.wareId, targetNeed - effectiveAmount);
    }

    // NOTE: Station Input connections do NOT satisfy modules directly
    // The actual satisfaction comes from inter-station connections (computed in computeNetwork)
  }

  // Process Station Output connections (with mode support)
  for (const conn of stationOutputConnections) {
    const mode = conn.mode ?? 'auto';

    // Source is a module's output, target is external (no limit)
    const sourceRemaining = moduleRemainingOutput.get(conn.sourceModuleId);
    const sourceAvailable = sourceRemaining?.get(conn.wareId) ?? 0;

    let effectiveAmount: number;
    let sourceConstrained = false;
    let targetConstrained = false;

    switch (mode) {
      case 'custom':
        // Use stored amount, cap by source available
        effectiveAmount = Math.min(conn.amount, sourceAvailable);
        sourceConstrained = conn.amount > sourceAvailable;
        break;
      case 'max':
      case 'auto':
      default:
        // Export all available
        effectiveAmount = sourceAvailable;
        break;
    }

    moduleConnectionComputeds.push({
      connectionId: conn.id,
      effectiveAmount,
      sourceConstrained,
      targetConstrained,
    });

    // Update remaining output for source
    if (sourceRemaining) {
      sourceRemaining.set(conn.wareId, sourceAvailable - effectiveAmount);
    }

    // NOTE: Station Output connections do NOT consume module outputs directly
    // The actual consumption comes from inter-station connections (computed in computeNetwork)
  }

  // Calculate net I/O for each module (after connections)
  for (const mc of moduleComputeds) {
    const supplied = moduleSupplied.get(mc.moduleId) || new Map();
    const exported = moduleExported.get(mc.moduleId) || new Map();

    // Net inputs = gross inputs - what's supplied by connections
    mc.netInputs = [];
    for (const input of mc.grossInputs) {
      const suppliedAmount = supplied.get(input.wareId) || 0;
      const remaining = input.amount - suppliedAmount;
      if (remaining > 0.01) {
        mc.netInputs.push({ wareId: input.wareId, amount: remaining });
      }
    }

    // Net outputs = gross outputs - what's exported to other modules
    mc.netOutputs = [];
    for (const output of mc.grossOutputs) {
      const exportedAmount = exported.get(output.wareId) || 0;
      const remaining = output.amount - exportedAmount;
      if (remaining > 0.01) {
        mc.netOutputs.push({ wareId: output.wareId, amount: remaining });
      }
    }
  }

  // Aggregate station-level I/O from module net I/O
  const allGrossInputs: ResourceAmount[] = [];
  const allGrossOutputs: ResourceAmount[] = [];
  const allNetInputs: ResourceAmount[] = [];
  const allNetOutputs: ResourceAmount[] = [];

  for (const mc of moduleComputeds) {
    allGrossInputs.push(...mc.grossInputs);
    allGrossOutputs.push(...mc.grossOutputs);
    allNetInputs.push(...mc.netInputs);
    allNetOutputs.push(...mc.netOutputs);
  }

  // Workforce upkeep (food/medical) is included via habitat module inputs above

  // Aggregate resources
  const grossInputs = aggregateResources(allGrossInputs);
  const grossOutputs = aggregateResources(allGrossOutputs);
  const netInputs = aggregateResources(allNetInputs);
  const netOutputs = aggregateResources(allNetOutputs);

  // Calculate explicit Station I/O from connections to/from station nodes
  // Use EFFECTIVE amounts (computed based on mode), not stored amounts
  const stationInputAmounts: ResourceAmount[] = stationInputConnections.map((c) => {
    const computed = moduleConnectionComputeds.find((cc) => cc.connectionId === c.id);
    return { wareId: c.wareId, amount: computed?.effectiveAmount ?? c.amount };
  });
  const stationOutputAmounts: ResourceAmount[] = stationOutputConnections.map((c) => {
    const computed = moduleConnectionComputeds.find((cc) => cc.connectionId === c.id);
    return { wareId: c.wareId, amount: computed?.effectiveAmount ?? c.amount };
  });
  const stationInputs = aggregateResources(stationInputAmounts);
  const stationOutputs = aggregateResources(stationOutputAmounts);

  // Calculate available for import/export (net I/O minus station connections)
  // Create maps for quick lookup of what's already connected
  const connectedImportMap = new Map<string, number>();
  for (const si of stationInputs) {
    connectedImportMap.set(si.wareId, si.amount);
  }
  const connectedExportMap = new Map<string, number>();
  for (const so of stationOutputs) {
    connectedExportMap.set(so.wareId, so.amount);
  }

  // Available for import = net inputs that aren't yet connected to Station Input
  const availableForImport: ResourceAmount[] = [];
  for (const ni of netInputs) {
    const connected = connectedImportMap.get(ni.wareId) || 0;
    const remaining = ni.amount - connected;
    if (remaining > 0.01) {
      availableForImport.push({ wareId: ni.wareId, amount: remaining });
    }
  }

  // Available for export = net outputs that aren't yet connected to Station Output
  const availableForExport: ResourceAmount[] = [];
  for (const no of netOutputs) {
    const connected = connectedExportMap.get(no.wareId) || 0;
    const remaining = no.amount - connected;
    if (remaining > 0.01) {
      availableForExport.push({ wareId: no.wareId, amount: remaining });
    }
  }

  return {
    stationId: station.id,
    effectiveSunlight,
    totalWorkforceRequired,
    totalWorkforceCapacity,
    actualPopulation: workforceStats.actualPopulation,
    workforceFoodDemand: workforceStats.foodDemand,
    workforceMedicalDemand: workforceStats.medicalDemand,
    modules: moduleComputeds,
    grossInputs,
    grossOutputs,
    netInputs,
    netOutputs,
    availableForImport,
    availableForExport,
    stationInputs,
    stationOutputs,
    // These will be populated by computeNetwork after processing inter-station connections
    externallySupplied: [],
    externallyConsumed: [],
    remainingInputs: [...stationInputs],
    remainingOutputs: [...stationOutputs],
    // Computed effective amounts for all module connections
    moduleConnections: moduleConnectionComputeds,
  };
}
