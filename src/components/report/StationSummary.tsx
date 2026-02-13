import { useMemo } from 'react';
import { usePlanStore, useGameDataStore } from '@/store';
import { getStationComputed, getStationDeficitCount } from '@/engine';
import { useLocale } from '@/hooks/useLocale';

export function StationSummary() {
  const stations = usePlanStore((state) => state.plan.stations);
  const sectors = usePlanStore((state) => state.plan.sectors);
  const computed = usePlanStore((state) => state.computed);
  const gameData = useGameDataStore((state) => state.gameData);
  const { t } = useLocale();

  // Get ware name helper
  const getWareName = (wareId: string): string => {
    return t(gameData?.wares[wareId]?.name, wareId);
  };

  // Format amount for display
  const formatAmount = (amount: number): string => {
    if (Math.abs(amount) >= 10000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    if (Math.abs(amount) >= 1000) {
      return `${(amount / 1000).toFixed(2)}k`;
    }
    return amount.toFixed(0);
  };

  // Get sector name for a station
  const getSectorName = (sectorId: string | null): string | null => {
    if (!sectorId) return null;
    return sectors.find((s) => s.id === sectorId)?.name ?? null;
  };

  // Sort stations by deficit count (most deficits first), then by name
  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => {
      const aDeficits = getStationDeficitCount(computed, a.id);
      const bDeficits = getStationDeficitCount(computed, b.id);
      if (aDeficits !== bDeficits) return bDeficits - aDeficits;
      return a.name.localeCompare(b.name);
    });
  }, [stations, computed]);

  if (stations.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No stations yet. Right-click on the canvas to add one.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedStations.map((station) => {
        const stationComputed = getStationComputed(computed, station.id);
        const deficitCount = getStationDeficitCount(computed, station.id);
        const sectorName = getSectorName(station.sectorId);

        // Get deficits for this station
        const stationDeficits = computed.deficits.filter(
          (d) => d.stationId === station.id
        );

        // Calculate workforce ratio
        const workforceRatio =
          stationComputed && stationComputed.totalWorkforceRequired > 0
            ? Math.min(
                stationComputed.actualPopulation / stationComputed.totalWorkforceRequired,
                1.0
              )
            : 0;

        return (
          <div
            key={station.id}
            className={`p-3 rounded-lg border ${
              deficitCount > 0
                ? 'border-red-500/50 bg-red-500/5'
                : 'border-border bg-card'
            }`}
          >
            {/* Station Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                  station.completed
                    ? 'bg-green-500 border-green-600 text-white'
                    : 'border-muted-foreground/30'
                }`}>
                  {station.completed && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 5.5L4 7.5L8 3" />
                    </svg>
                  )}
                </span>
                <h4 className={`font-medium ${station.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{station.name}</h4>
                {deficitCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                    {deficitCount} deficit{deficitCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {sectorName && (
                <span className="text-xs text-muted-foreground">{sectorName}</span>
              )}
            </div>

            {/* Station Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sunlight</span>
                <span className="text-yellow-500">
                  ☀ {stationComputed?.effectiveSunlight ?? 100}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Modules</span>
                <span className="text-foreground">{station.modules.length}</span>
              </div>
              {stationComputed && stationComputed.totalWorkforceRequired > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Workforce</span>
                    <span
                      className={
                        workforceRatio >= 1
                          ? 'text-green-400'
                          : workforceRatio >= 0.5
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }
                    >
                      {stationComputed.actualPopulation}/{stationComputed.totalWorkforceRequired}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="text-foreground">
                      {stationComputed.totalWorkforceCapacity}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* I/O Summary */}
            {stationComputed && (
              <div className="space-y-2">
                {/* Outputs */}
                {stationComputed.netOutputs.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">Outputs:</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {stationComputed.netOutputs.map((item) => (
                        <div key={item.wareId} className="text-xs flex items-center gap-1">
                          <span className="text-green-400">{getWareName(item.wareId)}</span>
                          <span className="font-mono text-green-400/70">
                            +{formatAmount(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inputs */}
                {stationComputed.netInputs.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">Inputs:</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {stationComputed.netInputs.map((item) => {
                        const hasDeficit = stationDeficits.some(
                          (d) => d.wareId === item.wareId
                        );
                        return (
                          <div key={item.wareId} className="text-xs flex items-center gap-1">
                            <span className={hasDeficit ? 'text-red-400' : 'text-blue-400'}>
                              {getWareName(item.wareId)}
                            </span>
                            <span
                              className={`font-mono ${
                                hasDeficit ? 'text-red-400/70' : 'text-blue-400/70'
                              }`}
                            >
                              -{formatAmount(item.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Deficit Details */}
                {stationDeficits.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-red-500/20">
                    <div className="text-[10px] text-red-400 mb-1">Unsupplied:</div>
                    <div className="space-y-1">
                      {stationDeficits.map((deficit) => (
                        <div
                          key={deficit.wareId}
                          className="text-xs flex items-center justify-between"
                        >
                          <span className="text-red-400">{getWareName(deficit.wareId)}</span>
                          <span className="text-muted-foreground">
                            {formatAmount(deficit.supplied)}/{formatAmount(deficit.required)}
                            <span className="text-red-400 ml-1">
                              (-{formatAmount(deficit.deficit)})
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No modules message */}
            {station.modules.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No modules configured
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
