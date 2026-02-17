import { useEffect } from 'react';
import { usePlanStore } from '@/store/planStore';
import { useUIStore } from '@/store/uiStore';

export function useUndoRedo() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier || event.key.toLowerCase() !== 'z') return;

      // Don't intercept when typing in inputs/textareas
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      event.preventDefault();

      const temporal = usePlanStore.temporal.getState();
      const showToast = useUIStore.getState().showToast;

      if (event.shiftKey) {
        // Redo
        if (temporal.futureStates.length > 0) {
          temporal.redo();
          usePlanStore.getState().recompute();
          showToast('Redo', 'info');
        }
      } else {
        // Undo
        if (temporal.pastStates.length > 0) {
          temporal.undo();
          usePlanStore.getState().recompute();
          showToast('Undo', 'info');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
