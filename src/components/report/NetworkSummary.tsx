import { useMemo } from 'react';
import { usePlanStore, useGameDataStore } from '@/store';
import type { ResourceAmount } from '@/types';

export function NetworkSummary() {
  const computed = usePlanStore((state) => state.computed);
  const gameData = useGameDataStore((state) => state.gameData);

  // Get ware name helper
  const getWareName = (wareId: string): string => {
    return gameData?.wares[wareId]?.name ?? wareId;
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

  // Calculate net resources (outputs - inputs)
  const netResources = useMemo(() => {
    const resourceMap = new Map<string, number>();

    // Add outputs as positive
    for (const output of computed.totalOutputs) {
      resourceMap.set(output.wareId, (resourceMap.get(output.wareId) ?? 0) + output.amount);
    }

    // Subtract inputs
    for (const input of computed.totalInputs) {
      resourceMap.set(input.wareId, (resourceMap.get(input.wareId) ?? 0) - input.amount);
    }

    // Convert to sorted array
    const result: ResourceAmount[] = [];
    for (const [wareId, amount] of resourceMap) {
      if (Math.abs(amount) > 0.01) {
        result.push({ wareId, amount });
      }
    }

    // Sort by amount (surpluses first, then deficits)
    return result.sort((a, b) => b.amount - a.amount);
  }, [computed.totalOutputs, computed.totalInputs]);

  // Separate surpluses and deficits
  const surpluses = netResources.filter((r) => r.amount > 0);
  const deficits = netResources.filter((r) => r.amount < 0);

  // Sort inputs and outputs by amount
  const sortedOutputs = useMemo(() => {
    return [...computed.totalOutputs].sort((a, b) => b.amount - a.amount);
  }, [computed.totalOutputs]);

  const sortedInputs = useMemo(() => {
    return [...computed.totalInputs].sort((a, b) => b.amount - a.amount);
  }, [computed.totalInputs]);

  return (
    <div className="space-y-6">
      {/* Net Summary */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3">Net Balance</h3>

        {surpluses.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs text-muted-foreground mb-2">Surpluses (available for export)</h4>
            <div className="space-y-1">
              {surpluses.map((item) => (
                <div key={item.wareId} className="flex items-center justify-between text-sm">
                  <span className="text-green-400">{getWareName(item.wareId)}</span>
                  <span className="font-mono text-green-400">+{formatAmount(item.amount)}/hr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {deficits.length > 0 && (
          <div>
            <h4 className="text-xs text-muted-foreground mb-2">Deficits (need import)</h4>
            <div className="space-y-1">
              {deficits.map((item) => (
                <div key={item.wareId} className="flex items-center justify-between text-sm">
                  <span className="text-red-400">{getWareName(item.wareId)}</span>
                  <span className="font-mono text-red-400">{formatAmount(item.amount)}/hr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {surpluses.length === 0 && deficits.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No resources tracked yet. Add modules to stations.
          </p>
        )}
      </section>

      {/* Total Outputs */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Total Production
          <span className="text-muted-foreground font-normal ml-2">({sortedOutputs.length} wares)</span>
        </h3>
        {sortedOutputs.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sortedOutputs.map((item) => (
              <div key={item.wareId} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{getWareName(item.wareId)}</span>
                <span className="font-mono text-green-400">+{formatAmount(item.amount)}/hr</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No production yet.</p>
        )}
      </section>

      {/* Total Inputs */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Total Consumption
          <span className="text-muted-foreground font-normal ml-2">({sortedInputs.length} wares)</span>
        </h3>
        {sortedInputs.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sortedInputs.map((item) => (
              <div key={item.wareId} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{getWareName(item.wareId)}</span>
                <span className="font-mono text-blue-400">-{formatAmount(item.amount)}/hr</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No consumption yet.</p>
        )}
      </section>

      {/* Deficit Warnings */}
      {computed.deficits.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-red-400 mb-3">
            Unsupplied Inputs ({computed.deficits.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {computed.deficits.map((deficit, index) => (
              <div
                key={`${deficit.stationId}-${deficit.wareId}-${index}`}
                className="p-2 rounded bg-red-500/10 border border-red-500/30"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-400">{getWareName(deficit.wareId)}</span>
                  <span className="font-mono text-red-400">
                    -{formatAmount(deficit.deficit)}/hr
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Needs {formatAmount(deficit.required)}, getting {formatAmount(deficit.supplied)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
