import { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  type Viewport,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePlanStore, useUIStore } from '@/store';
import { getModuleComputed } from '@/engine';
import {
  ModuleNode,
  type ModuleNodeType,
  StationInputNode,
  type StationInputNodeType,
  StationOutputNode,
  type StationOutputNodeType,
} from '@/components/nodes';
import { ModuleEdge, type ModuleEdgeType } from '@/components/edges';
import { ContextMenuShell } from './context-menu';
import { STATION_INPUT_ID, STATION_OUTPUT_ID } from '@/types/plan';

// Type for all nodes in station canvas
export type StationCanvasNode = ModuleNodeType | StationInputNodeType | StationOutputNodeType;

// Register custom node types
const nodeTypes: NodeTypes = {
  module: ModuleNode,
  stationInput: StationInputNode,
  stationOutput: StationOutputNode,
};

// Register custom edge types
const edgeTypes: EdgeTypes = {
  module: ModuleEdge,
};

function StationCanvasInner() {
  const { setViewport, screenToFlowPosition } = useReactFlow();
  const activeStationId = useUIStore((state) => state.activeStationId);
  const stations = usePlanStore((state) => state.plan.stations);
  const computed = usePlanStore((state) => state.computed);
  const updateModule = usePlanStore((state) => state.updateModule);
  const removeModule = usePlanStore((state) => state.removeModule);
  const addModuleConnection = usePlanStore((state) => state.addModuleConnection);
  const removeModuleConnection = usePlanStore((state) => state.removeModuleConnection);

  const selectNode = useUIStore((state) => state.selectNode);
  const selectEdge = useUIStore((state) => state.selectEdge);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const openContextMenu = useUIStore((state) => state.openContextMenu);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Find the active station
  const station = useMemo(
    () => stations.find((s) => s.id === activeStationId),
    [stations, activeStationId]
  );

  // Default positions for Station I/O nodes
  const defaultInputPosition = { x: -300, y: 100 };
  const defaultOutputPosition = { x: 400, y: 100 };

  // Convert plan modules to React Flow nodes (including Station I/O nodes)
  const nodes = useMemo<StationCanvasNode[]>(() => {
    if (!station) return [];

    const moduleNodes: ModuleNodeType[] = station.modules.map((module) => ({
      id: module.id,
      type: 'module',
      position: module.position,
      data: { module },
    }));

    // Station Input node (always present)
    const stationInputNode: StationInputNodeType = {
      id: STATION_INPUT_ID,
      type: 'stationInput',
      position: station.stationInputPosition ?? defaultInputPosition,
      data: {},
      deletable: false,
    };

    // Station Output node (always present)
    const stationOutputNode: StationOutputNodeType = {
      id: STATION_OUTPUT_ID,
      type: 'stationOutput',
      position: station.stationOutputPosition ?? defaultOutputPosition,
      data: {},
      deletable: false,
    };

    return [stationInputNode, ...moduleNodes, stationOutputNode];
  }, [station]);

  // Convert module connections to React Flow edges
  const edges = useMemo<ModuleEdgeType[]>(() => {
    if (!station) return [];

    const moduleConnections = station.moduleConnections ?? [];

    return moduleConnections.map((conn) => ({
      id: conn.id,
      source: conn.sourceModuleId,
      target: conn.targetModuleId,
      sourceHandle: conn.wareId ? `output-${conn.wareId}` : undefined,
      targetHandle: conn.wareId ? `input-${conn.wareId}` : undefined,
      type: 'module',
      data: { connection: conn },
    }));
  }, [station]);

  const updateStation = usePlanStore((state) => state.updateStation);

  // Handle node changes (position, selection, removal)
  const onNodesChange: OnNodesChange<StationCanvasNode> = useCallback(
    (changes) => {
      if (!activeStationId) return;

      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          // Handle Station I/O node positions separately
          if (change.id === STATION_INPUT_ID) {
            updateStation(activeStationId, { stationInputPosition: change.position });
          } else if (change.id === STATION_OUTPUT_ID) {
            updateStation(activeStationId, { stationOutputPosition: change.position });
          } else {
            updateModule(activeStationId, change.id, { position: change.position });
          }
        } else if (change.type === 'remove') {
          // Prevent deletion of Station I/O nodes
          if (change.id !== STATION_INPUT_ID && change.id !== STATION_OUTPUT_ID) {
            removeModule(activeStationId, change.id);
          }
        } else if (change.type === 'select') {
          if (change.selected) {
            selectNode(change.id);
          }
        }
      });
    },
    [activeStationId, updateModule, updateStation, removeModule, selectNode]
  );

  // Handle edge changes (removal, selection)
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (!activeStationId) return;

      changes.forEach((change) => {
        if (change.type === 'remove') {
          removeModuleConnection(activeStationId, change.id);
        } else if (change.type === 'select' && change.selected) {
          selectEdge(change.id);
        }
      });
    },
    [activeStationId, removeModuleConnection, selectEdge]
  );

  // Parse ware ID from handle ID (format: "output-{wareId}" or "input-{wareId}")
  const parseWareFromHandle = (handleId: string | null): string => {
    if (!handleId) return '';
    const parts = handleId.split('-');
    return parts.slice(1).join('-');
  };

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!activeStationId || !connection.source || !connection.target) {
        return;
      }

      let wareId: string;
      let defaultAmount = 0;
      let ratio: number | undefined;

      // Connection from Station Input (generic handle) to Module
      if (connection.source === STATION_INPUT_ID) {
        // For generic handle, extract ware from TARGET handle (module's input)
        if (!connection.targetHandle) return;
        wareId = parseWareFromHandle(connection.targetHandle);

        // Find target module's net input for this ware
        const targetModuleComputed = getModuleComputed(computed, activeStationId, connection.target);
        const targetInput = targetModuleComputed?.netInputs.find((i) => i.wareId === wareId);
        defaultAmount = targetInput?.amount ?? 0;
        // No ratio for station I/O connections - they don't auto-scale
      }
      // Connection from Module to Station Output (generic handle)
      else if (connection.target === STATION_OUTPUT_ID) {
        // For generic handle, extract ware from SOURCE handle (module's output)
        if (!connection.sourceHandle) return;
        wareId = parseWareFromHandle(connection.sourceHandle);

        // Find source module's net output for this ware
        const sourceModuleComputed = getModuleComputed(computed, activeStationId, connection.source);
        const sourceOutput = sourceModuleComputed?.netOutputs.find((o) => o.wareId === wareId);
        defaultAmount = sourceOutput?.amount ?? 0;
        // No ratio for station I/O connections - they don't auto-scale
      }
      // Module to Module connection
      else {
        if (!connection.sourceHandle) return;
        wareId = parseWareFromHandle(connection.sourceHandle);

        // Find source module's output for this ware
        const sourceModuleComputed = getModuleComputed(computed, activeStationId, connection.source);
        const sourceOutput = sourceModuleComputed?.grossOutputs.find((o) => o.wareId === wareId);
        const sourceGross = sourceOutput?.amount ?? 0;

        // Find target module's input for this ware
        const targetModuleComputed = getModuleComputed(computed, activeStationId, connection.target);
        const targetInput = targetModuleComputed?.grossInputs.find((i) => i.wareId === wareId);

        // Default amount: min of source available and target needs
        defaultAmount = targetInput
          ? Math.min(sourceGross, targetInput.amount)
          : sourceGross;

        // Calculate ratio for auto-scaling (percentage of source gross output)
        ratio = sourceGross > 0 ? defaultAmount / sourceGross : 0;
      }

      if (!wareId) return;

      addModuleConnection(activeStationId, {
        sourceModuleId: connection.source,
        targetModuleId: connection.target,
        wareId,
        amount: defaultAmount,
        mode: 'auto',
        locked: false,
        ratio,
      });
    },
    [activeStationId, computed, addModuleConnection]
  );

  // Handle pane click (clear selection)
  const onPaneClick = useCallback(() => {
    clearSelection();
    closeContextMenu();
  }, [clearSelection, closeContextMenu]);

  // Handle right-click on empty canvas
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      openContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        target: { type: 'pane', viewMode: 'station' },
      });
    },
    [openContextMenu, screenToFlowPosition]
  );

  // Handle right-click on nodes
  const onNodeContextMenu: NodeMouseHandler<StationCanvasNode> = useCallback(
    (event, node) => {
      event.preventDefault();
      selectNode(node.id);
      openContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        target: { type: 'node', nodeId: node.id, nodeType: node.type ?? 'module', viewMode: 'station' },
      });
    },
    [openContextMenu, screenToFlowPosition, selectNode]
  );

  // Handle right-click on edges
  const onEdgeContextMenu: EdgeMouseHandler<ModuleEdgeType> = useCallback(
    (event, edge) => {
      event.preventDefault();
      selectEdge(edge.id);
      openContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        target: { type: 'edge', edgeId: edge.id, edgeType: edge.type ?? 'module', viewMode: 'station' },
      });
    },
    [openContextMenu, screenToFlowPosition, selectEdge]
  );

  // Handle keyboard events (Delete key)
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodeId = useUIStore.getState().selectedNodeId;
        const selectedEdgeId = useUIStore.getState().selectedEdgeId;

        // Don't delete Station I/O nodes
        if (selectedNodeId && activeStationId) {
          if (selectedNodeId !== STATION_INPUT_ID && selectedNodeId !== STATION_OUTPUT_ID) {
            removeModule(activeStationId, selectedNodeId);
            clearSelection();
          }
        } else if (selectedEdgeId && activeStationId) {
          removeModuleConnection(activeStationId, selectedEdgeId);
          clearSelection();
        }
      }
    },
    [activeStationId, removeModule, removeModuleConnection, clearSelection]
  );

  // Snap viewport to prevent subpixel blurriness
  const onViewportChange = useCallback(
    (viewport: Viewport) => {
      const roundedX = Math.round(viewport.x);
      const roundedY = Math.round(viewport.y);
      // Round zoom to 2 decimal places to avoid excessive snapping
      const roundedZoom = Math.round(viewport.zoom * 100) / 100;

      if (
        roundedX !== viewport.x ||
        roundedY !== viewport.y ||
        roundedZoom !== viewport.zoom
      ) {
        setViewport({ x: roundedX, y: roundedY, zoom: roundedZoom });
      }
    },
    [setViewport]
  );

  if (!station) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">Station not found</p>
      </div>
    );
  }

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 relative"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onViewportChange={onViewportChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Delete', 'Backspace']}
        selectionKeyCode={null}
      >
        <Background gap={16} size={1} />
        <Controls />
      </ReactFlow>

      {/* Station info overlay */}
      <div className="absolute top-4 left-4 bg-card/90 border border-border rounded-lg px-3 py-2 shadow-sm">
        <h2 className="font-medium text-foreground">{station.name}</h2>
        <p className="text-xs text-muted-foreground">
          {station.modules.length} module{station.modules.length !== 1 ? 's' : ''},{' '}
          {(station.moduleConnections ?? []).length} connection{(station.moduleConnections ?? []).length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Context Menu */}
      <ContextMenuShell />
    </div>
  );
}

export function StationCanvas() {
  return (
    <ReactFlowProvider>
      <StationCanvasInner />
    </ReactFlowProvider>
  );
}
