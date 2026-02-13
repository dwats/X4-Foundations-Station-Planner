import { useMemo } from 'react';
import { useGameDataStore, usePlanStore, useUIStore } from '@/store';
import { useLocale } from '@/hooks/useLocale';
import type { PlanModule } from '@/types';

interface ModulePanelProps {
  stationId: string;
  module: PlanModule;
}

export function ModulePanel({ stationId, module }: ModulePanelProps) {
  const gameData = useGameDataStore((state) => state.gameData);
  const getModule = useGameDataStore((state) => state.getModule);
  const getModuleType = useGameDataStore((state) => state.getModuleType);
  const updateModule = usePlanStore((state) => state.updateModule);
  const removeModule = usePlanStore((state) => state.removeModule);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const { t } = useLocale();

  const blueprint = getModule(module.blueprintId);
  const moduleType = getModuleType(module.blueprintId);

  // Get all modules of the same type for the blueprint selector
  const availableBlueprints = useMemo(() => {
    if (!gameData || !moduleType) return [];

    const modules = gameData.modules[moduleType];
    return Object.values(modules).sort((a, b) => t(a.name).localeCompare(t(b.name)));
  }, [gameData, moduleType, t]);

  const handleBlueprintChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateModule(stationId, module.id, { blueprintId: e.target.value });
  };

  const handleCountChange = (delta: number) => {
    const newCount = Math.max(1, module.count + delta);
    updateModule(stationId, module.id, { count: newCount });
  };

  const handleCountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      updateModule(stationId, module.id, { count: value });
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete this ${t(blueprint?.name, 'module')}?`)) {
      removeModule(stationId, module.id);
      clearSelection();
    }
  };

  return (
    <div className="space-y-4">
      {/* Module type indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">
          {moduleType === 'production' ? '🏭' : moduleType === 'habitat' ? '🏠' : '📦'}
        </span>
        <span className="text-muted-foreground capitalize">{moduleType} Module</span>
      </div>

      {/* Blueprint selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Blueprint</label>
        <select
          value={module.blueprintId}
          onChange={handleBlueprintChange}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {availableBlueprints.map((bp) => (
            <option key={bp.id} value={bp.id}>
              {t(bp.name)}
            </option>
          ))}
        </select>
      </div>

      {/* Count adjuster */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Count</label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCountChange(-1)}
            disabled={module.count <= 1}
            className="w-8 h-8 rounded-md border border-input bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={module.count}
            onChange={handleCountInput}
            className="w-16 px-2 py-1 text-sm text-center rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => handleCountChange(1)}
            className="w-8 h-8 rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Blueprint info */}
      {blueprint && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Info</label>
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-2 rounded">
            {moduleType === 'production' && 'producedWareId' in blueprint && (
              <>
                <p>Produces: {blueprint.producedWareId}</p>
                <p>Workforce: {blueprint.workforceMax * module.count}</p>
              </>
            )}
            {moduleType === 'habitat' && 'workforceCapacity' in blueprint && (
              <>
                <p>Race: {blueprint.race}</p>
                <p>Capacity: {blueprint.workforceCapacity * module.count} workers</p>
              </>
            )}
            {moduleType === 'storage' && 'cargoMax' in blueprint && (
              <>
                <p>Type: {blueprint.cargoType}</p>
                <p>Capacity: {blueprint.cargoMax * module.count}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lock Position */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={module.locked ?? false}
          onChange={(e) => updateModule(stationId, module.id, { locked: e.target.checked })}
          className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
        />
        <span className="text-sm">Lock position</span>
      </label>

      {/* Position info */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Position</label>
        <div className="text-xs text-muted-foreground font-mono">
          x: {Math.round(module.position.x)}, y: {Math.round(module.position.y)}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 text-sm rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          Delete Module
        </button>
      </div>
    </div>
  );
}
