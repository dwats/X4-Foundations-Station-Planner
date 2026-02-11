import type { GameData } from '@/types';

let cachedGameData: GameData | null = null;

export async function loadGameData(): Promise<GameData> {
  if (cachedGameData) {
    return cachedGameData;
  }

  const response = await fetch(`${import.meta.env.BASE_URL}gamedata.json`);
  if (!response.ok) {
    throw new Error(`Failed to load game data: ${response.statusText}`);
  }

  cachedGameData = await response.json();
  return cachedGameData!;
}

export function getGameData(): GameData | null {
  return cachedGameData;
}
