/** Reserved module IDs for Station Input/Output nodes */
export const STATION_INPUT_ID = '__station_input__';
export const STATION_OUTPUT_ID = '__station_output__';

/** Resource amount - used for inputs/outputs */
export interface ResourceAmount {
  wareId: string;
  amount: number;
}

/** The full user plan — serializable to JSON */
export interface Plan {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  sectors: PlanSector[];
  stations: PlanStation[];
  connections: PlanConnection[];
}

export interface PlanSector {
  id: string;
  name: string;
  sunlight: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface PlanStation {
  id: string;
  name: string;
  sectorId: string | null;
  position: { x: number; y: number };
  sunlightOverride: number | null;
  modules: PlanModule[];
  /** Connections between modules within this station */
  moduleConnections: PlanModuleConnection[];
  /** When true, fill all habitat capacity. When false (default), cap to production needs. */
  fillHabitats?: boolean;
  /** Custom display order for output wares (wareIds). If not set, uses default computed order. */
  outputOrder?: string[];
  /** Custom display order for input wares (wareIds). If not set, uses default computed order. */
  inputOrder?: string[];
  /** Position of the Station Input node in station view */
  stationInputPosition?: { x: number; y: number };
  /** Position of the Station Output node in station view */
  stationOutputPosition?: { x: number; y: number };
}

export interface PlanModule {
  id: string;
  blueprintId: string;
  count: number;
  position: { x: number; y: number };
  /** Custom display order for output wares (wareIds). */
  outputOrder?: string[];
  /** Custom display order for input wares (wareIds). */
  inputOrder?: string[];
}

/** Connection between modules within a station */
export interface PlanModuleConnection {
  id: string;
  sourceModuleId: string;
  targetModuleId: string;
  wareId: string;
  /** For 'custom' mode: the fixed amount. For 'auto'/'max': stored but recomputed */
  amount: number;
  /**
   * Connection mode:
   * - 'auto': min(sourceAvailable, targetNeed) - adjusts dynamically
   * - 'custom': use the fixed 'amount' value
   * - 'max': take all available from source (up to target need)
   */
  mode?: ConnectionMode;
  /** If true, don't auto-scale when module count changes (only for 'custom' mode) */
  locked?: boolean;
  /** Percentage of source gross output (0-1), used for auto-scaling */
  ratio?: number;
}

/** Connection mode determines how the amount is calculated */
export type ConnectionMode = 'auto' | 'custom' | 'max';

export interface PlanConnection {
  id: string;
  sourceStationId: string;
  targetStationId: string;
  wareId: string;
  /** For 'custom' mode: the fixed amount. For 'auto'/'max': ignored (computed dynamically) */
  amount: number;
  /**
   * Connection mode:
   * - 'auto': min(sourceAvailable, targetNeed) - adjusts dynamically
   * - 'custom': use the fixed 'amount' value
   * - 'max': take all available from source (up to target need)
   */
  mode?: ConnectionMode;
  routePoints?: { x: number; y: number }[];
}

/** Computed module summary (not persisted) */
export interface ModuleComputed {
  moduleId: string;
  blueprintId: string;
  /** Gross inputs for this module (per hour) */
  grossInputs: ResourceAmount[];
  /** Gross outputs for this module (per hour) */
  grossOutputs: ResourceAmount[];
  /** Unsupplied inputs after module connections (per hour) */
  netInputs: ResourceAmount[];
  /** Surplus outputs after module connections (per hour) */
  netOutputs: ResourceAmount[];
}

/** Computed station summary (not persisted) */
export interface StationComputed {
  stationId: string;
  effectiveSunlight: number;
  totalWorkforceRequired: number;
  totalWorkforceCapacity: number;
  /** Actual population (capped to required unless fillHabitats is true) */
  actualPopulation: number;
  workforceFoodDemand: number;
  workforceMedicalDemand: number;
  /** Per-module computed data */
  modules: ModuleComputed[];
  /** All amounts are per hour (3600 seconds) */
  grossInputs: ResourceAmount[];
  grossOutputs: ResourceAmount[];
  /** Net inputs = unsupplied module inputs after internal connections */
  netInputs: ResourceAmount[];
  /** Net outputs = surplus module outputs after internal connections */
  netOutputs: ResourceAmount[];
  /** Module net inputs not yet connected to Station Input node */
  availableForImport: ResourceAmount[];
  /** Module net outputs not yet connected to Station Output node */
  availableForExport: ResourceAmount[];
  /** Wares explicitly connected through Station Input node (visible at sector level) */
  stationInputs: ResourceAmount[];
  /** Wares explicitly connected through Station Output node (visible at sector level) */
  stationOutputs: ResourceAmount[];
  /** Amounts being supplied TO this station by inter-station connections */
  externallySupplied: ResourceAmount[];
  /** Amounts being consumed FROM this station by inter-station connections */
  externallyConsumed: ResourceAmount[];
  /** Station inputs still needed (stationInputs - externallySupplied) */
  remainingInputs: ResourceAmount[];
  /** Station outputs still available (stationOutputs - externallyConsumed) */
  remainingOutputs: ResourceAmount[];
  /** Computed effective amounts for module connections */
  moduleConnections: ConnectionComputed[];
}

/** Computed connection with effective amount (used for both module and inter-station connections) */
export interface ConnectionComputed {
  connectionId: string;
  /** The actual amount flowing through this connection */
  effectiveAmount: number;
  /** Whether the connection is constrained by source availability */
  sourceConstrained: boolean;
  /** Whether the connection is constrained by target need */
  targetConstrained: boolean;
}

/** Computed network summary (not persisted) */
export interface NetworkComputed {
  stations: StationComputed[];
  connections: ConnectionComputed[];
  totalInputs: ResourceAmount[];
  totalOutputs: ResourceAmount[];
  deficits: ResourceDeficit[];
}

export interface ResourceDeficit {
  wareId: string;
  stationId: string;
  required: number;
  supplied: number;
  deficit: number;
}

/** Module-level deficit (unsupplied input within a station) */
export interface ModuleDeficit {
  wareId: string;
  stationId: string;
  moduleId: string;
  required: number;
  supplied: number;
  deficit: number;
}
