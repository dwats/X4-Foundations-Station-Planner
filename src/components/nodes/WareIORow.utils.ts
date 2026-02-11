/**
 * Utility types and helpers for WareIORow component
 */

export type IOStatus = 'unsatisfied' | 'partial' | 'satisfied';

export interface AmountDisplay {
  /** Primary amount to display (e.g., net amount or total need) */
  primary: number;
  /** Secondary amount for partial satisfaction display (e.g., supplied amount) */
  secondary?: number;
  /** The amount that has been fulfilled (for tooltip info) */
  fulfilled?: number;
}

/**
 * Compute status from amount values
 */
export function computeStatus(
  remaining: number,
  fulfilled: number
): IOStatus {
  if (remaining < 0.01) {
    return 'satisfied';
  }
  if (fulfilled > 0.01) {
    return 'partial';
  }
  return 'unsatisfied';
}

/**
 * Compute amount display from raw values
 */
export function computeAmountDisplay(
  total: number,
  fulfilled: number
): AmountDisplay {
  return {
    primary: total,
    secondary: fulfilled > 0.01 ? fulfilled : undefined,
    fulfilled,
  };
}
