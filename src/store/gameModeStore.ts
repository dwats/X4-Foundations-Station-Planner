import { create } from 'zustand';
import type { GameMode } from '@/types';

const STORAGE_KEY = 'x4-game-mode';

interface GameModeStore {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
}

function loadGameMode(): GameMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'base' || stored === 'swi') return stored;
  } catch { /* ignore */ }
  return 'swi';
}

export const useGameModeStore = create<GameModeStore>((set) => ({
  gameMode: loadGameMode(),
  setGameMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    set({ gameMode: mode });
  },
}));
