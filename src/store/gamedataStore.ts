import { create } from 'zustand';
import type { GameData, ProductionModule, HabitatModule, StorageModule } from '@/types';

interface GameDataStore {
  gameData: GameData | null;
  loading: boolean;
  error: string | null;

  setGameData: (data: GameData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Helper to get module by blueprint ID
  getModule: (blueprintId: string) => ProductionModule | HabitatModule | StorageModule | null;
  getModuleType: (blueprintId: string) => 'production' | 'habitat' | 'storage' | null;
}

export const useGameDataStore = create<GameDataStore>((set, get) => ({
  gameData: null,
  loading: true,
  error: null,

  setGameData: (data) => set({ gameData: data, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),

  getModule: (blueprintId) => {
    const { gameData } = get();
    if (!gameData) return null;

    // Check all module types
    if (gameData.modules.production[blueprintId]) {
      return gameData.modules.production[blueprintId];
    }
    if (gameData.modules.habitat[blueprintId]) {
      return gameData.modules.habitat[blueprintId];
    }
    if (gameData.modules.storage[blueprintId]) {
      return gameData.modules.storage[blueprintId];
    }
    return null;
  },

  getModuleType: (blueprintId) => {
    const { gameData } = get();
    if (!gameData) return null;

    if (gameData.modules.production[blueprintId]) return 'production';
    if (gameData.modules.habitat[blueprintId]) return 'habitat';
    if (gameData.modules.storage[blueprintId]) return 'storage';
    return null;
  },
}));
