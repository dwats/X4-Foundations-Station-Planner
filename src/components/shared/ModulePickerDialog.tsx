import { Modal } from './Modal';
import { useLocale } from '@/hooks/useLocale';
import { useGameDataStore } from '@/store/gamedataStore';
import { findRecipeForModule } from '@/engine/computeModule';
import type { ProductionModule } from '@/types';

interface ModulePickerDialogProps {
  open: boolean;
  onClose: () => void;
  candidates: ProductionModule[];
  onSelect: (blueprintId: string) => void;
}

export function ModulePickerDialog({ open, onClose, candidates, onSelect }: ModulePickerDialogProps) {
  const { t } = useLocale();
  const gameData = useGameDataStore((s) => s.gameData);

  return (
    <Modal open={open} onClose={onClose} title="Select Module" size="sm">
      <div className="space-y-1">
        {candidates.map((mod) => {
          const recipe = gameData ? findRecipeForModule(mod, gameData.recipes) : null;
          return (
            <button
              key={mod.id}
              onClick={() => onSelect(mod.id)}
              className="w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors flex items-center justify-between gap-2"
            >
              <span className="text-sm text-foreground truncate">
                {t(mod.name, mod.id)}
              </span>
              {recipe && recipe.method !== 'default' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                  {recipe.method}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
