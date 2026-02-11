// Type definitions for X4 Station Planner game data

export interface WareInput {
  ware: string;
  amount: number;
}

export interface Recipe {
  id: string;
  wareId: string;
  method: string;
  time: number;
  amount: number;
  inputs: WareInput[];
  workforceBonus: number; // e.g., 0.34 = 34% bonus with full workforce
}

export interface Ware {
  id: string;
  name: string;
  group: string;
  transport: string;
  volume: number;
  tags: string[];
}

export interface ProductionModule {
  id: string;
  name: string;
  producedWareId: string;
  workforceMax: number;
}

export interface HabitatModule {
  id: string;
  name: string;
  race: string;
  workforceCapacity: number;
}

export interface StorageModule {
  id: string;
  name: string;
  cargoMax: number;
  cargoType: 'container' | 'liquid' | 'solid';
}

export type Module = ProductionModule | HabitatModule | StorageModule;

export interface Sector {
  id: string;
  name: string;
  sunlight: number; // percentage (e.g., 100, 200, 50)
  owner: string;
  resources: {
    ice: boolean;
    ore: boolean;
    silicon: boolean;
    rhydonium: boolean;
    rawScrap: boolean;
    helium: boolean;
    methane: boolean;
    tibanna: boolean;
  };
}

export interface GameData {
  wares: Record<string, Ware>;
  recipes: Record<string, Recipe>;
  modules: {
    production: Record<string, ProductionModule>;
    habitat: Record<string, HabitatModule>;
    storage: Record<string, StorageModule>;
  };
  sectors: Record<string, Sector>;
}
