import { useUIStore, usePlanStore } from '@/store';
import { StationPanel, SectorPanel, ModulePalette, ModulePanel, ConnectionPanel, ModuleConnectionPanel } from '@/components/panels';

export function Sidebar() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const selectedEdgeId = useUIStore((state) => state.selectedEdgeId);
  const viewMode = useUIStore((state) => state.viewMode);
  const activeStationId = useUIStore((state) => state.activeStationId);
  const plan = usePlanStore((state) => state.plan);

  if (!sidebarOpen) {
    return null;
  }

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

  return (
    <aside className="w-72 border-l border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">{panelTitle}</h2>
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
