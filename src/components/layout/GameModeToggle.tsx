import { useState } from 'react';
import { useGameModeStore } from '@/store/gameModeStore';
import { useGameDataStore, usePlanStore, usePlanManagerStore, useUIStore } from '@/store';
import { loadGameData, clearGameDataCache } from '@/data/loader';
import { Modal } from '@/components/shared/Modal';
import type { GameMode } from '@/types';

export function GameModeToggle() {
  const gameMode = useGameModeStore((s) => s.gameMode);
  const setGameMode = useGameModeStore((s) => s.setGameMode);
  const setGameData = useGameDataStore((s) => s.setGameData);
  const setLoading = useGameDataStore((s) => s.setLoading);
  const setError = useGameDataStore((s) => s.setError);
  const setPlansOpen = useUIStore((s) => s.setPlansOpen);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const newMode: GameMode = gameMode === 'swi' ? 'base' : 'swi';
  const newModeLabel = newMode === 'swi' ? 'SWI Mod' : 'Base Game';

  const performSwitch = async (save: boolean) => {
    setConfirmOpen(false);

    if (save) {
      // Explicitly save the current plan
      const plan = usePlanStore.getState().plan;
      usePlanManagerStore.getState().saveCurrentPlan(plan);
    }

    // Switch game mode
    setGameMode(newMode);
    clearGameDataCache();
    setLoading(true);

    try {
      const data = await loadGameData(newMode);
      setGameData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game data');
      return;
    }

    // Check if plans exist for the new mode
    const { planIndex, createPlan, loadPlanById } = usePlanManagerStore.getState();
    const plansForMode = planIndex.filter((p) => p.gameMode === newMode);

    if (plansForMode.length > 0) {
      // Load most recent plan for this mode
      const sorted = [...plansForMode].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      loadPlanById(sorted[0].id);
      usePlanStore.getState().recompute();
      // Open plans browser so user can pick
      setPlansOpen(true);
    } else {
      // No plans for this mode - create an empty one
      createPlan('New Plan', [], newMode);
      usePlanStore.getState().recompute();
    }
  };

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        className={`px-3 py-1.5 text-sm rounded transition-colors font-medium ${
          gameMode === 'swi'
            ? 'bg-amber-600 text-white hover:bg-amber-700'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={`Switch to ${newModeLabel}`}
      >
        {gameMode === 'swi' ? 'SWI' : 'Base'}
      </button>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Switch to ${newModeLabel}?`}
        size="sm"
        footer={
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <div className="flex-1" />
            <button
              onClick={() => performSwitch(false)}
              className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Don't Save
            </button>
            <button
              onClick={() => performSwitch(true)}
              className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Save & Switch
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          You are about to switch to <span className="font-medium text-foreground">{newModeLabel}</span> mode.
          Game data will be reloaded with different wares and modules.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Would you like to save the current plan before switching?
        </p>
      </Modal>
    </>
  );
}
