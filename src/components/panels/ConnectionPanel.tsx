import { useMemo } from 'react';
import { usePlanStore, useGameDataStore } from '@/store';
import { getStationComputed, getConnectionComputed } from '@/engine';
import { useLocale } from '@/hooks/useLocale';
import type { PlanConnection, ConnectionMode } from '@/types';

interface ConnectionPanelProps {
  connection: PlanConnection;
}

export function ConnectionPanel({ connection }: ConnectionPanelProps) {
  const updateConnection = usePlanStore((state) => state.updateConnection);
  const removeConnection = usePlanStore((state) => state.removeConnection);
  const plan = usePlanStore((state) => state.plan);
  const computed = usePlanStore((state) => state.computed);
  const gameData = useGameDataStore((state) => state.gameData);
  const { t } = useLocale();

  // Get source and target stations
  const sourceStation = plan.stations.find(
    (s) => s.id === connection.sourceStationId
  );
  const targetStation = plan.stations.find(
    (s) => s.id === connection.targetStationId
  );

  // Get computed data for source station
  const sourceComputed = useMemo(
    () => getStationComputed(computed, connection.sourceStationId),
    [computed, connection.sourceStationId]
  );

  // Get computed data for target station
  const targetComputed = useMemo(
    () => getStationComputed(computed, connection.targetStationId),
    [computed, connection.targetStationId]
  );

  // Get ware info
  const wareName = connection.wareId
    ? t(gameData?.wares[connection.wareId]?.name, connection.wareId)
    : 'Unknown';

  // Get source available amount for this ware
  const sourceOutput = sourceComputed?.netOutputs.find(
    (o) => o.wareId === connection.wareId
  );
  const sourceAvailable = sourceOutput?.amount ?? 0;

  // Get target needs for this ware
  const targetInput = targetComputed?.netInputs.find(
    (i) => i.wareId === connection.wareId
  );
  const targetNeeds = targetInput?.amount ?? 0;

  // Get connection computed (effective amount)
  const connectionComputed = useMemo(
    () => getConnectionComputed(computed, connection.id),
    [computed, connection.id]
  );

  const effectiveAmount = connectionComputed?.effectiveAmount ?? connection.amount;
  const currentMode: ConnectionMode = connection.mode ?? 'auto';

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
    updateConnection(connection.id, {
      mode: newMode,
      // When switching to custom, use current effective amount as starting point
      amount: newMode === 'custom' ? effectiveAmount : connection.amount,
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      updateConnection(connection.id, { amount: 0 });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        updateConnection(connection.id, { amount: numValue });
      }
    }
  };

  const handleSetToMax = () => {
    updateConnection(connection.id, { mode: 'custom', amount: sourceAvailable });
  };

  const handleSetToNeeds = () => {
    const amount = Math.min(sourceAvailable, targetNeeds);
    updateConnection(connection.id, { mode: 'custom', amount });
  };

  const handleDelete = () => {
    if (confirm('Delete this connection?')) {
      removeConnection(connection.id);
    }
  };

  // Check if there's a deficit for this connection
  const deficit = computed.deficits.find(
    (d) =>
      d.stationId === connection.targetStationId &&
      d.wareId === connection.wareId
  );

  return (
    <div className="space-y-4">
      {/* Connection Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">From:</span>
          <span className="font-medium text-foreground truncate">
            {sourceStation?.name ?? 'Unknown'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">To:</span>
          <span className="font-medium text-foreground truncate">
            {targetStation?.name ?? 'Unknown'}
          </span>
        </div>
      </div>

      {/* Resource (read-only - determined by handle connection) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Resource</label>
        <div className="px-3 py-2 text-sm rounded-md border border-input bg-muted/50 text-foreground">
          {wareName}
        </div>
        <p className="text-xs text-muted-foreground">
          Resource is determined by the connected handles.
        </p>
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
        {currentMode === 'custom' && (
          <div className="flex gap-2">
            <button
              onClick={handleSetToMax}
              className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Max ({formatAmount(sourceAvailable)})
            </button>
            {targetNeeds > 0 && (
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
          <div className="flex justify-between">
            <span>Source available:</span>
            <span className="font-mono text-green-400">
              {formatAmount(sourceAvailable)}/hr
            </span>
          </div>
          {targetNeeds > 0 && (
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
        </div>

        {/* Deficit warning */}
        {deficit && deficit.deficit > 0 && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/30">
            <div className="text-xs text-red-400">
              Deficit: {formatAmount(deficit.deficit)}/hr still needed
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Target receives {formatAmount(deficit.supplied)}/hr but needs{' '}
              {formatAmount(deficit.required)}/hr
            </div>
          </div>
        )}

        {/* Fulfilled indicator */}
        {connection.wareId && !deficit && (
          <div className="p-2 rounded bg-green-500/10 border border-green-500/30">
            <div className="text-xs text-green-400">Fully supplied</div>
          </div>
        )}
      </div>

      {/* Actions */}
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
