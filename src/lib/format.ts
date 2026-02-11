/**
 * Formatting utilities for display values
 */

/**
 * Format a numeric amount for display.
 * Numbers >= 1000 are displayed as "X.Xk"
 * Numbers < 1000 are displayed as integers
 */
export function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return amount.toFixed(0);
}
