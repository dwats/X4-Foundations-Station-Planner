import { memo, useMemo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';
import { usePlanStore } from '@/store';
import { getConnectionComputed } from '@/engine';
import type { PlanConnection } from '@/types';

export type ResourceEdgeData = {
  connection: PlanConnection;
};

export type ResourceEdgeType = Edge<ResourceEdgeData, 'resource'>;

export const ResourceEdge = memo(function ResourceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<ResourceEdgeType>) {
  const computed = usePlanStore((state) => state.computed);

  const connection = data?.connection;

  // Get computed data for this connection (includes effective amount)
  const connectionComputed = useMemo(() => {
    if (!connection) return undefined;
    return getConnectionComputed(computed, connection.id);
  }, [computed, connection]);

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

  // Check if this connection is fully supplying the target's needs
  const deficit = computed.deficits.find(
    (d) =>
      d.stationId === connection?.targetStationId &&
      d.wareId === connection?.wareId
  );

  // Determine edge color based on fulfillment status
  let edgeColor = '#64748b'; // Default gray

  if (!connection?.wareId) {
    edgeColor = '#ef4444'; // Red - not configured
  } else if (deficit) {
    const fulfillmentRatio = deficit.supplied / deficit.required;
    if (fulfillmentRatio >= 0.8) {
      edgeColor = '#eab308'; // Yellow - mostly fulfilled
    } else {
      edgeColor = '#f97316'; // Orange - partially fulfilled
    }
  } else {
    edgeColor = '#22c55e'; // Green - fully fulfilled
  }

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
      {/* Only show label with amount - ware is indicated by handle position */}
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
              bg-background/90 border border-border
              ${selected ? 'ring-2 ring-primary' : ''}
              ${connectionComputed?.sourceConstrained ? 'border-orange-500' : ''}
              transition-all cursor-pointer
            `}
            title={
              connection.mode === 'custom'
                ? `Custom: ${formatAmount(connection.amount)}, Actual: ${formatAmount(connectionComputed?.effectiveAmount ?? 0)}`
                : `Auto: ${formatAmount(connectionComputed?.effectiveAmount ?? 0)}`
            }
          >
            {formatAmount(connectionComputed?.effectiveAmount ?? 0)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
