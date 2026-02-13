import { usePlanStore, useGameDataStore } from '@/store';
import { getStationComputed } from '@/engine';
import { useLocale } from '@/hooks/useLocale';
import type { PlanStation } from '@/types';

interface StationPanelProps {
  station: PlanStation;
}

export function StationPanel({ station }: StationPanelProps) {
  const updateStation = usePlanStore((state) => state.updateStation);
  const removeStation = usePlanStore((state) => state.removeStation);
  const plan = usePlanStore((state) => state.plan);
  const computed = usePlanStore((state) => state.computed);
  const gameData = useGameDataStore((state) => state.gameData);
  const { t } = useLocale();

  // Find the sector this station belongs to
  const sector = station.sectorId
    ? plan.sectors.find((s) => s.id === station.sectorId)
    : null;

  const effectiveSunlight =
    station.sunlightOverride ?? sector?.sunlight ?? 100;

  // Get computed data for this station
  const stationComputed = getStationComputed(computed, station.id);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateStation(station.id, { name: e.target.value });
  };

  const handleSunlightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      updateStation(station.id, { sunlightOverride: null });
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 500) {
        updateStation(station.id, { sunlightOverride: numValue });
      }
    }
  };

  const handleClearSunlightOverride = () => {
    updateStation(station.id, { sunlightOverride: null });
  };

  const handleFillHabitatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateStation(station.id, { fillHabitats: e.target.checked });
  };

  const handleDelete = () => {
    if (confirm(`Delete station "${station.name}"?`)) {
      removeStation(station.id);
    }
  };

  // Get ware name helper
  const getWareName = (wareId: string): string => {
    return t(gameData?.wares[wareId]?.name, wareId);
  };

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

  const hasWorkforce = stationComputed && stationComputed.totalWorkforceRequired > 0;
  const hasHabitats = stationComputed && stationComputed.totalWorkforceCapacity > 0;

  return (
    <div className="space-y-4">
      {/* Station Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Station Name
        </label>
        <input
          type="text"
          value={station.name}
          onChange={handleNameChange}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Sector Assignment */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Sector</label>
        <div className="text-sm text-muted-foreground">
          {sector ? sector.name : 'Not assigned'}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag the station into a sector to assign it.
        </p>
      </div>

      {/* Sunlight */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Sunlight Override
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={500}
            value={station.sunlightOverride ?? ''}
            onChange={handleSunlightChange}
            placeholder={`${sector?.sunlight ?? 100}`}
            className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">%</span>
          {station.sunlightOverride !== null && (
            <button
              onClick={handleClearSunlightOverride}
              className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
              title="Use sector default"
            >
              Reset
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Effective: {effectiveSunlight}%
          {station.sunlightOverride === null && sector && ' (from sector)'}
          {station.sunlightOverride === null && !sector && ' (default)'}
        </p>
      </div>

      {/* Workforce / Population Settings */}
      {(hasWorkforce || hasHabitats) && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Workforce
          </label>

          {stationComputed && (
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required:</span>
                <span>{stationComputed.totalWorkforceRequired.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span>{stationComputed.totalWorkforceCapacity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Population:</span>
                <span>{stationComputed.actualPopulation.toLocaleString()}</span>
              </div>
            </div>
          )}

          {hasHabitats && (
            <label className="flex items-center gap-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={station.fillHabitats ?? false}
                onChange={handleFillHabitatsChange}
                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm">Fill all habitat capacity</span>
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            {station.fillHabitats
              ? 'Population fills all habitats (idle workers consume food/medical).'
              : 'Population capped to production needs (no idle workers).'}
          </p>
        </div>
      )}

      {/* Module Summary */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Modules</label>
        <div className="text-sm text-muted-foreground">
          {station.modules.length === 0 ? (
            <p>No modules added yet.</p>
          ) : (
            <p>{station.modules.length} module(s)</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Double-click the station to add and configure modules.
        </p>
      </div>

      {/* I/O Summary */}
      {stationComputed &&
        (stationComputed.netOutputs.length > 0 ||
          stationComputed.netInputs.length > 0) && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              I/O Summary <span className="text-muted-foreground font-normal">(per hour)</span>
            </label>

            {stationComputed.netOutputs.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Outputs:</div>
                {stationComputed.netOutputs.slice(0, 5).map((item) => (
                  <div
                    key={item.wareId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-green-500 truncate">
                      {getWareName(item.wareId)}
                    </span>
                    <span className="font-mono">+{formatAmount(item.amount)}</span>
                  </div>
                ))}
                {stationComputed.netOutputs.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    +{stationComputed.netOutputs.length - 5} more...
                  </div>
                )}
              </div>
            )}

            {stationComputed.netInputs.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Inputs:</div>
                {stationComputed.netInputs.slice(0, 5).map((item) => (
                  <div
                    key={item.wareId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-blue-400 truncate">
                      {getWareName(item.wareId)}
                    </span>
                    <span className="font-mono">-{formatAmount(item.amount)}</span>
                  </div>
                ))}
                {stationComputed.netInputs.length > 5 && (
                  <div className="text-xs text-muted-foreground">
                    +{stationComputed.netInputs.length - 5} more...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Position info (debug) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Position</label>
        <div className="text-xs text-muted-foreground font-mono">
          x: {Math.round(station.position.x)}, y: {Math.round(station.position.y)}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 text-sm rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          Delete Station
        </button>
      </div>
    </div>
  );
}
