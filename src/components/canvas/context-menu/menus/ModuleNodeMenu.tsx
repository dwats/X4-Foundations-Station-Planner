import { useMemo } from 'react';
import { useGameDataStore, usePlanStore, useUIStore } from '@/store';
import { useLocale } from '@/hooks/useLocale';
import { MenuButton } from '../items/MenuButton';
import { MenuSeparator } from '../items/MenuSeparator';
import { CountAdjuster } from '../items/CountAdjuster';
import { InlineSelect } from '../items/InlineSelect';

interface ModuleNodeMenuProps {
  nodeId: string;
}

export function ModuleNodeMenu({ nodeId }: ModuleNodeMenuProps) {
  const activeStationId = useUIStore((state) => state.activeStationId);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const stations = usePlanStore((state) => state.plan.stations);
  const updateModule = usePlanStore((state) => state.updateModule);
  const removeModule = usePlanStore((state) => state.removeModule);
  const gameData = useGameDataStore((state) => state.gameData);
  const getModuleType = useGameDataStore((state) => state.getModuleType);
  const { t } = useLocale();

  const station = stations.find((s) => s.id === activeStationId);
  const module = station?.modules.find((m) => m.id === nodeId);
  const moduleType = module ? getModuleType(module.blueprintId) : null;

  // Get available blueprints for this module type
  const blueprintOptions = useMemo(() => {
    if (!gameData || !moduleType) return [];
    const modules = gameData.modules[moduleType];
    return Object.values(modules)
      .sort((a, b) => t(a.name).localeCompare(t(b.name)))
      .map((m) => ({ value: m.id, label: t(m.name) }));
  }, [gameData, moduleType, t]);

  if (!station || !module || !activeStationId) return null;

  return (
    <>
      <CountAdjuster
        label="Amount"
        value={module.count}
        min={1}
        onChange={(count) => updateModule(activeStationId, module.id, { count })}
      />
      {moduleType === 'production' && blueprintOptions.length > 1 && (
        <InlineSelect
          label="Blueprint"
          value={module.blueprintId}
          options={blueprintOptions}
          onChange={(blueprintId) => updateModule(activeStationId, module.id, { blueprintId })}
        />
      )}
      <MenuSeparator />
      <MenuButton
        label="Delete Module"
        icon="×"
        variant="destructive"
        onClick={() => {
          removeModule(activeStationId, module.id);
          clearSelection();
          closeContextMenu();
        }}
      />
    </>
  );
}
