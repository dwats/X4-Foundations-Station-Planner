import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Plan, PlanStation, PlanSector, PlanModule, PlanConnection, PlanModuleConnection, NetworkComputed, GameMode } from '@/types';
import { STATION_INPUT_ID } from '@/types/plan';
import { computeNetwork } from '@/engine';
import { useGameDataStore } from './gamedataStore';

function createEmptyPlan(name: string, gameMode: GameMode = 'swi', tags: string[] = []): Plan {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    name,
    version: 1,
    gameMode,
    tags,
    createdAt: now,
    updatedAt: now,
    sectors: [],
    stations: [],
    connections: [],
  };
}

function createEmptyComputed(): NetworkComputed {
  return {
    stations: [],
    connections: [],
    totalInputs: [],
    totalOutputs: [],
    deficits: [],
  };
}

interface PlanStore {
  // State
  plan: Plan;
  computed: NetworkComputed;

  // Plan CRUD
  createPlan: (name: string) => void;
  loadPlan: (plan: Plan) => void;
  renamePlan: (name: string) => void;

  // Sectors
  addSector: (name: string, position: { x: number; y: number }) => void;
  updateSector: (id: string, patch: Partial<PlanSector>) => void;
  removeSector: (id: string) => void;

  // Stations
  addStation: (name: string, position: { x: number; y: number }) => void;
  updateStation: (id: string, patch: Partial<PlanStation>) => void;
  removeStation: (id: string) => void;
  moveStationToSector: (stationId: string, sectorId: string | null) => void;

  // Modules
  addModule: (stationId: string, blueprintId: string, position: { x: number; y: number }) => void;
  updateModule: (stationId: string, moduleId: string, patch: Partial<PlanModule>) => void;
  removeModule: (stationId: string, moduleId: string) => void;

  // Station-to-station connections
  addConnection: (conn: Omit<PlanConnection, 'id'>) => void;
  updateConnection: (id: string, patch: Partial<PlanConnection>) => void;
  removeConnection: (id: string) => void;

  // Module-to-module connections (within a station)
  addModuleConnection: (stationId: string, conn: Omit<PlanModuleConnection, 'id'>) => void;
  updateModuleConnection: (stationId: string, connId: string, patch: Partial<PlanModuleConnection>) => void;
  removeModuleConnection: (stationId: string, connId: string) => void;

  // Recompute
  recompute: () => void;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plan: createEmptyPlan('New Plan'),
  computed: createEmptyComputed(),

  createPlan: (name) => {
    set({ plan: createEmptyPlan(name), computed: createEmptyComputed() });
  },

  loadPlan: (plan) => {
    // Migrate connections to add ratio/locked fields if missing
    const migratedPlan: Plan = {
      ...plan,
      // Ensure new fields exist
      gameMode: plan.gameMode || 'swi',
      tags: plan.tags || [],
      stations: plan.stations.map((station) => ({
        ...station,
        moduleConnections: (station.moduleConnections ?? []).map((conn) => ({
          ...conn,
          // Default to unlocked if not set
          locked: conn.locked ?? false,
          // Default ratio to 1.0 (100%) if not set - will be updated on next edit
          ratio: conn.ratio ?? 1.0,
        })),
      })),
    };
    set({ plan: migratedPlan, computed: createEmptyComputed() });
    get().recompute();
  },

  renamePlan: (name) => {
    set((state) => ({
      plan: { ...state.plan, name, updatedAt: new Date().toISOString() },
    }));
  },

