import { memo, useCallback, useMemo, useState } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { usePlanStore, useUIStore } from '@/store';
import { getStationComputed, getStationDeficitCount } from '@/engine';
import { formatAmount } from '@/lib/format';
import type { PlanStation, ResourceAmount } from '@/types';
import { WareIORow, STATION_PRESET, computeStatus, type DragConfig, type IOStatus } from './WareIORow';

export type StationNodeData = {
  station: PlanStation;
};

export type StationNodeType = Node<StationNodeData, 'station'>;

export const StationNode = memo(function StationNode({
  data,
  selected,
}: NodeProps<StationNodeType>) {
  const { station } = data;
  const sectors = usePlanStore((state) => state.plan.sectors);
  const computed = usePlanStore((state) => state.computed);
  const updateStation = usePlanStore((state) => state.updateStation);
  const drillIntoStation = useUIStore((state) => state.drillIntoStation);

  // Drag state for reordering
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  // Find the sector this station belongs to
  const sector = station.sectorId
    ? sectors.find((s) => s.id === station.sectorId)
    : null;

  // Get computed data for this station
  const stationComputed = useMemo(
    () => getStationComputed(computed, station.id),
    [computed, station.id]
  );

  // Get deficit count
  const deficitCount = useMemo(
    () => getStationDeficitCount(computed, station.id),
    [computed, station.id]
  );

  // Calculate effective sunlight (use computed if available)
  const effectiveSunlight =
    stationComputed?.effectiveSunlight ??
    station.sunlightOverride ??
    sector?.sunlight ??
    100;

  // Handle double-click to drill into station module view
  const handleDoubleClick = useCallback(() => {
    drillIntoStation(station.id);
  }, [drillIntoStation, station.id]);

  // Calculate workforce ratio (based on actual population vs required)
  const workforceRatio =
    stationComputed && stationComputed.totalWorkforceRequired > 0
      ? Math.min(
          stationComputed.actualPopulation /
            stationComputed.totalWorkforceRequired,
          1.0
        )
      : 0;

  const hasWorkforce = stationComputed && stationComputed.totalWorkforceRequired > 0;

  // Get deficits for this station to highlight problematic inputs
  const stationDeficits = useMemo(() => {
    return computed.deficits.filter((d) => d.stationId === station.id);
  }, [computed.deficits, station.id]);

  const hasDeficit = (wareId: string) => {
    return stationDeficits.some((d) => d.wareId === wareId);
  };

  // Sort I/O items based on custom order or default computed order
  const sortItems = useCallback(
    (items: ResourceAmount[], orderArray?: string[]): ResourceAmount[] => {
      if (!orderArray || orderArray.length === 0) {
        return items;
      }

      // Create a map for quick lookup
      const itemMap = new Map(items.map((item) => [item.wareId, item]));

      // Build sorted array: first items in orderArray, then any new items not in order
      const sorted: ResourceAmount[] = [];
      const seen = new Set<string>();

      // Add items in custom order
      for (const wareId of orderArray) {
        const item = itemMap.get(wareId);
        if (item) {
          sorted.push(item);
          seen.add(wareId);
        }
      }

      // Add any items not in custom order (new items)
      for (const item of items) {
        if (!seen.has(item.wareId)) {
          sorted.push(item);
        }
      }

      return sorted;
    },
    []
  );

  // Get sorted outputs and inputs (using stationOutputs/stationInputs)
  // Shows what's connected for trade at the sector level
  const sortedOutputs = useMemo(() => {
    return sortItems(stationComputed?.stationOutputs ?? [], station.outputOrder);
  }, [stationComputed?.stationOutputs, station.outputOrder, sortItems]);

  const sortedInputs = useMemo(() => {
    return sortItems(stationComputed?.stationInputs ?? [], station.inputOrder);
  }, [stationComputed?.stationInputs, station.inputOrder, sortItems]);

  // Create lookup maps for external supply/consumption status
  const externallySuppliedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of stationComputed?.externallySupplied ?? []) {
      map.set(item.wareId, item.amount);
    }
    return map;
  }, [stationComputed?.externallySupplied]);

  const externallyConsumedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of stationComputed?.externallyConsumed ?? []) {
      map.set(item.wareId, item.amount);
    }
    return map;
  }, [stationComputed?.externallyConsumed]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, wareId: string, type: 'input' | 'output') => {
      e.stopPropagation();
      setDraggedItem(`${type}-${wareId}`);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `${type}-${wareId}`);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, wareId: string, type: 'input' | 'output') => {
      e.preventDefault();
      e.stopPropagation();
      const itemKey = `${type}-${wareId}`;
      if (draggedItem && draggedItem !== itemKey && draggedItem.startsWith(type)) {
        setDragOverItem(itemKey);
        e.dataTransfer.dropEffect = 'move';
      }
    },
    [draggedItem]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverItem(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetWareId: string, type: 'input' | 'output') => {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedItem || !draggedItem.startsWith(type)) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      const sourceWareId = draggedItem.replace(`${type}-`, '');
      if (sourceWareId === targetWareId) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      // Get current items and order
      const items = type === 'output' ? sortedOutputs : sortedInputs;
      const currentOrder = items.map((i) => i.wareId);

      // Find positions
      const sourceIndex = currentOrder.indexOf(sourceWareId);
      const targetIndex = currentOrder.indexOf(targetWareId);

      if (sourceIndex === -1 || targetIndex === -1) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      // Reorder
      const newOrder = [...currentOrder];
      newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, sourceWareId);

      // Update station
      if (type === 'output') {
        updateStation(station.id, { outputOrder: newOrder });
      } else {
        updateStation(station.id, { inputOrder: newOrder });
      }

      setDraggedItem(null);
      setDragOverItem(null);
    },
    [draggedItem, sortedOutputs, sortedInputs, updateStation, station.id]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItem(null);
  }, []);

  // Create drag config for a ware item
  const createDragConfig = useCallback(
    (wareId: string, type: 'input' | 'output'): DragConfig => {
      const handleId = `${type}-${wareId}`;
      return {
        isDragging: draggedItem === handleId,
        isDragOver: dragOverItem === handleId,
        onDragStart: (e) => handleDragStart(e, wareId, type),
        onDragEnd: handleDragEnd,
        onDragOver: (e) => handleDragOver(e, wareId, type),
        onDragLeave: handleDragLeave,
        onDrop: (e) => handleDrop(e, wareId, type),
      };
    },
    [draggedItem, dragOverItem, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop]
  );

  // Render a single I/O row with its handle
  const renderIORow = (item: ResourceAmount, type: 'input' | 'output') => {
    const isInput = type === 'input';
    const handleId = `${type}-${item.wareId}`;
    const isDeficit = isInput && hasDeficit(item.wareId);

    // Get external supply/consumption amounts
    const supplied = isInput ? externallySuppliedMap.get(item.wareId) ?? 0 : 0;
    const consumed = !isInput ? externallyConsumedMap.get(item.wareId) ?? 0 : 0;
    const fulfilled = isInput ? supplied : consumed;
    const remaining = item.amount - fulfilled;

    // Compute status
    const status: IOStatus = computeStatus(remaining, fulfilled);

    // Build tooltip
    const tooltipLabel = isInput ? 'Need' : 'Export';
    const fulfilledLabel = isInput ? 'Supplied' : 'Consumed';
    let amountTooltip: string;
    if (status === 'satisfied') {
      amountTooltip = `${tooltipLabel}: ${formatAmount(item.amount)}, ${fulfilledLabel}: ${formatAmount(fulfilled)}`;
    } else if (status === 'partial') {
      amountTooltip = `${tooltipLabel}: ${formatAmount(item.amount)}, ${fulfilledLabel}: ${formatAmount(fulfilled)}, Remaining: ${formatAmount(remaining)}`;
    } else {
      amountTooltip = `${tooltipLabel}: ${formatAmount(item.amount)}, No external ${isInput ? 'supply' : 'consumers'}`;
    }

    return (
      <WareIORow
        key={item.wareId}
        wareId={item.wareId}
        type={type}
        handleId={handleId}
        amount={{
          primary: item.amount,
          secondary: fulfilled > 0.01 ? fulfilled : undefined,
          fulfilled,
        }}
        status={status}
        preset={STATION_PRESET}
        isDeficit={isDeficit}
        drag={createDragConfig(item.wareId, type)}
        amountTooltip={amountTooltip}
      />
    );
  };

  return (
    <div
      className={`
        min-w-[200px] max-w-[200px] rounded-lg border-2 bg-card shadow-md cursor-pointer relative
        ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
        ${deficitCount > 0 ? 'border-red-500/50' : ''}
      `}
      onDoubleClick={handleDoubleClick}
    >
      {/* Deficit warning badge */}
      {deficitCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md z-10">
          {deficitCount}
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-sm text-foreground truncate flex-1">
            {station.name}
          </h3>
          {/* Sector badge */}
          {sector && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary truncate max-w-[60px]">
              {sector.name}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1.5">
        {/* Sunlight indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sunlight</span>
          <span className="text-foreground flex items-center gap-1">
            <span className="text-yellow-500">☀</span>
            {effectiveSunlight}%
            {station.sunlightOverride === null && sector && (
              <span className="text-muted-foreground text-[10px]">(sector)</span>
            )}
          </span>
        </div>

        {/* Workforce bar */}
        {hasWorkforce && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Population</span>
              <span className="text-foreground text-[10px]">
                {stationComputed.actualPopulation}/
                {stationComputed.totalWorkforceRequired}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  workforceRatio >= 1
                    ? 'bg-green-500'
                    : workforceRatio >= 0.5
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${workforceRatio * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Module count */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Modules</span>
          <span className="text-foreground">{station.modules.length}</span>
        </div>

        {/* I/O Summary with per-ware handles (shows what's connected for external trade) */}
        {stationComputed &&
          (stationComputed.stationInputs.length > 0 ||
            stationComputed.stationOutputs.length > 0) && (
            <div className="pt-1.5 mt-1 border-t border-border/50 space-y-2">
              {/* Outputs first (what we produce) */}
              {sortedOutputs.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    Outputs <span className="opacity-60">/hr</span>:
                  </div>
                  <div className="space-y-0 pr-2">
                    {sortedOutputs.map((item) => renderIORow(item, 'output'))}
                  </div>
                </div>
              )}

              {/* Inputs (what we need) */}
              {sortedInputs.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    Inputs <span className="opacity-60">/hr</span>:
                  </div>
                  <div className="space-y-0 pl-2">
                    {sortedInputs.map((item) => renderIORow(item, 'input'))}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* No modules message */}
        {station.modules.length === 0 && (
          <div className="pt-1 mt-1 border-t border-border/50">
            <p className="text-xs text-muted-foreground italic">
              Double-click to add modules
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
