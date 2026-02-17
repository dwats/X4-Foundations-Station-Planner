import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { TopBar, Sidebar, Breadcrumb } from '@/components/layout';
import { ReportDrawer } from '@/components/report';
import { NetworkCanvas, StationCanvas } from '@/components/canvas';
import { Toast } from '@/components/shared/Toast';
import { loadGameData } from '@/data/loader';
import { useGameDataStore, useUIStore, usePlanStore } from '@/store';
import { usePlanManagerStore } from '@/store/planManagerStore';
import { useGameModeStore } from '@/store/gameModeStore';
import { setupAutoSave } from '@/store/planStore';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useUndoRedo } from '@/hooks/useUndoRedo';

function App() {
  useTheme();
  useLanguage();
  useUndoRedo();
  const { gameData, loading, error, setGameData, setError } = useGameDataStore();
  const viewMode = useUIStore((state) => state.viewMode);
  const gameMode = useGameModeStore((state) => state.gameMode);
  const [showDebug, setShowDebug] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowDebug(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Initialize plan manager (handles migration from legacy format)
    usePlanManagerStore.getState().initializePlanManager();

    // Set up auto-save subscription
    setupAutoSave((plan) => usePlanManagerStore.getState().saveCurrentPlan(plan));

    // Load game data for current mode
    loadGameData(gameMode)
      .then((data) => {
        setGameData(data);
        // Trigger recompute now that gameData is available
        usePlanStore.getState().recompute();
      })
      .catch((err) => setError(err.message));
  }, [setGameData, setError, gameMode]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load game data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-background">
        <TopBar />
        <Breadcrumb />
        <div className="flex-1 flex overflow-hidden">
          {viewMode === 'network' ? <NetworkCanvas /> : <StationCanvas />}
          <Sidebar />
        </div>
        <ReportDrawer />
        {/* Debug info */}
        {gameData && (
          <div className={`absolute bottom-4 left-4 text-xs text-muted-foreground bg-card/80 p-2 rounded transition-opacity duration-1000 pointer-events-none ${showDebug ? 'opacity-100' : 'opacity-0'}`}>
            Loaded: {Object.keys(gameData.wares).length} wares,{' '}
            {Object.keys(gameData.sectors).length} sectors
          </div>
        )}
        <Toast />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
