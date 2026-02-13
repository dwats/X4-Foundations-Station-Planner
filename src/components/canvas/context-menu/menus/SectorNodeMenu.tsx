import { usePlanStore, useUIStore } from '@/store';
import { MenuButton } from '../items/MenuButton';
import { MenuSeparator } from '../items/MenuSeparator';
import { InlineInput } from '../items/InlineInput';
import { SectorNamePicker } from '../items/SectorNamePicker';

interface SectorNodeMenuProps {
  nodeId: string;
}

export function SectorNodeMenu({ nodeId }: SectorNodeMenuProps) {
  const plan = usePlanStore((state) => state.plan);
  const updateSector = usePlanStore((state) => state.updateSector);
  const removeSector = usePlanStore((state) => state.removeSector);
  const addStation = usePlanStore((state) => state.addStation);
  const moveStationToSector = usePlanStore((state) => state.moveStationToSector);
  const contextMenu = useUIStore((state) => state.contextMenu);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const clearSelection = useUIStore((state) => state.clearSelection);

  const sector = plan.sectors.find((s) => s.id === nodeId);
  if (!sector) return null;

  const stationsInSector = plan.stations.filter((s) => s.sectorId === nodeId);

  return (
    <>
      <SectorNamePicker
        value={sector.name}
        onSelect={(name, sunlight) => {
          const patch: Record<string, unknown> = { name };
          if (sunlight !== undefined) {
            patch.sunlight = sunlight;
          }
          updateSector(nodeId, patch);
        }}
      />
      <InlineInput
        label="Sunlight"
        value={sector.sunlight}
        type="number"
        min={0}
        max={500}
        onSubmit={(val) => {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num >= 0) updateSector(nodeId, { sunlight: num });
        }}
      />
      <MenuSeparator />
      <MenuButton
        label="Create Station in Sector"
        icon="+"
        onClick={() => {
          const position = contextMenu?.flowPosition ?? {
            x: sector.position.x + 50,
            y: sector.position.y + 80,
          };
          const stationName = `Station ${plan.stations.length + 1}`;
          addStation(stationName, position);
          // Move the new station into this sector
          const newStationId = usePlanStore.getState().plan.stations.at(-1)?.id;
          if (newStationId) {
            moveStationToSector(newStationId, nodeId);
          }
          closeContextMenu();
        }}
      />
      <MenuButton
        label={sector.locked ? 'Unlock Position' : 'Lock Position'}
        icon={sector.locked ? '🔓' : '🔒'}
        onClick={() => {
          updateSector(nodeId, { locked: !sector.locked });
          closeContextMenu();
        }}
      />
      <MenuSeparator />
      <MenuButton
        label="Delete Sector"
        icon="×"
        variant="destructive"
        onClick={() => {
          if (stationsInSector.length > 0) {
            if (!confirm(`This sector contains ${stationsInSector.length} station(s). They will be unassigned. Continue?`)) {
              return;
            }
          }
          removeSector(nodeId);
          clearSelection();
          closeContextMenu();
        }}
      />
    </>
  );
}
