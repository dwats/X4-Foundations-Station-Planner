import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { usePlanStore, useUIStore } from '@/store';
import { MenuButton } from '../items/MenuButton';

export function NetworkPaneMenu() {
  const { screenToFlowPosition } = useReactFlow();
  const contextMenu = useUIStore((state) => state.contextMenu);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const plan = usePlanStore((state) => state.plan);
  const addStation = usePlanStore((state) => state.addStation);
  const addSector = usePlanStore((state) => state.addSector);

  const handleAddStation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!contextMenu) return;
      const position = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y });
      addStation(`Station ${plan.stations.length + 1}`, position);
      closeContextMenu();
    },
    [screenToFlowPosition, contextMenu, plan.stations.length, addStation, closeContextMenu]
  );

  const handleAddSector = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!contextMenu) return;
      const position = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y });
      addSector(`Sector ${plan.sectors.length + 1}`, position);
      closeContextMenu();
    },
    [screenToFlowPosition, contextMenu, plan.sectors.length, addSector, closeContextMenu]
  );

  return (
    <>
      <MenuButton label="Add Station" icon="+" onClick={handleAddStation} />
      <MenuButton label="Add Sector" icon="□" onClick={handleAddSector} />
    </>
  );
}
