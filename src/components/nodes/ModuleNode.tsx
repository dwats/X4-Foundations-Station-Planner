import { memo, useCallback, useMemo, useState } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { usePlanStore, useGameDataStore, useUIStore } from '@/store';
import { useLocale } from '@/hooks/useLocale';
import { getModuleComputed } from '@/engine';
import { formatAmount } from '@/lib/format';
import type { PlanModule, ResourceAmount } from '@/types';
import { WareIORow, MODULE_PRESET, type DragConfig } from './WareIORow';
import './nodes.css';

export type ModuleNodeData = {
  module: PlanModule;
  onWareDoubleClick?: (wareId: string, moduleId: string, type: 'input' | 'output') => void;
};

export type ModuleNodeType = Node<ModuleNodeData, 'module'>;

// Icons for module types
const MODULE_ICONS: Record<string, string> = {
  production: '🏭',
  habitat: '🏠',
  storage: '📦',
};

// Colors for module types
const MODULE_COLORS: Record<string, { border: string; bg: string }> = {
  production: { border: 'border-orange-400', bg: 'bg-orange-500/10' },
  habitat: { border: 'border-green-500', bg: 'bg-green-500/10' },
  storage: { border: 'border-blue-500', bg: 'bg-blue-500/10' },
};

export const ModuleNode = memo(function ModuleNode({
  data,
  selected,
}: NodeProps<ModuleNodeType>) {
  const { module, onWareDoubleClick } = data;
  const activeStationId = useUIStore((state) => state.activeStationId);
  const computed = usePlanStore((state) => state.computed);
  const updateModule = usePlanStore((state) => state.updateModule);
  const getModule = useGameDataStore((state) => state.getModule);
  const getModuleType = useGameDataStore((state) => state.getModuleType);
  const gameData = useGameDataStore((state) => state.gameData);
  const { t } = useLocale();

  // Drag state for reordering I/O items
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  // State for showing full production (gross I/O)
  const [showGross, setShowGross] = useState(false);

  const blueprint = getModule(module.blueprintId);
  const moduleType = getModuleType(module.blueprintId) ?? 'production';
  const colors = MODULE_COLORS[moduleType] ?? MODULE_COLORS.production;
  const icon = MODULE_ICONS[moduleType] ?? '📦';

  // Get computed data for this module
  const moduleComputed = useMemo(() => {
    if (!activeStationId) return undefined;
    return getModuleComputed(computed, activeStationId, module.id);
  }, [computed, activeStationId, module.id]);

  // Get ware name helper
  const getWareName = useCallback(
    (wareId: string): string => {
      return t(gameData?.wares[wareId]?.name, wareId);
    },
    [gameData, t]
  );

  // Sort I/O items based on custom order
  const sortItems = useCallback(
    (items: ResourceAmount[], orderArray?: string[]): ResourceAmount[] => {
      if (!orderArray || orderArray.length === 0) {
        return items;
      }

      const itemMap = new Map(items.map((item) => [item.wareId, item]));
      const sorted: ResourceAmount[] = [];
      const seen = new Set<string>();

      for (const wareId of orderArray) {
        const item = itemMap.get(wareId);
        if (item) {
          sorted.push(item);
          seen.add(wareId);
        }
      }

      for (const item of items) {
        if (!seen.has(item.wareId)) {
          sorted.push(item);
        }
      }

      return sorted;
    },
    []
  );

  // Get sorted net outputs and inputs (remaining after connections)
  const sortedNetOutputs = useMemo(() => {
    return sortItems(moduleComputed?.netOutputs ?? [], module.outputOrder);
  }, [moduleComputed?.netOutputs, module.outputOrder, sortItems]);

  const sortedNetInputs = useMemo(() => {
    return sortItems(moduleComputed?.netInputs ?? [], module.inputOrder);
  }, [moduleComputed?.netInputs, module.inputOrder, sortItems]);

  // Get sorted gross outputs and inputs (full production)
  const sortedGrossOutputs = useMemo(() => {
    return sortItems(moduleComputed?.grossOutputs ?? [], module.outputOrder);
  }, [moduleComputed?.grossOutputs, module.outputOrder, sortItems]);

  const sortedGrossInputs = useMemo(() => {
    return sortItems(moduleComputed?.grossInputs ?? [], module.inputOrder);
  }, [moduleComputed?.grossInputs, module.inputOrder, sortItems]);

  // Check if there are any connections (net differs from gross)
  const hasConnections = useMemo(() => {
    if (!moduleComputed) return false;
    const grossOutTotal = moduleComputed.grossOutputs.reduce((sum, o) => sum + o.amount, 0);
    const netOutTotal = moduleComputed.netOutputs.reduce((sum, o) => sum + o.amount, 0);
    const grossInTotal = moduleComputed.grossInputs.reduce((sum, i) => sum + i.amount, 0);
    const netInTotal = moduleComputed.netInputs.reduce((sum, i) => sum + i.amount, 0);
    return Math.abs(grossOutTotal - netOutTotal) > 0.01 || Math.abs(grossInTotal - netInTotal) > 0.01;
  }, [moduleComputed]);

  // Drag and drop handlers for reordering
  const handleDragStart = useCallback(
    (e: React.DragEvent, wareId: string, type: 'input' | 'output') => {
      e.stopPropagation();
      setDraggedItem(`${type}-${wareId}`);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `${type}-${wareId}`);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, wareId: string, type: 'input' | 'output') => {
      e.preventDefault();
      e.stopPropagation();
      const itemKey = `${type}-${wareId}`;
      if (draggedItem && draggedItem !== itemKey && draggedItem.startsWith(type)) {
        setDragOverItem(itemKey);
        e.dataTransfer.dropEffect = 'move';
      }
    },
    [draggedItem]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverItem(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetWareId: string, type: 'input' | 'output') => {
      e.preventDefault();
      e.stopPropagation();

      if (!draggedItem || !draggedItem.startsWith(type) || !activeStationId) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      const sourceWareId = draggedItem.replace(`${type}-`, '');
      if (sourceWareId === targetWareId) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      const items = type === 'output' ? sortedGrossOutputs : sortedGrossInputs;
      const currentOrder = items.map((i) => i.wareId);

      const sourceIndex = currentOrder.indexOf(sourceWareId);
      const targetIndex = currentOrder.indexOf(targetWareId);

      if (sourceIndex === -1 || targetIndex === -1) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      const newOrder = [...currentOrder];
      newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, sourceWareId);

      if (type === 'output') {
        updateModule(activeStationId, module.id, { outputOrder: newOrder });
      } else {
        updateModule(activeStationId, module.id, { inputOrder: newOrder });
      }

      setDraggedItem(null);
      setDragOverItem(null);
    },
    [draggedItem, sortedGrossOutputs, sortedGrossInputs, updateModule, activeStationId, module.id]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItem(null);
  }, []);

  // Get net amount for a ware (how much is remaining/still needed)
  const getNetAmount = useCallback(
    (wareId: string, type: 'input' | 'output'): number => {
      if (!moduleComputed) return 0;
      const netItems = type === 'output' ? moduleComputed.netOutputs : moduleComputed.netInputs;
      return netItems.find((i) => i.wareId === wareId)?.amount ?? 0;
    },
    [moduleComputed]
  );

  // Create drag config for a ware item
  const createDragConfig = useCallback(
    (wareId: string, type: 'input' | 'output'): DragConfig => {
      const handleId = `${type}-${wareId}`;
      return {
        isDragging: draggedItem === handleId,
        isDragOver: dragOverItem === handleId,
        onDragStart: (e) => handleDragStart(e, wareId, type),
        onDragEnd: handleDragEnd,
        onDragOver: (e) => handleDragOver(e, wareId, type),
        onDragLeave: handleDragLeave,
        onDrop: (e) => handleDrop(e, wareId, type),
      };
    },
    [draggedItem, dragOverItem, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop]
  );

  // Render a single I/O row with its handle
  const renderIORow = (grossItem: ResourceAmount, type: 'input' | 'output') => {
    const handleId = `${type}-${grossItem.wareId}`;
    const netAmount = getNetAmount(grossItem.wareId, type);
    const isFullySatisfied = netAmount < 0.01;

    return (
      <WareIORow
        key={grossItem.wareId}
        wareId={grossItem.wareId}
        type={type}
        handleId={handleId}
        amount={{
          primary: netAmount,
          fulfilled: grossItem.amount - netAmount,
        }}
        status={isFullySatisfied ? 'satisfied' : 'unsatisfied'}
        preset={MODULE_PRESET}
        drag={createDragConfig(grossItem.wareId, type)}
        amountTooltip={`Full: ${formatAmount(grossItem.amount)}/hr`}
        onDoubleClick={onWareDoubleClick ? () => onWareDoubleClick(grossItem.wareId, module.id, type) : undefined}
      />
    );
  };

  return (
    <div
      className={`
        w-[240px] rounded-lg border-2 bg-card shadow-md
        ${selected ? 'border-primary ring-2 ring-primary/20' : colors.border}
      `}
    >
      {/* Header */}
      <div className={`px-3 py-2 border-b border-border ${colors.bg} rounded-t-lg`}>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (activeStationId) {
                updateModule(activeStationId, module.id, { completed: !module.completed });
              }
            }}
            className={`nopan nodrag flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              module.completed
                ? 'bg-green-500 border-green-600 text-white'
                : 'border-muted-foreground/40 hover:border-muted-foreground'
            }`}
            title={module.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {module.completed && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 5.5L4 7.5L8 3" />
              </svg>
            )}
          </button>
          <span className="text-base">{icon}</span>
          <h3 className={`text-xs truncate flex-1 ${module.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {t(blueprint?.name, module.blueprintId)}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2 space-y-1">
        {/* Count */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Count</span>
          <span className="text-foreground font-medium">{module.count}</span>
        </div>

        {/* Habitat workforce */}
        {moduleType === 'habitat' && blueprint && 'workforceCapacity' in blueprint && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Workforce</span>
            <span className="text-foreground">{blueprint.workforceCapacity * module.count}</span>
          </div>
        )}

        {/* Storage capacity */}
        {moduleType === 'storage' && blueprint && 'cargoMax' in blueprint && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Capacity</span>
            <span className="text-foreground">{blueprint.cargoMax * module.count}</span>
          </div>
        )}

        {/* I/O for production and habitat modules */}
        {(moduleType === 'production' || moduleType === 'habitat') && moduleComputed && (
          <div className="pt-1.5 mt-1 border-t border-border/50 space-y-2">
            {/* Outputs - always render based on gross, show net status */}
            {sortedGrossOutputs.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  Outputs <span className="opacity-60">/hr</span>:
                </div>
                <div className="space-y-0">
                  {sortedGrossOutputs.map((item) => renderIORow(item, 'output'))}
                </div>
              </div>
            )}

            {/* Inputs - always render based on gross, show net status */}
            {sortedGrossInputs.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  Inputs <span className="opacity-60">/hr</span>:
                </div>
                <div className="space-y-0">
                  {sortedGrossInputs.map((item) => renderIORow(item, 'input'))}
                </div>
              </div>
            )}

            {/* Fully utilized message */}
            {sortedNetOutputs.length === 0 && sortedNetInputs.length === 0 && hasConnections && (
              <div className="text-[10px] text-green-400 italic">
                ✓ Fully utilized
              </div>
            )}

            {/* Collapsible Full Production section */}
            {(sortedGrossOutputs.length > 0 || sortedGrossInputs.length > 0) && (
              <div className="pt-1 border-t border-border/30">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowGross(!showGross); }}
                  className="nopan nodrag w-full text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <span>{showGross ? '▼' : '▶'}</span>
                  <span>Full Production</span>
                </button>

                {showGross && (
                  <div className="mt-1 pl-2 border-l border-border/30 space-y-1">
                    {sortedGrossOutputs.length > 0 && (
                      <div>
                        <div className="text-[9px] text-muted-foreground/70 mb-0.5">Outputs:</div>
                        {sortedGrossOutputs.map((item) => (
                          <div key={item.wareId} className="flex justify-between text-[9px] text-muted-foreground/80">
                            <span className="truncate max-w-[70px]">{getWareName(item.wareId)}</span>
                            <span className="font-mono">+{formatAmount(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sortedGrossInputs.length > 0 && (
                      <div>
                        <div className="text-[9px] text-muted-foreground/70 mb-0.5">Inputs:</div>
                        {sortedGrossInputs.map((item) => (
                          <div key={item.wareId} className="flex justify-between text-[9px] text-muted-foreground/80">
                            <span className="truncate max-w-[70px]">{getWareName(item.wareId)}</span>
                            <span className="font-mono">-{formatAmount(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No I/O message while loading */}
        {(moduleType === 'production' || moduleType === 'habitat') && !moduleComputed && (
          <div className="pt-1 mt-1 border-t border-border/50">
            <p className="text-xs text-muted-foreground italic">
              Loading I/O...
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
