/**
 * Preset configurations for WareIORow in different node contexts
 */

export interface HandleConfig {
  /** CSS class for handle styling (e.g., 'handle-module', 'handle-station-io') */
  baseClass: string;
  /** Whether handle uses inline positioning (relative) or absolute positioning */
  inline: boolean;
  /** Optional override for handle color class (e.g., 'handle-import', 'handle-export') */
  colorClass?: string;
}

export interface WareIOColors {
  /** Color for default/unsatisfied state (ware name) */
  default: string;
  /** Color for satisfied state (ware name) */
  satisfied: string;
  /** Color for deficit state (ware name, only for inputs) */
  deficit?: string;
}

export interface WareIOPreset {
  handle: HandleConfig;
  inputColors: WareIOColors;
  outputColors: WareIOColors;
  /** Whether drag-and-drop reordering is supported */
  hasDrag: boolean;
  /** Font size class */
  fontSize: string;
  /** Max width for ware name */
  nameMaxWidth: string;
}

/**
 * Preset for ModuleNode I/O rows
 * - Inline handles with handle-module class
 * - Yellow inputs, green outputs
 * - Supports drag-and-drop reordering
 */
export const MODULE_PRESET: WareIOPreset = {
  handle: {
    baseClass: 'handle-module',
    inline: true,
  },
  inputColors: {
    default: 'text-yellow-600',
    satisfied: 'text-muted-foreground',
  },
  outputColors: {
    default: 'text-green-700',
    satisfied: 'text-muted-foreground',
  },
  hasDrag: true,
  fontSize: 'text-[10px]',
  nameMaxWidth: 'max-w-[90px]',
};

/**
 * Preset for StationNode I/O rows
 * - Inline handles with handle-base class
 * - Blue inputs, green outputs with deficit highlighting
 * - Supports drag-and-drop reordering
 */
export const STATION_PRESET: WareIOPreset = {
  handle: {
    baseClass: 'handle-base',
    inline: true,
  },
  inputColors: {
    default: 'text-blue-400',
    satisfied: 'text-green-400',
    deficit: 'text-red-400',
  },
  outputColors: {
    default: 'text-green-400',
    satisfied: 'text-green-400',
  },
  hasDrag: true,
  fontSize: 'text-[10px]',
  nameMaxWidth: 'max-w-[80px]',
};

/**
 * Preset for StationInputNode (import) rows
 * - Inline handles with handle-module class (like production modules)
 * - Purple colors for imports
 * - Supports drag-and-drop reordering
 */
export const STATION_INPUT_PRESET: WareIOPreset = {
  handle: {
    baseClass: 'handle-module',
    inline: true,
    colorClass: 'handle-import',  // Purple color for imports
  },
  inputColors: {
    // Not used for input nodes (they only have outputs)
    default: 'text-purple-400',
    satisfied: 'text-purple-300/60',
  },
  outputColors: {
    default: 'text-purple-400',
    satisfied: 'text-purple-300/60',
  },
  hasDrag: true,
  fontSize: 'text-[12px]',
  nameMaxWidth: 'max-w-[90px]',
};

/**
 * Preset for StationOutputNode (export) rows
 * - Inline handles with handle-module class (like production modules)
 * - Teal colors for exports
 * - Supports drag-and-drop reordering
 */
export const STATION_OUTPUT_PRESET: WareIOPreset = {
  handle: {
    baseClass: 'handle-module',
    inline: true,
    colorClass: 'handle-export',  // Teal color for exports
  },
  inputColors: {
    default: 'text-teal-400',
    satisfied: 'text-teal-300/60',
  },
  outputColors: {
    // Not used for output nodes (they only have inputs)
    default: 'text-teal-400',
    satisfied: 'text-teal-300/60',
  },
  hasDrag: true,
  fontSize: 'text-[10px]',
  nameMaxWidth: 'max-w-[80px]',
};
