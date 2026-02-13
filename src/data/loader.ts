import type { GameData } from '@/types';
import type { GameMode } from '@/types/plan';

let cachedGameData: GameData | null = null;
let cachedMode: GameMode | null = null;

export async function loadGameData(mode: GameMode = 'swi'): Promise<GameData> {
  if (cachedGameData && cachedMode === mode) {
    return cachedGameData;
  }

  const file = mode === 'base' ? 'gamedata-base.json' : 'gamedata-swi.json';
  const response = await fetch(`${import.meta.env.BASE_URL}${file}`);
  if (!response.ok) {
    throw new Error(`Failed to load game data: ${response.statusText}`);
  }

  cachedGameData = await response.json();
  cachedMode = mode;
  return cachedGameData!;
}

export function getGameData(): GameData | null {
  return cachedGameData;
}

export function clearGameDataCache(): void {
  cachedGameData = null;
  cachedMode = null;
}
