import { Plan } from '../types/plan';

/**
 * Export a plan to base64-encoded JSON string
 */
export function exportPlan(plan: Plan): string {
  const json = JSON.stringify(plan);
  return btoa(json);
}
