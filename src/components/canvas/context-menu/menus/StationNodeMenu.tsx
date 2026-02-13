import { usePlanStore, useUIStore } from '@/store';
import { MenuButton } from '../items/MenuButton';
import { MenuSeparator } from '../items/MenuSeparator';
import { InlineInput } from '../items/InlineInput';

interface StationNodeMenuProps {
  nodeId: string;
}

export function StationNodeMenu({ nodeId }: StationNodeMenuProps) {
  const stations = usePlanStore((state) => state.plan.stations);
  const updateStation = usePlanStore((state) => state.updateStation);
  const removeStation = usePlanStore((state) => state.removeStation);
  const drillIntoStation = useUIStore((state) => state.drillIntoStation);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const clearSelection = useUIStore((state) => state.clearSelection);

  const station = stations.find((s) => s.id === nodeId);
  if (!station) return null;

  return (
    <>
      <MenuButton
        label="Open Station"
        onClick={() => {
          drillIntoStation(nodeId);
        }}
      />
      <MenuSeparator />
      <InlineInput
        label="Change Name"
        value={station.name}
        onSubmit={(val) => {
          if (val.trim()) updateStation(nodeId, { name: val.trim() });
        }}
      />
      <InlineInput
        label="Sunlight Override"
        value={station.sunlightOverride ?? ''}
        type="number"
        min={0}
        max={500}
        onSubmit={(val) => {
          const num = parseInt(val, 10);
          updateStation(nodeId, {
            sunlightOverride: isNaN(num) ? undefined : num,
          });
        }}
      />
      <MenuButton
        label={station.locked ? 'Unlock Position' : 'Lock Position'}
        icon={station.locked ? '🔓' : '🔒'}
        onClick={() => {
          updateStation(nodeId, { locked: !station.locked });
          closeContextMenu();
        }}
      />
      <MenuSeparator />
      <MenuButton
        label="Delete Station"
        icon="×"
        variant="destructive"
        onClick={() => {
          removeStation(nodeId);
          clearSelection();
          closeContextMenu();
        }}
      />
    </>
  );
}
