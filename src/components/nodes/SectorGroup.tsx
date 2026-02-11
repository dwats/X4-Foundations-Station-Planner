import { memo, useCallback, useState } from 'react';
import {
  NodeResizer,
  type NodeProps,
  type Node,
  type ResizeParams,
} from '@xyflow/react';
import { usePlanStore } from '@/store';
import type { PlanSector } from '@/types';

export type SectorGroupData = {
  sector: PlanSector;
};

export type SectorGroupType = Node<SectorGroupData, 'sector'>;

// Approximate station dimensions for center calculation
const STATION_WIDTH = 160;
const STATION_HEIGHT = 100;

export const SectorGroup = memo(function SectorGroup({
  id,
  data,
  selected,
}: NodeProps<SectorGroupType>) {
  const { sector } = data;
  const updateSector = usePlanStore((state) => state.updateSector);
  const stations = usePlanStore((state) => state.plan.stations);
  const moveStationToSector = usePlanStore((state) => state.moveStationToSector);

  // Track hover state for showing resize handles
  const [isHovered, setIsHovered] = useState(false);

  // Handle live resize for visual feedback
  const onResize = useCallback(
    (_event: unknown, params: ResizeParams) => {
      updateSector(id, {
        position: { x: params.x, y: params.y },
        size: {
          width: params.width,
          height: params.height,
        },
      });
    },
    [id, updateSector]
  );

  // Handle resize end to re-evaluate station membership
  const onResizeEnd = useCallback(
    (_event: unknown, params: ResizeParams) => {
      // New sector bounds
      const newBounds = {
        left: params.x,
        right: params.x + params.width,
        top: params.y,
        bottom: params.y + params.height,
      };

      // Re-evaluate all stations' membership
      stations.forEach((station) => {
        // Calculate station center
        const centerX = station.position.x + STATION_WIDTH / 2;
        const centerY = station.position.y + STATION_HEIGHT / 2;

        // Check if station center is inside new bounds
        const isInside =
          centerX >= newBounds.left &&
          centerX <= newBounds.right &&
          centerY >= newBounds.top &&
          centerY <= newBounds.bottom;

        // Update membership if needed
        if (isInside && station.sectorId !== id) {
          // Station is now inside this sector - assign it
          moveStationToSector(station.id, id);
        } else if (!isInside && station.sectorId === id) {
          // Station was in this sector but is now outside - unassign it
          moveStationToSector(station.id, null);
        }
      });
    },
    [id, stations, moveStationToSector]
  );

  return (
    <div
      className="w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected || isHovered}
        lineClassName={selected ? '!border-primary' : '!border-muted-foreground/50'}
        handleClassName={`!w-2.5 !h-2.5 !border-2 !border-background ${
          selected ? '!bg-primary' : '!bg-muted-foreground'
        }`}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
      />
      <div
        className={`
          w-full h-full rounded-lg border-2 border-dashed
          ${selected ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'}
        `}
      >
        {/* Header */}
        <div
          className={`
            absolute -top-6 left-2 px-2 py-0.5 rounded text-xs font-medium
            ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}
        >
          {sector.name}
        </div>

        {/* Sunlight badge */}
        <div
          className={`
            absolute -top-6 right-2 px-2 py-0.5 rounded text-xs
            ${selected ? 'bg-yellow-500/20 text-yellow-600' : 'bg-muted text-muted-foreground'}
          `}
        >
          ☀ {sector.sunlight}%
        </div>

        {/* Empty state hint */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground/50">
            Drag stations here
          </p>
        </div>
      </div>
    </div>
  );
});