  addSector: (name, position) => {
    const sector: PlanSector = {
      id: nanoid(),
      name,
      sunlight: 100,
      position,
      size: { width: 400, height: 300 },
    };
    set((state) => ({
      plan: {
        ...state.plan,
        sectors: [...state.plan.sectors, sector],
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  updateSector: (id, patch) => {
    set((state) => ({
      plan: {
        ...state.plan,
        sectors: state.plan.sectors.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  removeSector: (id) => {
    set((state) => ({
      plan: {
        ...state.plan,
        sectors: state.plan.sectors.filter((s) => s.id !== id),
        stations: state.plan.stations.map((st) =>
          st.sectorId === id ? { ...st, sectorId: null } : st
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  addStation: (name, position) => {
    const station: PlanStation = {
      id: nanoid(),
      name,
      sectorId: null,
      position,
      sunlightOverride: null,
      modules: [],
      moduleConnections: [],
    };
    set((state) => ({
      plan: {
        ...state.plan,
        stations: [...state.plan.stations, station],
        updatedAt: new Date().toISOString(),
      },
    }));
  },

  updateStation: (id, patch) => {
    set((state) => ({
      plan: {
        ...state.plan,
        stations: state.plan.stations.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  removeStation: (id) => {
    set((state) => ({
      plan: {
        ...state.plan,
        stations: state.plan.stations.filter((s) => s.id !== id),
        connections: state.plan.connections.filter(
          (c) => c.sourceStationId !== id && c.targetStationId !== id
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  moveStationToSector: (stationId, sectorId) => {
    set((state) => ({
      plan: {
        ...state.plan,
        stations: state.plan.stations.map((s) =>
          s.id === stationId ? { ...s, sectorId } : s
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  addModule: (stationId, blueprintId, position) => {
    const module: PlanModule = {
      id: nanoid(),
      blueprintId,
      count: 1,
      position,
    };
    set((state) => ({
      plan: {
        ...state.plan,
        stations: state.plan.stations.map((s) =>
          s.id === stationId
            ? { ...s, modules: [...s.modules, module] }
            : s
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  updateModule: (stationId, moduleId, patch) => {
    const state = get();
    const station = state.plan.stations.find((s) => s.id === stationId);
    const oldModule = station?.modules.find((m) => m.id === moduleId);

    // Check if count is changing - if so, auto-scale unlocked connections
    const isCountChanging =
      patch.count !== undefined &&
      oldModule &&
      patch.count !== oldModule.count;

    if (isCountChanging && oldModule) {
      const scaleFactor = patch.count! / oldModule.count;

      // Scale unlocked connections where this module is involved
      const scaledConnections = (station?.moduleConnections ?? []).map((conn) => {
        // Scale if this module is the source (outgoing connections)
        if (conn.sourceModuleId === moduleId && !conn.locked) {
          return { ...conn, amount: conn.amount * scaleFactor };
        }
        // Scale if this module is the target and source is Station Input (incoming from external)
        if (conn.targetModuleId === moduleId && conn.sourceModuleId === STATION_INPUT_ID && !conn.locked) {
          return { ...conn, amount: conn.amount * scaleFactor };
        }
        return conn;
      });

      // Apply both module update and connection scaling together
      set((state) => ({
        plan: {
          ...state.plan,
          stations: state.plan.stations.map((s) =>
            s.id === stationId
              ? {
                  ...s,
                  modules: s.modules.map((m) =>
                    m.id === moduleId ? { ...m, ...patch } : m
                  ),
                  moduleConnections: scaledConnections,
                }
              : s
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    } else {
      // Normal update without connection scaling
      set((state) => ({
        plan: {
          ...state.plan,
          stations: state.plan.stations.map((s) =>
            s.id === stationId
              ? {
                  ...s,
                  modules: s.modules.map((m) =>
                    m.id === moduleId ? { ...m, ...patch } : m
                  ),
                }
              : s
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    }
    get().recompute();
  },

  removeModule: (stationId, moduleId) => {
    set((state) => ({
      plan: {
        ...state.plan,
        stations: state.plan.stations.map((s) =>
          s.id === stationId
            ? {
                ...s,
                modules: s.modules.filter((m) => m.id !== moduleId),
                // Also remove any connections involving this module
                moduleConnections: (s.moduleConnections ?? []).filter(
                  (c) => c.sourceModuleId !== moduleId && c.targetModuleId !== moduleId
                ),
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  addConnection: (conn) => {
    const connection: PlanConnection = {
      id: nanoid(),
      ...conn,
    };
    set((state) => ({
      plan: {
        ...state.plan,
        connections: [...state.plan.connections, connection],
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  updateConnection: (id, patch) => {
    set((state) => ({
      plan: {
        ...state.plan,
        connections: state.plan.connections.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  removeConnection: (id) => {
    set((state) => ({
      plan: {
        ...state.plan,
        connections: state.plan.connections.filter((c) => c.id !== id),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  addModuleConnection: (stationId, conn) => {
    const connection: PlanModuleConnection = {
      id: nanoid(),
      ...conn,
    };
    set((state) => ({
      plan: {
        ...state.plan,
        stations: state.plan.stations.map((s) =>
          s.id === stationId
            ? {
                ...s,
                moduleConnections: [...(s.moduleConnections ?? []), connection],
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  updateModuleConnection: (stationId, connId, patch) => {
    set((state) => ({
      plan: {
        ...state.plan,
        stations: state.plan.stations.map((s) =>
          s.id === stationId
            ? {
                ...s,
                moduleConnections: (s.moduleConnections ?? []).map((c) =>
                  c.id === connId ? { ...c, ...patch } : c
                ),
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  removeModuleConnection: (stationId, connId) => {
    set((state) => ({
      plan: {
        ...state.plan,
        stations: state.plan.stations.map((s) =>
          s.id === stationId
            ? {
                ...s,
                moduleConnections: (s.moduleConnections ?? []).filter((c) => c.id !== connId),
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().recompute();
  },

  recompute: () => {
    const { plan } = get();
    const gameData = useGameDataStore.getState().gameData;

    if (!gameData) {
      // Game data not loaded yet, use empty computed
      set({ computed: createEmptyComputed() });
      return;
    }

    const computed = computeNetwork(plan, gameData);
    set({ computed });
  },
}));

// Auto-save subscription: delegate to planManagerStore on plan changes
// Accepts saveCurrentPlan function to avoid circular dependency
let autoSaveSetup = false;
export function setupAutoSave(saveCurrentPlan: (plan: Plan) => void) {
  if (autoSaveSetup) return;
  autoSaveSetup = true;

  usePlanStore.subscribe((state, prevState) => {
    if (state.plan !== prevState.plan) {
      saveCurrentPlan(state.plan);
    }
  });
}
