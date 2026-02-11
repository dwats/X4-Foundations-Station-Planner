/**
 * Sunlight calculation for energy production.
 *
 * Sunlight only affects energy cell production - solar panels produce
 * more or less based on the sector's sunlight percentage.
 */

import type { PlanStation, PlanSector } from '@/types';

// Default sunlight if no sector and no override
const DEFAULT_SUNLIGHT = 100;

// Wares affected by sunlight (only energy production)
const SUNLIGHT_AFFECTED_WARES = ['energycells'];

/**
 * Get the effective sunlight for a station.
 * Priority: station override > sector sunlight > default (100%)
 */
export function getEffectiveSunlight(
  station: PlanStation,
  sectors: PlanSector[]
): number {
  // Station override takes priority
  if (station.sunlightOverride !== null) {
    return station.sunlightOverride;
  }

  // Find sector and use its sunlight
  if (station.sectorId) {
    const sector = sectors.find((s) => s.id === station.sectorId);
    if (sector) {
      return sector.sunlight;
    }
  }

  // Default
  return DEFAULT_SUNLIGHT;
}

/**
 * Calculate the sunlight multiplier for a given ware.
 * Only energy cells are affected by sunlight.
 */
export function getSunlightMultiplier(
  wareId: string,
  effectiveSunlight: number
): number {
  if (SUNLIGHT_AFFECTED_WARES.includes(wareId)) {
    return effectiveSunlight / 100;
  }
  return 1.0;
}

/**
 * Check if a ware is affected by sunlight.
 */
export function isWareSunlightAffected(wareId: string): boolean {
  return SUNLIGHT_AFFECTED_WARES.includes(wareId);
}
