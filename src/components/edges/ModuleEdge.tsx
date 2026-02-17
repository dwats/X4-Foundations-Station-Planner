import { memo, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { usePlanStore, useUIStore } from '@/store';
import { getStationComputed } from '@/engine';
import type { PlanModuleConnection } from '@/types';

export type ModuleEdgeData = {
  connection: PlanModuleConnection;
  /** Opaque key that changes when ware order changes, forcing edge re-render */
  _orderVersion?: string;
};

export type ModuleEdgeType = Edge<ModuleEdgeData, 'module'>;

export const ModuleEdge = memo(function ModuleEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<ModuleEdgeType>) {
  const connection = data?.connection;
  const computed = usePlanStore((state) => state.computed);
  const activeStationId = useUIStore((state) => state.activeStationId);

  // Get computed data for this connection
  const connectionComputed = useMemo(() => {
    if (!connection || !activeStationId) return undefined;
    const stationComputed = getStationComputed(computed, activeStationId);
    return stationComputed?.moduleConnections.find((c) => c.connectionId === connection.id);
  }, [computed, activeStationId, connection]);

  // Get edge path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Format amount
  const formatAmount = (amount: number): string => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toFixed(0);
  };

  // Module edges are orange, or yellow if source-constrained
  const edgeColor = connectionComputed?.sourceConstrained ? '#ff6666' : '#88bb88';
  const effectiveAmount = connectionComputed?.effectiveAmount ?? connection?.amount ?? 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: connection?.wareId ? undefined : '5,5',
        }}
      />
      {/* Show amount label */}
      {connection?.wareId && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`
              px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium
              bg-background/90 border
              ${connectionComputed?.sourceConstrained ? 'border-yellow-500' : 'border-orange-500/50'}
              ${selected ? 'ring-2 ring-primary' : ''}
              transition-all cursor-pointer
            `}
            title={
              connection.mode === 'custom'
                ? `Custom: ${formatAmount(connection.amount)}, Actual: ${formatAmount(effectiveAmount)}`
                : `${connection.mode ?? 'auto'}: ${formatAmount(effectiveAmount)}`
            }
          >
            {formatAmount(effectiveAmount)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
