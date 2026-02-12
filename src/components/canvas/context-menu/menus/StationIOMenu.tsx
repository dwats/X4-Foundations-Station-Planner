import { usePlanStore, useUIStore } from '@/store';
import { MenuButton } from '../items/MenuButton';
import { STATION_INPUT_ID, STATION_OUTPUT_ID } from '@/types/plan';

interface StationIOMenuProps {
  nodeId: string;
}

export function StationIOMenu({ nodeId }: StationIOMenuProps) {
  const activeStationId = useUIStore((state) => state.activeStationId);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const stations = usePlanStore((state) => state.plan.stations);
  const removeModuleConnection = usePlanStore((state) => state.removeModuleConnection);

  const station = stations.find((s) => s.id === activeStationId);
  if (!station || !activeStationId) return null;

  const connections = station.moduleConnections ?? [];
  const isInput = nodeId === STATION_INPUT_ID;
  const label = isInput ? 'Station Input' : 'Station Output';

  // Find all connections involving this I/O node
  const relatedConnections = connections.filter((c) =>
    isInput
      ? c.sourceModuleId === STATION_INPUT_ID
      : c.targetModuleId === STATION_OUTPUT_ID
  );

  return (
    <>
      <div className="px-3 py-1.5 text-xs text-muted-foreground">
        {label} — {relatedConnections.length} connection{relatedConnections.length !== 1 ? 's' : ''}
      </div>
      <MenuButton
        label="Reset (clear all connections)"
        variant="destructive"
        onClick={() => {
          relatedConnections.forEach((c) => {
            removeModuleConnection(activeStationId, c.id);
          });
          closeContextMenu();
        }}
      />
    </>
  );
}
