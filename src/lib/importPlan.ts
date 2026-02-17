import { nanoid } from 'nanoid';
import { Plan } from '../types/plan';

type ImportResult =
  | { success: true; plan: Plan }
  | { success: false; error: string };

/**
 * Import a plan from base64-encoded JSON string
 * - Decodes base64 → JSON
 * - Validates basic structure
 * - Assigns new ID and timestamps
 */
export function importPlan(base64: string): ImportResult {
  try {
    // Decode base64 to JSON string
    const json = atob(base64);

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (parseError) {
      return { success: false, error: 'Invalid JSON format' };
    }

    // Basic type checking
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'Invalid plan format: not an object' };
    }

    const data = parsed as Record<string, unknown>;

    // Validate required fields
    if (typeof data.name !== 'string') {
      return { success: false, error: 'Missing or invalid field: name' };
    }

    if (typeof data.version !== 'number') {
      return { success: false, error: 'Missing or invalid field: version' };
    }

    if (!Array.isArray(data.stations)) {
      return { success: false, error: 'Missing or invalid field: stations' };
    }

    if (!Array.isArray(data.sectors)) {
      return { success: false, error: 'Missing or invalid field: sectors' };
    }

    if (!Array.isArray(data.connections)) {
      return { success: false, error: 'Missing or invalid field: connections' };
    }

    // Create new plan with new ID and timestamps
    const now = new Date().toISOString();
    const plan: Plan = {
      ...(data as unknown as Plan),
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };

    return { success: true, plan };
  } catch (error) {
    // Handle base64 decode errors or other unexpected errors
    if (error instanceof Error) {
      return { success: false, error: `Import failed: ${error.message}` };
    }
    return { success: false, error: 'Invalid base64 encoding' };
  }
}
