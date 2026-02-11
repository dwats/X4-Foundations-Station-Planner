import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { usePlanStore, useUIStore } from '@/store';

interface ContextMenuProps {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const plan = usePlanStore((state) => state.plan);
  const addStation = usePlanStore((state) => state.addStation);
  const addSector = usePlanStore((state) => state.addSector);
  const removeStation = usePlanStore((state) => state.removeStation);
  const removeSector = usePlanStore((state) => state.removeSector);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const clearSelection = useUIStore((state) => state.clearSelection);

  // Determine what's selected
  const selectedStation = plan.stations.find((s) => s.id === selectedNodeId);
  const selectedSector = plan.sectors.find((s) => s.id === selectedNodeId);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddStation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const position = screenToFlowPosition({ x, y });
      const stationCount = plan.stations.length;
      addStation(`Station ${stationCount + 1}`, position);
      onClose();
    },
    [screenToFlowPosition, x, y, plan.stations.length, addStation, onClose]
  );

  const handleAddSector = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const position = screenToFlowPosition({ x, y });
      const sectorCount = plan.sectors.length;
      addSector(`Sector ${sectorCount + 1}`, position);
      onClose();
    },
    [screenToFlowPosition, x, y, plan.sectors.length, addSector, onClose]
  );

  const handleDeleteStation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedStation) {
        removeStation(selectedStation.id);
        clearSelection();
      }
      onClose();
    },
    [selectedStation, removeStation, clearSelection, onClose]
  );

  const handleDeleteSector = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedSector) {
        removeSector(selectedSector.id);
        clearSelection();
      }
      onClose();
    },
    [selectedSector, removeSector, clearSelection, onClose]
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-md border border-border bg-popover shadow-lg"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-1">
        {/* Add actions */}
        <button
          onClick={handleAddStation}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded hover:bg-accent transition-colors text-left"
        >
          <span className="text-lg leading-none">+</span>
          Add Station
        </button>
        <button
          onClick={handleAddSector}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded hover:bg-accent transition-colors text-left"
        >
          <span className="text-lg leading-none">□</span>
          Add Sector
        </button>

        {/* Delete actions */}
        {selectedStation && (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={handleDeleteStation}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded hover:bg-destructive/10 transition-colors text-left"
            >
              <span className="text-lg leading-none">×</span>
              Delete Station
            </button>
          </>
        )}

        {selectedSector && (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={handleDeleteSector}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded hover:bg-destructive/10 transition-colors text-left"
            >
              <span className="text-lg leading-none">×</span>
              Delete Sector
            </button>
          </>
        )}
      </div>
    </div>
  );
}
