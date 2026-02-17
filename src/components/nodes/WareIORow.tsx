/**
 * Unified WareIORow component for rendering input/output rows across all node types
 */

import { Handle, Position } from '@xyflow/react';
import { useGameDataStore } from '@/store/gamedataStore';
import { useLocale } from '@/hooks/useLocale';
import { formatAmount } from '@/lib/format';
import type { WareIOPreset, WareIOColors } from './WareIORow.presets';
import type { IOStatus, AmountDisplay } from './WareIORow.utils';

export interface DragConfig {
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export interface WareIORowProps {
  wareId: string;
  type: 'input' | 'output';
  amount: AmountDisplay;
  status: IOStatus;
  preset: WareIOPreset;
  handleId: string;
  isDeficit?: boolean;
  drag?: DragConfig;
  handleTooltip?: string;
  /** Tooltip for amount display */
  amountTooltip?: string;
  /** Double-click handler for auto-create */
  onDoubleClick?: () => void;
}

export function WareIORow({
  wareId,
  type,
  amount,
  status,
  preset,
  handleId,
  isDeficit = false,
  drag,
  handleTooltip,
  amountTooltip,
  onDoubleClick,
}: WareIORowProps) {
  const gameData = useGameDataStore((s) => s.gameData);
  const { t } = useLocale();
  const isInput = type === 'input';
  const colors: WareIOColors = isInput ? preset.inputColors : preset.outputColors;

  const getWareName = (id: string): string => {
    return t(gameData?.wares[id]?.name, id);
  };

  const wareName = getWareName(wareId);

  // Determine handle class based on status and type
  const getHandleClass = (): string => {
    const positionClass = isInput ? 'handle-left' : 'handle-right';
    const sizeClass = 'handle-sm';

    // Use custom color class if specified in preset
    if (preset.handle.colorClass) {
      return `${preset.handle.baseClass} ${positionClass} ${sizeClass} ${preset.handle.colorClass}`;
    }

    // Default: Module and Station nodes use input/output classes based on status
    const colorClass =
      status === 'satisfied'
        ? isInput
          ? 'handle-input-satisfied'
          : 'handle-output-satisfied'
        : isInput
          ? 'handle-input'
          : 'handle-output';

    return `${preset.handle.baseClass} ${positionClass} ${sizeClass} ${colorClass}`;
  };

  // Determine ware name color based on status and deficit
  const getNameColor = (): string => {
    if (status === 'satisfied') {
      return colors.satisfied;
    }
    if (isDeficit && colors.deficit) {
      return colors.deficit;
    }
    return colors.default;
  };

  // Render the amount display based on status and connection state
  // Unified logic:
  // - Inputs connected + fulfilled: " {required}" bold dark green
  // - Inputs connected + deficit: "-{deficit}" bold red
  // - Inputs not connected: "{deficit}" faded dark red
  // - Outputs connected: "{total}" normal dark gray
  // - Outputs not connected: "{total}" faded dark gray
  const renderAmount = () => {
    const fulfilled = amount.fulfilled ?? 0;
    const isConnected = fulfilled > 0.01;

    if (isInput) {
      if (status === 'satisfied') {
        // Fully satisfied - show the fulfilled amount with leading space for alignment
        const displayAmount = fulfilled > 0.01 ? fulfilled : amount.primary;
        return (
          <span className="text-green-600 font-bold" title={amountTooltip}>
            &nbsp;{formatAmount(displayAmount)}
          </span>
        );
      } else if (isConnected) {
        // Connected but has deficit - show deficit in bold red with minus sign
        // For partial status: primary is total, deficit = primary - fulfilled
        // For unsatisfied status with connection: primary is already remaining/deficit
        const deficit = status === 'partial'
          ? amount.primary - fulfilled
          : amount.primary;
        return (
          <span className="text-red-400 font-bold" title={amountTooltip}>
            -{formatAmount(deficit)}
          </span>
        );
      } else {
        // Not connected - show full amount (deficit) in faded dark red
        return (
          <span className="text-red-600/60" title={amountTooltip}>
            &nbsp;{formatAmount(amount.primary)}
          </span>
        );
      }
    } else {
      // Output: show primary with styling based on connection
      if (isConnected) {
        return (
          <span className="text-gray-400" title={amountTooltip}>
            {formatAmount(amount.primary)}
          </span>
        );
      } else {
        return (
          <span className="text-gray-500/60" title={amountTooltip}>
            {formatAmount(amount.primary)}
          </span>
        );
      }
    }
  };

  // Render drag handle element
  const renderDragHandle = () => {
    if (!preset.hasDrag || !drag) return null;

    return (
      <div
        draggable
        onDragStart={drag.onDragStart}
        onDragEnd={drag.onDragEnd}
        className="nopan nodrag flex-shrink-0 w-4 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 hover:!opacity-100"
        title="Drag to reorder"
      >
        <span className="text-[8px] text-muted-foreground select-none">⋮⋮</span>
      </div>
    );
  };

  // Render the handle (React Flow connection point)
  const renderHandle = () => (
    <Handle
      type={isInput ? 'target' : 'source'}
      position={isInput ? Position.Left : Position.Right}
      id={handleId}
      className={getHandleClass()}
      title={handleTooltip ?? wareName}
    />
  );

  return (
    <div
      onDoubleClick={onDoubleClick ? (e) => { e.stopPropagation(); onDoubleClick(); } : undefined}
      onDragOver={drag?.onDragOver}
      onDragLeave={drag?.onDragLeave}
      onDrop={drag?.onDrop}
      className={`
        relative flex items-center ${preset.fontSize} py-0.5 group
        ${drag?.isDragging ? 'opacity-50' : ''}
        ${drag?.isDragOver ? 'bg-primary/20 rounded' : ''}
      `}
    >
      {/* Input: Handle on left, drag handle on right */}
      {isInput && preset.handle.inline && renderHandle()}
      {!isInput && preset.hasDrag && renderDragHandle()}

      {/* For station-io (non-inline), handle comes first for inputs */}
      {isInput && !preset.handle.inline && renderHandle()}

      {/* Content row */}
      <div
        className={`flex-1 flex items-center justify-between ${
          isInput ? (preset.handle.inline ? '' : 'pl-4 pr-2') : (preset.handle.inline ? '' : 'pl-2 pr-4')
        }`}
      >
        {isInput &&<span className="font-mono ml-1">{renderAmount()}</span>}
        <span className={`truncate ${preset.nameMaxWidth} ${getNameColor()}`}>
          {wareName}
        </span>
        {!isInput &&<span className="font-mono mr-2">{renderAmount()}</span>}
      </div>

      {/* Output: Drag handle on left, handle on right */}
      {isInput && preset.hasDrag && renderDragHandle()}
      {!isInput && preset.handle.inline && renderHandle()}

      {/* For station-io (non-inline), handle comes last for outputs */}
      {!isInput && !preset.handle.inline && renderHandle()}
    </div>
  );
}

// Re-export types and presets for convenience
export type { WareIOPreset, WareIOColors } from './WareIORow.presets';
export type { IOStatus, AmountDisplay } from './WareIORow.utils';
export { computeStatus, computeAmountDisplay } from './WareIORow.utils';
export {
  MODULE_PRESET,
  STATION_PRESET,
  STATION_INPUT_PRESET,
  STATION_OUTPUT_PRESET,
} from './WareIORow.presets';
