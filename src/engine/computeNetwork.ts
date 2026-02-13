/**
 * Network-level I/O computation.
 *
 * Aggregates all station I/O and calculates deficits based on connections.
 */

import type {
  Plan,
  StationComputed,
  NetworkComputed,
  ResourceAmount,
  ResourceDeficit,
  ConnectionComputed,
  GameData,
} from '@/types';
import { STATION_INPUT_ID, STATION_OUTPUT_ID } from '@/types/plan';
import { computeStation } from './computeStation';

/**
 * Aggregate resource amounts by wareId.
 */
function aggregateResources(resources: ResourceAmount[]): ResourceAmount[] {
  const map = new Map<string, number>();

  for (const res of resources) {
    const current = map.get(res.wareId) || 0;
    map.set(res.wareId, current + res.amount);
  }

  return Array.from(map.entries())
    .map(([wareId, amount]) => ({ wareId, amount }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Compute the entire network's I/O summary.
 */
export function computeNetwork(plan: Plan, gameData: GameData): NetworkComputed {
  // Compute each station
  const stationComputeds: StationComputed[] = plan.stations.map((station) =>
    computeStation(station, plan.sectors, gameData)
  );

  // Create a map for quick lookup
  const stationMap = new Map<string, StationComputed>();
  for (const sc of stationComputeds) {
    stationMap.set(sc.stationId, sc);
  }

  // Track what each station receives via connections (external supply)
  const stationSupplied = new Map<string, Map<string, number>>();
  // Track what each station exports via connections (external consumption)
  const stationConsumed = new Map<string, Map<string, number>>();
  // Track remaining available output for each station/ware (for computing effective amounts)
  const stationRemainingOutput = new Map<string, Map<string, number>>();
  // Track remaining needed input for each station/ware
  const stationRemainingInput = new Map<string, Map<string, number>>();

  for (const station of plan.stations) {
    stationSupplied.set(station.id, new Map());
    stationConsumed.set(station.id, new Map());
    stationRemainingOutput.set(station.id, new Map());
    stationRemainingInput.set(station.id, new Map());
  }

  // Initialize remaining output/input from station computed data
  for (const sc of stationComputeds) {
    const remainingOutput = stationRemainingOutput.get(sc.stationId)!;
    const remainingInput = stationRemainingInput.get(sc.stationId)!;

    for (const output of sc.stationOutputs) {
      // Cap by net output (what's actually produced)
      const netOutput = sc.netOutputs.find(o => o.wareId === output.wareId);
      const available = Math.min(output.amount, netOutput?.amount ?? output.amount);
      remainingOutput.set(output.wareId, available);
    }

    for (const input of sc.stationInputs) {
      remainingInput.set(input.wareId, input.amount);
    }
  }

  // Compute effective amounts for each connection
  const connectionComputeds: ConnectionComputed[] = [];

  for (const conn of plan.connections) {
    const mode = conn.mode ?? 'auto'; // Default to 'auto' for backwards compatibility

    // Get source's remaining available output
    const sourceRemaining = stationRemainingOutput.get(conn.sourceStationId);
    const sourceAvailable = sourceRemaining?.get(conn.wareId) ?? 0;

    // Get target's remaining needed input
    const targetRemaining = stationRemainingInput.get(conn.targetStationId);
    const targetNeed = targetRemaining?.get(conn.wareId) ?? 0;

    // Calculate effective amount based on mode
    let effectiveAmount: number;
    let sourceConstrained = false;
    let targetConstrained = false;

    switch (mode) {
      case 'custom':
        // Use the stored amount, but cap by what's available
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
        // Same as 'max' for now - take min of available and needed
        effectiveAmount = Math.min(sourceAvailable, targetNeed);
        sourceConstrained = sourceAvailable < targetNeed;
        targetConstrained = targetNeed < sourceAvailable;
        break;
    }

    connectionComputeds.push({
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

    // Add to target station's supplied amounts
    const targetSupplied = stationSupplied.get(conn.targetStationId);
    if (targetSupplied) {
      const current = targetSupplied.get(conn.wareId) || 0;
      targetSupplied.set(conn.wareId, current + effectiveAmount);
    }

    // Add to source station's consumed amounts
    const sourceConsumed = stationConsumed.get(conn.sourceStationId);
    if (sourceConsumed) {
      const current = sourceConsumed.get(conn.wareId) || 0;
      sourceConsumed.set(conn.wareId, current + effectiveAmount);
    }
  }

  // Update each station's computed data with external supply/consumption
  for (const sc of stationComputeds) {
    const supplied = stationSupplied.get(sc.stationId) || new Map();
    const consumed = stationConsumed.get(sc.stationId) || new Map();

    // Convert maps to ResourceAmount arrays
    sc.externallySupplied = Array.from(supplied.entries())
      .map(([wareId, amount]) => ({ wareId, amount }))
      .filter((r) => r.amount > 0.01);

    sc.externallyConsumed = Array.from(consumed.entries())
      .map(([wareId, amount]) => ({ wareId, amount }))
      .filter((r) => r.amount > 0.01);

    // Calculate remaining inputs (stationInputs - externallySupplied)
    sc.remainingInputs = [];
    for (const input of sc.stationInputs) {
      const suppliedAmount = supplied.get(input.wareId) || 0;
      const remaining = input.amount - suppliedAmount;
      if (remaining > 0.01) {
        sc.remainingInputs.push({ wareId: input.wareId, amount: remaining });
      }
    }

    // Calculate remaining outputs (stationOutputs - externallyConsumed)
    sc.remainingOutputs = [];
    for (const output of sc.stationOutputs) {
      const consumedAmount = consumed.get(output.wareId) || 0;
      const remaining = output.amount - consumedAmount;
      if (remaining > 0.01) {
        sc.remainingOutputs.push({ wareId: output.wareId, amount: remaining });
      }
    }

    // CASCADE: Apply external supply to module netInputs
    // Find the original station to get moduleConnections
    const station = plan.stations.find((s) => s.id === sc.stationId);
    if (station) {
      const moduleConnections = station.moduleConnections ?? [];

      // For each externally supplied ware
      for (const [wareId, totalSupplied] of supplied.entries()) {
        if (totalSupplied < 0.01) continue;

        // Find all connections from Station Input to modules for this ware
        const inputConnections = moduleConnections.filter(
          (c) => c.sourceModuleId === STATION_INPUT_ID && c.wareId === wareId
        );

        if (inputConnections.length === 0) continue;

        // Calculate total amount requested via Station Input for this ware
        const totalRequested = inputConnections.reduce((sum, c) => sum + c.amount, 0);
        if (totalRequested < 0.01) continue;

        // Calculate supply ratio (how much of the request is being fulfilled)
        const supplyRatio = Math.min(totalSupplied / totalRequested, 1.0);

        // Apply supply to each module's netInputs proportionally
        for (const conn of inputConnections) {
          const moduleComputed = sc.modules.find((m) => m.moduleId === conn.targetModuleId);
          if (!moduleComputed) continue;

          // Calculate how much this module receives
          const moduleSupplied = conn.amount * supplyRatio;

          // Find and reduce this ware in the module's netInputs
          const netInputIndex = moduleComputed.netInputs.findIndex((i) => i.wareId === wareId);
          if (netInputIndex !== -1) {
            const currentNet = moduleComputed.netInputs[netInputIndex].amount;
            const newNet = currentNet - moduleSupplied;
            if (newNet > 0.01) {
              moduleComputed.netInputs[netInputIndex].amount = newNet;
            } else {
              // Remove if fully satisfied
              moduleComputed.netInputs.splice(netInputIndex, 1);
            }
          }
        }
      }

      // CASCADE: Apply external consumption to module netOutputs
      for (const [wareId, totalConsumed] of consumed.entries()) {
        if (totalConsumed < 0.01) continue;

        // Find all connections from modules to Station Output for this ware
        const outputConnections = moduleConnections.filter(
          (c) => c.targetModuleId === STATION_OUTPUT_ID && c.wareId === wareId
        );

        if (outputConnections.length === 0) continue;

        // Calculate total amount exported via Station Output for this ware
        const totalExported = outputConnections.reduce((sum, c) => sum + c.amount, 0);
        if (totalExported < 0.01) continue;

        // Calculate consumption ratio
        const consumeRatio = Math.min(totalConsumed / totalExported, 1.0);

        // Apply consumption to each module's netOutputs proportionally
        for (const conn of outputConnections) {
          const moduleComputed = sc.modules.find((m) => m.moduleId === conn.sourceModuleId);
          if (!moduleComputed) continue;

          // Calculate how much this module's output is consumed
          const moduleConsumed = conn.amount * consumeRatio;

          // Find and reduce this ware in the module's netOutputs
          const netOutputIndex = moduleComputed.netOutputs.findIndex((o) => o.wareId === wareId);
          if (netOutputIndex !== -1) {
            const currentNet = moduleComputed.netOutputs[netOutputIndex].amount;
            const newNet = currentNet - moduleConsumed;
            if (newNet > 0.01) {
              moduleComputed.netOutputs[netOutputIndex].amount = newNet;
            } else {
              // Remove if fully consumed
              moduleComputed.netOutputs.splice(netOutputIndex, 1);
            }
          }
        }
      }
    }
  }

  // Calculate deficits for each station (based on what's wired for import, not total demand)
  const deficits: ResourceDeficit[] = [];

  for (const sc of stationComputeds) {
    const supplied = stationSupplied.get(sc.stationId) || new Map();

    for (const input of sc.stationInputs) {
      const suppliedAmount = supplied.get(input.wareId) || 0;
      if (suppliedAmount < input.amount - 0.01) {
        deficits.push({
          wareId: input.wareId,
          stationId: sc.stationId,
          required: input.amount,
          supplied: suppliedAmount,
          deficit: input.amount - suppliedAmount,
        });
      }
    }
  }

  // Calculate network-wide totals
  // Total inputs = all station net inputs minus what's supplied by connections
  const allNetInputs: ResourceAmount[] = [];
  const allNetOutputs: ResourceAmount[] = [];

  for (const sc of stationComputeds) {
    const supplied = stationSupplied.get(sc.stationId) || new Map();

    // Add remaining inputs (after connections supply some)
    for (const input of sc.netInputs) {
      const suppliedAmount = supplied.get(input.wareId) || 0;
      const remaining = input.amount - suppliedAmount;
      if (remaining > 0) {
        allNetInputs.push({ wareId: input.wareId, amount: remaining });
      }
    }

    // Add remaining outputs (after connections consume some)
    // First, calculate how much each station exports via connections
    const exported = new Map<string, number>();
    for (const conn of plan.connections) {
      if (conn.sourceStationId === sc.stationId) {
        const current = exported.get(conn.wareId) || 0;
        exported.set(conn.wareId, current + conn.amount);
      }
    }

    for (const output of sc.netOutputs) {
      const exportedAmount = exported.get(output.wareId) || 0;
      const remaining = output.amount - exportedAmount;
      if (remaining > 0) {
        allNetOutputs.push({ wareId: output.wareId, amount: remaining });
      }
    }
  }

  return {
    stations: stationComputeds,
    connections: connectionComputeds,
    totalInputs: aggregateResources(allNetInputs),
    totalOutputs: aggregateResources(allNetOutputs),
    deficits,
  };
}

/**
 * Get computed data for a specific connection.
 */
export function getConnectionComputed(
  network: NetworkComputed,
  connectionId: string
): ConnectionComputed | undefined {
  return network.connections.find((c) => c.connectionId === connectionId);
}

/**
 * Get computed data for a specific station.
 */
export function getStationComputed(
  network: NetworkComputed,
  stationId: string
): StationComputed | undefined {
  return network.stations.find((s) => s.stationId === stationId);
}

/**
 * Get deficits for a specific station.
 */
export function getStationDeficits(
  network: NetworkComputed,
  stationId: string
): ResourceDeficit[] {
  return network.deficits.filter((d) => d.stationId === stationId);
}

/**
 * Check if a station has any deficits.
 */
export function hasStationDeficits(
  network: NetworkComputed,
  stationId: string
): boolean {
  return network.deficits.some((d) => d.stationId === stationId);
}

/**
 * Get total deficit count for a station.
 */
export function getStationDeficitCount(
  network: NetworkComputed,
  stationId: string
): number {
  return network.deficits.filter((d) => d.stationId === stationId).length;
}

/**
 * Get computed data for a specific module within a station.
 */
export function getModuleComputed(
  network: NetworkComputed,
  stationId: string,
  moduleId: string
) {
  const stationComputed = network.stations.find((s) => s.stationId === stationId);
  if (!stationComputed) return undefined;
  return stationComputed.modules.find((m) => m.moduleId === moduleId);
}
