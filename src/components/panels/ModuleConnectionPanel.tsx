import { useMemo } from 'react';
import { usePlanStore, useGameDataStore, useUIStore } from '@/store';
import { useLocale } from '@/hooks/useLocale';
import { getModuleComputed, getStationComputed } from '@/engine';
import type { PlanModuleConnection, ConnectionMode } from '@/types';
import { STATION_INPUT_ID, STATION_OUTPUT_ID } from '@/types/plan';

interface ModuleConnectionPanelProps {
  stationId: string;
  connection: PlanModuleConnection;
}

export function ModuleConnectionPanel({ stationId, connection }: ModuleConnectionPanelProps) {
  const updateModuleConnection = usePlanStore((state) => state.updateModuleConnection);
  const removeModuleConnection = usePlanStore((state) => state.removeModuleConnection);
  const stations = usePlanStore((state) => state.plan.stations);
  const computed = usePlanStore((state) => state.computed);
  const gameData = useGameDataStore((state) => state.gameData);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const { t } = useLocale();

  const station = stations.find((s) => s.id === stationId);

  // Get source and target module info
  const sourceModule = station?.modules.find((m) => m.id === connection.sourceModuleId);
  const targetModule = station?.modules.find((m) => m.id === connection.targetModuleId);

  // Check connection endpoints for Station I/O nodes
  const isFromStationInput = connection.sourceModuleId === STATION_INPUT_ID;
  const isToStationOutput = connection.targetModuleId === STATION_OUTPUT_ID;

  // Get blueprint names
  const getModuleName = (blueprintId: string | undefined): string => {
    if (!blueprintId || !gameData) return 'Unknown';
    const name =
      gameData.modules.production[blueprintId]?.name ??
      gameData.modules.habitat[blueprintId]?.name ??
      gameData.modules.storage[blueprintId]?.name;
    return t(name, blueprintId);
  };

  const sourceName = isFromStationInput
    ? 'Station Input'
    : getModuleName(sourceModule?.blueprintId);
  const targetName = isToStationOutput
    ? 'Station Output'
    : getModuleName(targetModule?.blueprintId);

  // Get computed data
  const sourceComputed = useMemo(
    () => isFromStationInput ? null : getModuleComputed(computed, stationId, connection.sourceModuleId),
    [computed, stationId, connection.sourceModuleId, isFromStationInput]
  );
  const targetComputed = useMemo(
    () => isToStationOutput ? null : getModuleComputed(computed, stationId, connection.targetModuleId),
    [computed, stationId, connection.targetModuleId, isToStationOutput]
  );

  // Get connection computed (effective amount)
  const connectionComputed = useMemo(() => {
    const stationComputed = getStationComputed(computed, stationId);
    return stationComputed?.moduleConnections.find((c) => c.connectionId === connection.id);
  }, [computed, stationId, connection.id]);

  const effectiveAmount = connectionComputed?.effectiveAmount ?? connection.amount;
  const currentMode: ConnectionMode = connection.mode ?? 'auto';

  // Get ware info
  const wareName = t(gameData?.wares[connection.wareId]?.name, connection.wareId);

  // Source available = gross output for this ware
  const sourceGross = sourceComputed?.grossOutputs.find((o) => o.wareId === connection.wareId);
  const sourceAvailable = sourceGross?.amount ?? 0;

  // Target needs = gross input for this ware
  const targetGross = targetComputed?.grossInputs.find((i) => i.wareId === connection.wareId);
  const targetNeeds = targetGross?.amount ?? 0;

  // Format amount for display
  const formatAmount = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}k`;
    }
    return amount.toFixed(0);
  };

  const handleModeChange = (newMode: ConnectionMode) => {
    updateModuleConnection(stationId, connection.id, {
      mode: newMode,
      // When switching to custom, use current effective amount as starting point
      amount: newMode === 'custom' ? effectiveAmount : connection.amount,
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      updateModuleConnection(stationId, connection.id, { amount: 0 });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        // Recalculate ratio when source is a module (has available output to base ratio on)
        // This includes module-to-module and module-to-station-output connections
        const newRatio = !isFromStationInput && sourceAvailable > 0
          ? numValue / sourceAvailable
          : connection.ratio;
        updateModuleConnection(stationId, connection.id, {
          amount: numValue,
          ratio: newRatio,
        });
      }
    }
  };

  const handleLockToggle = () => {
    updateModuleConnection(stationId, connection.id, {
      locked: !connection.locked,
    });
  };

  const handleSetToMax = () => {
    updateModuleConnection(stationId, connection.id, {
      mode: 'custom',
      amount: sourceAvailable,
      ratio: 1.0,
    });
  };

  const handleSetToNeeds = () => {
    const matchAmount = Math.min(sourceAvailable, targetNeeds);
    const newRatio = sourceAvailable > 0 ? matchAmount / sourceAvailable : 0;
    updateModuleConnection(stationId, connection.id, {
      mode: 'custom',
      amount: matchAmount,
      ratio: newRatio,
    });
  };

  const handleDelete = () => {
    if (confirm('Delete this connection?')) {
      removeModuleConnection(stationId, connection.id);
      clearSelection();
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">From:</span>
          <span className="font-medium text-foreground truncate">
            {sourceName}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">To:</span>
          <span className="font-medium text-foreground truncate">
            {targetName}
          </span>
        </div>
      </div>

      {/* Resource */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Resource</label>
        <div className="px-3 py-2 text-sm rounded-md border border-input bg-muted/50 text-foreground">
          {wareName}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Mode</label>
        <select
          value={currentMode}
          onChange={(e) => handleModeChange(e.target.value as ConnectionMode)}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="auto">Auto (match availability)</option>
          <option value="max">Max (take all available)</option>
          <option value="custom">Custom (fixed amount)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {currentMode === 'auto' && 'Transfers min(source available, target need)'}
          {currentMode === 'max' && 'Takes all available from source up to target need'}
          {currentMode === 'custom' && 'Uses a fixed amount you specify'}
        </p>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          {currentMode === 'custom' ? 'Custom Amount' : 'Effective Amount'}{' '}
          <span className="text-muted-foreground font-normal">(per hour)</span>
        </label>
        {currentMode === 'custom' ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={connection.amount}
              onChange={handleAmountChange}
              className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : (
          <div className="px-3 py-2 text-sm rounded-md border border-input bg-muted/50 text-foreground font-mono">
            {formatAmount(effectiveAmount)}
          </div>
        )}

        {/* Quick amount buttons - only in custom mode */}
        {currentMode === 'custom' && !isFromStationInput && sourceAvailable > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleSetToMax}
              className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Max ({formatAmount(sourceAvailable)})
            </button>
            {!isToStationOutput && targetNeeds > 0 && (
              <button
                onClick={handleSetToNeeds}
                className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Match Need ({formatAmount(Math.min(sourceAvailable, targetNeeds))})
              </button>
            )}
          </div>
        )}

        {/* Capacity info */}
        <div className="text-xs space-y-0.5 text-muted-foreground">
          {!isFromStationInput && sourceAvailable > 0 && (
            <div className="flex justify-between">
              <span>Source produces:</span>
              <span className="font-mono text-green-400">
                {formatAmount(sourceAvailable)}/hr
              </span>
            </div>
          )}
          {!isToStationOutput && targetNeeds > 0 && (
            <div className="flex justify-between">
              <span>Target needs:</span>
              <span className="font-mono text-blue-400">
                {formatAmount(targetNeeds)}/hr
              </span>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <span>Transferring:</span>
            <span className={`font-mono ${
              connectionComputed?.sourceConstrained ? 'text-yellow-400' : 'text-foreground'
            }`}>
              {formatAmount(effectiveAmount)}/hr
            </span>
          </div>
          {currentMode === 'custom' && connection.amount !== effectiveAmount && (
            <div className="flex justify-between text-yellow-400">
              <span>Configured:</span>
              <span className="font-mono">
                {formatAmount(connection.amount)}/hr
              </span>
            </div>
          )}
          {connectionComputed?.sourceConstrained && (
            <div className="text-yellow-400 mt-1">
              ⚠ Limited by source availability
            </div>
          )}
          {connectionComputed?.targetConstrained && (
            <div className="text-blue-400 mt-1">
              ℹ Target needs less than available
            </div>
          )}
          {!isFromStationInput && connection.ratio !== undefined && currentMode === 'custom' && (
            <div className="flex justify-between">
              <span>Ratio:</span>
              <span className="font-mono">
                {(connection.ratio * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Lock Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-foreground">Lock Amount</label>
          <p className="text-xs text-muted-foreground">
            Locked connections don't auto-scale
          </p>
        </div>
        <button
          onClick={handleLockToggle}
          className={`w-12 h-6 rounded-full transition-colors ${
            connection.locked ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
              connection.locked ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Delete */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 text-sm rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          Delete Connection
        </button>
      </div>
    </div>
  );
}
