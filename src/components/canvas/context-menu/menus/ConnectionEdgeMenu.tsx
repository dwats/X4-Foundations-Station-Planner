import { usePlanStore, useUIStore, useGameDataStore } from '@/store';
import { useLocale } from '@/hooks/useLocale';
import { MenuButton } from '../items/MenuButton';
import { MenuSeparator } from '../items/MenuSeparator';
import { InlineSelect } from '../items/InlineSelect';
import type { ConnectionMode } from '@/types';

interface ConnectionEdgeMenuProps {
  edgeId: string;
  viewMode: 'network' | 'station';
}

const MODE_OPTIONS = [
  { value: 'auto', label: 'Auto (match availability)' },
  { value: 'max', label: 'Max (take all available)' },
  { value: 'custom', label: 'Custom (fixed amount)' },
];

export function ConnectionEdgeMenu({ edgeId, viewMode }: ConnectionEdgeMenuProps) {
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const activeStationId = useUIStore((state) => state.activeStationId);
  const plan = usePlanStore((state) => state.plan);
  const updateConnection = usePlanStore((state) => state.updateConnection);
  const removeConnection = usePlanStore((state) => state.removeConnection);
  const updateModuleConnection = usePlanStore((state) => state.updateModuleConnection);
  const removeModuleConnection = usePlanStore((state) => state.removeModuleConnection);
  const gameData = useGameDataStore((state) => state.gameData);
  const { t } = useLocale();

  if (viewMode === 'network') {
    const connection = plan.connections.find((c) => c.id === edgeId);
    if (!connection) return null;

    const wareName = connection.wareId
      ? t(gameData?.wares[connection.wareId]?.name, connection.wareId)
      : 'Unknown';

    return (
      <>
        <div className="px-3 py-1.5 text-xs text-muted-foreground truncate">
          {wareName}
        </div>
        <InlineSelect
          label="Mode"
          value={connection.mode ?? 'auto'}
          options={MODE_OPTIONS}
          onChange={(mode) => updateConnection(connection.id, { mode: mode as ConnectionMode })}
        />
        <MenuSeparator />
        <MenuButton
          label="Delete Connection"
          icon="×"
          variant="destructive"
          onClick={() => {
            removeConnection(connection.id);
            clearSelection();
            closeContextMenu();
          }}
        />
      </>
    );
  }

  // Station view - module connection
  if (!activeStationId) return null;
  const station = plan.stations.find((s) => s.id === activeStationId);
  const connection = (station?.moduleConnections ?? []).find((c) => c.id === edgeId);
  if (!connection) return null;

  const wareName = t(gameData?.wares[connection.wareId]?.name, connection.wareId);

  return (
    <>
      <div className="px-3 py-1.5 text-xs text-muted-foreground truncate">
        {wareName}
      </div>
      <InlineSelect
        label="Mode"
        value={connection.mode ?? 'auto'}
        options={MODE_OPTIONS}
        onChange={(mode) =>
          updateModuleConnection(activeStationId, connection.id, { mode: mode as ConnectionMode })
        }
      />
      <div className="px-3 py-1.5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-muted-foreground">Lock Amount</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateModuleConnection(activeStationId, connection.id, {
              locked: !connection.locked,
            });
          }}
          className={`w-10 h-5 rounded-full transition-colors ${
            connection.locked ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
              connection.locked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <MenuSeparator />
      <MenuButton
        label="Delete Connection"
        icon="×"
        variant="destructive"
        onClick={() => {
          removeModuleConnection(activeStationId, connection.id);
          clearSelection();
          closeContextMenu();
        }}
      />
    </>
  );
}
