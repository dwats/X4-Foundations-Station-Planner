import { useEffect } from 'react';
import { useUIStore, usePlanStore } from '@/store';
import { StationPanel, SectorPanel, ModulePalette, ModulePanel, ConnectionPanel, ModuleConnectionPanel } from '@/components/panels';

export function Sidebar() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const selectedEdgeId = useUIStore((state) => state.selectedEdgeId);
  const viewMode = useUIStore((state) => state.viewMode);
  const activeStationId = useUIStore((state) => state.activeStationId);
  const plan = usePlanStore((state) => state.plan);

  // Auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    // Check on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  // Network view selections
  const selectedStation = viewMode === 'network'
    ? plan.stations.find((s) => s.id === selectedNodeId)
    : null;
  const selectedSector = viewMode === 'network'
    ? plan.sectors.find((s) => s.id === selectedNodeId)
    : null;
  const selectedConnection = plan.connections.find(
    (c) => c.id === selectedEdgeId
  );

  // Station view: find selected module or module connection
  const activeStation = plan.stations.find((s) => s.id === activeStationId);
  const selectedModule = viewMode === 'station' && activeStation
    ? activeStation.modules.find((m) => m.id === selectedNodeId)
    : null;
  const selectedModuleConnection = viewMode === 'station' && activeStation && selectedEdgeId
    ? (activeStation.moduleConnections ?? []).find((c) => c.id === selectedEdgeId)
    : null;

  // Determine panel title
  let panelTitle = 'Network';
  if (viewMode === 'station') {
    if (selectedModuleConnection) {
      panelTitle = 'Connection';
    } else if (selectedModule) {
      panelTitle = 'Module';
    } else {
      panelTitle = 'Add Modules';
    }
  } else if (selectedStation) {
    panelTitle = 'Station';
  } else if (selectedSector) {
    panelTitle = 'Sector';
  } else if (selectedConnection) {
    panelTitle = 'Connection';
  }

  const renderContent = () => {
    // Station view
    if (viewMode === 'station') {
      if (selectedModuleConnection && activeStationId) {
        return <ModuleConnectionPanel stationId={activeStationId} connection={selectedModuleConnection} />;
      }
      if (selectedModule && activeStationId) {
        return <ModulePanel stationId={activeStationId} module={selectedModule} />;
      }
      return <ModulePalette />;
    }

    // Network view
    if (selectedStation) {
      return <StationPanel station={selectedStation} />;
    }

    if (selectedSector) {
      return <SectorPanel sector={selectedSector} />;
    }

    if (selectedConnection) {
      return <ConnectionPanel connection={selectedConnection} />;
    }

    // Default network view help
    return (
      <div className="text-sm text-muted-foreground space-y-4">
        <p>Select a station or sector to view details.</p>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Quick Actions</p>
          <ul className="text-xs space-y-1">
            <li>Right-click on the canvas to add stations</li>
            <li>Drag from one station handle to another to connect</li>
            <li>Press Delete to remove selected items</li>
            <li>Double-click a station to configure modules</li>
          </ul>
        </div>
      </div>
    );
  };

  // Collapsed state: just show toggle button
  if (!sidebarOpen) {
    return (
      <aside className="w-10 border-l border-border bg-card flex flex-col transition-all duration-200">
        <div className="p-2 border-b border-border flex items-center justify-center">
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-foreground"
            >
              <path
                d="M6 12L10 8L6 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="rotate(180 8 8)"
              />
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  // Expanded state: full sidebar
  return (
    <aside className="w-72 border-l border-border bg-card flex flex-col transition-all duration-200">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">{panelTitle}</h2>
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-accent rounded transition-colors"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-foreground"
          >
            <path
              d="M6 12L10 8L6 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {renderContent()}
      </div>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-0.5">
          {viewMode === 'station' && activeStation ? (
            <>
              <p>Modules: {activeStation.modules.length}</p>
              <p>Station: {activeStation.name}</p>
            </>
          ) : (
            <>
              <p>Stations: {plan.stations.length}</p>
              <p>Sectors: {plan.sectors.length}</p>
              <p>Connections: {plan.connections.length}</p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
