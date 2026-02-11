import { memo, useMemo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { usePlanStore, useGameDataStore, useUIStore } from '@/store';
import { formatAmount } from '@/lib/format';
import { WareIORow, STATION_OUTPUT_PRESET, computeStatus, type IOStatus, type DragConfig } from './WareIORow';

export type StationOutputNodeData = Record<string, never>;

export type StationOutputNodeType = Node<StationOutputNodeData, 'stationOutput'>;

/** Generic handle ID for creating new exports */
export const STATION_OUTPUT_GENERIC_HANDLE = 'generic-export';

export const StationOutputNode = memo(function StationOutputNode({
  selected,
}: NodeProps<StationOutputNodeType>) {
  const activeStationId = useUIStore((state) => state.activeStationId);
  const computed = usePlanStore((state) => state.computed);
  const gameData = useGameDataStore((state) => state.gameData);
  const stations = usePlanStore((state) => state.plan.stations);
  const updateStation = usePlanStore((state) => state.updateStation);

  // Drag state for reordering
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  // Get the station data for ordering
  const station = useMemo(() => {
    if (!activeStationId) return undefined;
    return stations.find((s) => s.id === activeStationId);
  }, [stations, activeStationId]);

  // Get computed data for the active station
  const stationComputed = useMemo(() => {
    if (!activeStationId || !computed) return undefined;
    return computed.stations.find((s) => s.stationId === activeStationId);
  }, [computed, activeStationId]);

  // Get ware name helper (still needed for handle tooltip)
  const getWareName = (wareId: string): string => {
    return gameData?.wares[wareId]?.name ?? wareId;
  };

  // Get wares that are connected to Station Output (modules exporting)
  const stationOutputs = stationComputed?.stationOutputs ?? [];
  // Get wares being consumed by inter-station connections
  const externallyConsumed = stationComputed?.externallyConsumed ?? [];
  // Get remaining outputs available (after external consumption)
  const remainingOutputs = stationComputed?.remainingOutputs ?? [];

  // Only show connected wares (those with actual connections to Station Output)
  const connectedWares = useMemo(() => {
    const wareMap = new Map<string, { connected: number; consumed: number; remaining: number }>();

    // Add connected wares (what modules are exporting through Station Output)
    for (const item of stationOutputs) {
      const existing = wareMap.get(item.wareId) || { connected: 0, consumed: 0, remaining: 0 };
      existing.connected = item.amount;
      wareMap.set(item.wareId, existing);
    }

    // Add externally consumed amounts
    for (const item of externallyConsumed) {
      const existing = wareMap.get(item.wareId);
      if (existing) {
        existing.consumed = item.amount;
      }
    }

    // Add remaining amounts (still available from connected wares)
    for (const item of remainingOutputs) {
      const existing = wareMap.get(item.wareId);
      if (existing) {
        existing.remaining = item.amount;
      }
    }

    const items = Array.from(wareMap.entries()).map(([wareId, data]) => ({
      wareId,
      connected: data.connected,
      consumed: data.consumed,
      remaining: data.remaining,
    }));

    // Sort by custom order if available, otherwise by amount
    const orderArray = station?.outputOrder;
    if (orderArray && orderArray.length > 0) {
      const orderMap = new Map(orderArray.map((id, idx) => [id, idx]));
      items.sort((a, b) => {
        const aIdx = orderMap.get(a.wareId) ?? Infinity;
        const bIdx = orderMap.get(b.wareId) ?? Infinity;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return b.connected - a.connected;
      });
    } else {
      items.sort((a, b) => b.connected - a.connected);
    }

    return items;
  }, [stationOutputs, externallyConsumed, remainingOutputs, station?.outputOrder]);

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, wareId: string) => {
      e.stopPropagation();
      setDraggedItem(wareId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', wareId);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, wareId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedItem && draggedItem !== wareId) {
        setDragOverItem(wareId);
        e.dataTransfer.dropEffect = 'move';
      }
    },
    [draggedItem]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverItem(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetWareId: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedItem || !activeStationId) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      const sourceWareId = draggedItem;
      if (sourceWareId === targetWareId) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      const currentOrder = connectedWares.map((i) => i.wareId);
      const sourceIndex = currentOrder.indexOf(sourceWareId);
      const targetIndex = currentOrder.indexOf(targetWareId);

      if (sourceIndex === -1 || targetIndex === -1) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      const newOrder = [...currentOrder];
      newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, sourceWareId);

      updateStation(activeStationId, { outputOrder: newOrder });

      setDraggedItem(null);
      setDragOverItem(null);
    },
    [draggedItem, connectedWares, updateStation, activeStationId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItem(null);
  }, []);

  // Create drag config for a ware
  const createDragConfig = useCallback(
    (wareId: string): DragConfig => ({
      isDragging: draggedItem === wareId,
      isDragOver: dragOverItem === wareId,
      onDragStart: (e) => handleDragStart(e, wareId),
      onDragEnd: handleDragEnd,
      onDragOver: (e) => handleDragOver(e, wareId),
      onDragLeave: handleDragLeave,
      onDrop: (e) => handleDrop(e, wareId),
    }),
    [draggedItem, dragOverItem, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop]
  );

  // Render a single connected export row with its handle for edge connections
  const renderExportRow = (item: { wareId: string; connected: number; consumed: number; remaining: number }) => {
    const handleId = `input-${item.wareId}`;
    const status: IOStatus = computeStatus(item.remaining, item.consumed);

    // Build tooltip
    let amountTooltip: string;
    if (status === 'satisfied') {
      amountTooltip = `Exporting: ${formatAmount(item.connected)}, Consumed: ${formatAmount(item.consumed)}`;
    } else if (status === 'partial') {
      amountTooltip = `Exporting: ${formatAmount(item.connected)}, Consumed: ${formatAmount(item.consumed)}, Remaining: ${formatAmount(item.remaining)}`;
    } else {
      amountTooltip = `Exporting: ${formatAmount(item.connected)}, No external consumers`;
    }

    return (
      <WareIORow
        key={item.wareId}
        wareId={item.wareId}
        type="input"  // Uses target handle on left side
        handleId={handleId}
        amount={{
          primary: item.connected,
          secondary: item.consumed > 0.01 ? item.consumed : undefined,
          fulfilled: item.consumed,
        }}
        status={status}
        preset={STATION_OUTPUT_PRESET}
        drag={createDragConfig(item.wareId)}
        amountTooltip={amountTooltip}
        handleTooltip={`Export ${getWareName(item.wareId)}`}
      />
    );
  };

  return (
    <div
      className={`
        w-[200px] rounded-lg border-2 bg-card shadow-md
        ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-teal-500'}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-teal-500/10 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-base">📤</span>
          <h3 className="font-medium text-sm text-foreground">Station Output</h3>
        </div>
      </div>

      {/* Body - shows connected wares */}
      <div className="px-1 py-2">
        {connectedWares.length > 0 ? (
          <div className="space-y-0 pl-3">
            {connectedWares.map((item) => renderExportRow(item))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic px-2 py-1">
            No exports configured
          </p>
        )}
      </div>

      {/* Footer - connection zone */}
      <div className="relative px-2 py-1 border-t border-border/50 bg-muted/30 rounded-b-lg">
        <p className="text-[9px] text-muted-foreground text-center">
          ← Drag from module output
        </p>
        {/* Target handle covers footer for easy connections */}
        <Handle
          type="target"
          position={Position.Left}
          id={STATION_OUTPUT_GENERIC_HANDLE}
          className="!absolute !inset-0 !w-full !h-full !transform-none !rounded-b-lg !border-0 !bg-transparent !opacity-0"
          title="Drop a module output here to export that ware"
        />
      </div>
    </div>
  );
});
