import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnConnectStart,
  type OnConnectEnd,
  type NodeTypes,
  type EdgeTypes,
  type Viewport,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePlanStore, useUIStore } from '@/store';
import { useGameDataStore } from '@/store/gamedataStore';
import { getModuleComputed, findRecipeForModule } from '@/engine';
import {
  ModuleNode,
  type ModuleNodeType,
  type ModuleNodeData,
  StationInputNode,
  type StationInputNodeType,
  StationOutputNode,
  type StationOutputNodeType,
} from '@/components/nodes';
import { ModuleEdge, type ModuleEdgeType } from '@/components/edges';
import { ContextMenuShell } from './context-menu';
import { ModulePickerDialog } from '@/components/shared/ModulePickerDialog';
import { STATION_INPUT_ID, STATION_OUTPUT_ID } from '@/types/plan';
import type { ProductionModule } from '@/types';

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

  const addModule = usePlanStore((state) => state.addModule);
  const gameData = useGameDataStore((state) => state.gameData);
  const getModuleType = useGameDataStore((state) => state.getModuleType);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Track measured node dimensions for MiniMap rendering
  const [measuredDimensions, setMeasuredDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

  // Auto-create state
  const [pickerState, setPickerState] = useState<{
    wareId: string;
    existingModuleId: string;
    candidates: ProductionModule[];
    direction: 'producer' | 'consumer';
    position: { x: number; y: number };
  } | null>(null);

  // Connection drag tracking refs
  const pendingConnection = useRef<{
    nodeId: string;
    handleId: string;
    handleType: 'source' | 'target';
  } | null>(null);
  const connectionCompleted = useRef(false);

  // Find the active station
  const station = useMemo(
    () => stations.find((s) => s.id === activeStationId),
    [stations, activeStationId]
  );

  // Default positions for Station I/O nodes
  const defaultInputPosition = { x: -300, y: 100 };
  const defaultOutputPosition = { x: 400, y: 100 };

  // Find production modules that produce a given ware
  const findProducers = useCallback(
    (wareId: string): ProductionModule[] => {
      if (!gameData) return [];
      return Object.values(gameData.modules.production).filter(
        (m) => m.producedWareId === wareId
      );
    },
    [gameData]
  );

  // Find production modules that consume a given ware (have it as recipe input)
  const findConsumers = useCallback(
    (wareId: string): ProductionModule[] => {
      if (!gameData) return [];
      return Object.values(gameData.modules.production).filter((m) => {
        const recipe = findRecipeForModule(m, gameData.recipes);
        return recipe?.inputs.some((inp) => inp.ware === wareId) ?? false;
      });
    },
    [gameData]
  );

  // Create a module and connect it to the existing module
  const createModuleAndConnect = useCallback(
    (
      blueprintId: string,
      wareId: string,
      existingModuleId: string,
      direction: 'producer' | 'consumer',
      position: { x: number; y: number }
    ) => {
      if (!activeStationId) return;

      const newModuleId = addModule(activeStationId, blueprintId, position);

      // After addModule, computed is fresh (Zustand set is synchronous)
      const freshComputed = usePlanStore.getState().computed;

      if (direction === 'producer') {
        // New module produces -> existing module consumes
        const sourceComputed = getModuleComputed(freshComputed, activeStationId, newModuleId);
        const targetComputed = getModuleComputed(freshComputed, activeStationId, existingModuleId);
        const sourceGross = sourceComputed?.grossOutputs.find((o) => o.wareId === wareId)?.amount ?? 0;
        const targetGross = targetComputed?.grossInputs.find((i) => i.wareId === wareId)?.amount ?? 0;
        const amount = Math.min(sourceGross, targetGross);
        const ratio = sourceGross > 0 ? amount / sourceGross : 0;

        addModuleConnection(activeStationId, {
          sourceModuleId: newModuleId,
          targetModuleId: existingModuleId,
          wareId,
          amount,
          mode: 'auto',
          locked: false,
          ratio,
        });
      } else {
        // Existing module produces -> new module consumes
        const sourceComputed = getModuleComputed(freshComputed, activeStationId, existingModuleId);
        const targetComputed = getModuleComputed(freshComputed, activeStationId, newModuleId);
        const sourceGross = sourceComputed?.grossOutputs.find((o) => o.wareId === wareId)?.amount ?? 0;
        const targetGross = targetComputed?.grossInputs.find((i) => i.wareId === wareId)?.amount ?? 0;
        const amount = Math.min(sourceGross, targetGross);
        const ratio = sourceGross > 0 ? amount / sourceGross : 0;

        addModuleConnection(activeStationId, {
          sourceModuleId: existingModuleId,
          targetModuleId: newModuleId,
          wareId,
          amount,
          mode: 'auto',
          locked: false,
          ratio,
        });
      }
    },
    [activeStationId, addModule, addModuleConnection]
  );

  // Trigger auto-create logic for a ware
  const triggerAutoCreate = useCallback(
    (
      wareId: string,
      existingModuleId: string,
      direction: 'producer' | 'consumer',
      position: { x: number; y: number }
    ) => {
      const candidates = direction === 'producer' ? findProducers(wareId) : findConsumers(wareId);

      if (candidates.length === 0) return;
      if (candidates.length === 1) {
        createModuleAndConnect(candidates[0].id, wareId, existingModuleId, direction, position);
      } else {
        setPickerState({ wareId, existingModuleId, candidates, direction, position });
      }
    },
    [findProducers, findConsumers, createModuleAndConnect]
  );

  // Handle double-click on a ware row
  const handleWareDoubleClick = useCallback(
    (wareId: string, moduleId: string, type: 'input' | 'output') => {
      // Find existing module position for offset
      const mod = station?.modules.find((m) => m.id === moduleId);
      const basePos = mod?.position ?? { x: 0, y: 0 };

      if (type === 'input') {
        // Input ware: create a producer to the left
        triggerAutoCreate(wareId, moduleId, 'producer', {
          x: basePos.x - 320,
          y: basePos.y,
        });
      } else {
        // Output ware: create a consumer to the right
        triggerAutoCreate(wareId, moduleId, 'consumer', {
          x: basePos.x + 320,
          y: basePos.y,
        });
      }
    },
    [station, triggerAutoCreate]
  );

  // Handle picker selection
  const handlePickerSelect = useCallback(
    (blueprintId: string) => {
      if (!pickerState) return;
      createModuleAndConnect(
        blueprintId,
        pickerState.wareId,
        pickerState.existingModuleId,
        pickerState.direction,
        pickerState.position
      );
      setPickerState(null);
    },
    [pickerState, createModuleAndConnect]
  );

  // Track connection drag start
  const onConnectStart: OnConnectStart = useCallback(
    (_event, params) => {
      connectionCompleted.current = false;
      if (params.nodeId && params.handleId && params.handleType) {
        pendingConnection.current = {
          nodeId: params.nodeId,
          handleId: params.handleId,
          handleType: params.handleType,
        };
      }
    },
    []
  );

  // Track connection drag end (drop on empty space)
  const onConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      if (connectionCompleted.current || !pendingConnection.current) {
        pendingConnection.current = null;
        return;
      }

      const pending = pendingConnection.current;
      pendingConnection.current = null;

      // Skip Station I/O nodes
      if (pending.nodeId === STATION_INPUT_ID || pending.nodeId === STATION_OUTPUT_ID) return;

      // Get drop position from the event
      const mouseEvent = event as MouseEvent;
      if (!mouseEvent.clientX && !mouseEvent.clientY) return;
      const flowPos = screenToFlowPosition({ x: mouseEvent.clientX, y: mouseEvent.clientY });

      // Parse ware from handle
      const wareId = parseWareFromHandle(pending.handleId);
      if (!wareId) return;

      if (pending.handleType === 'source') {
        // Dragged from output handle -> create consumer at drop position
        triggerAutoCreate(wareId, pending.nodeId, 'consumer', flowPos);
      } else {
        // Dragged from input handle -> create producer at drop position
        triggerAutoCreate(wareId, pending.nodeId, 'producer', flowPos);
      }
    },
    [screenToFlowPosition, triggerAutoCreate]
  );

  // Convert plan modules to React Flow nodes (including Station I/O nodes)
  const nodes = useMemo<StationCanvasNode[]>(() => {
    if (!station) return [];

    const moduleNodes: ModuleNodeType[] = station.modules.map((module) => ({
      id: module.id,
      type: 'module',
      position: module.position,
      data: { module, onWareDoubleClick: handleWareDoubleClick },
      draggable: !module.locked,
      ...(measuredDimensions.get(module.id)
        ? { measured: measuredDimensions.get(module.id) }
        : { initialWidth: 240, initialHeight: 200 }),
    }));

    // Station Input node (always present)
    const stationInputNode: StationInputNodeType = {
      id: STATION_INPUT_ID,
      type: 'stationInput',
      position: station.stationInputPosition ?? defaultInputPosition,
      data: {},
      deletable: false,
      ...(measuredDimensions.get(STATION_INPUT_ID)
        ? { measured: measuredDimensions.get(STATION_INPUT_ID) }
        : { initialWidth: 200, initialHeight: 110 }),
    };

    // Station Output node (always present)
    const stationOutputNode: StationOutputNodeType = {
      id: STATION_OUTPUT_ID,
      type: 'stationOutput',
      position: station.stationOutputPosition ?? defaultOutputPosition,
      data: {},
      deletable: false,
      ...(measuredDimensions.get(STATION_OUTPUT_ID)
        ? { measured: measuredDimensions.get(STATION_OUTPUT_ID) }
        : { initialWidth: 200, initialHeight: 110 }),
    };

    return [stationInputNode, ...moduleNodes, stationOutputNode];
  }, [station, handleWareDoubleClick, measuredDimensions]);

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
        } else if (change.type === 'dimensions' && change.dimensions) {
          setMeasuredDimensions((prev) => {
            const existing = prev.get(change.id);
            if (existing?.width === change.dimensions!.width && existing?.height === change.dimensions!.height) {
              return prev;
            }
            const next = new Map(prev);
            next.set(change.id, change.dimensions!);
            return next;
          });
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
      connectionCompleted.current = true;
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
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
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
        <MiniMap
          nodeColor={(node) => {
            if (node.selected) return '#3b82f6';
            if (node.type === 'stationInput') return '#a855f7';
            if (node.type === 'stationOutput') return '#14b8a6';
            if (node.type === 'module') {
              const blueprintId = (node.data as ModuleNodeData | undefined)?.module?.blueprintId;
              if (blueprintId) {
                const type = getModuleType(blueprintId);
                if (type === 'production') return '#fb923c';
                if (type === 'habitat') return '#22c55e';
                if (type === 'storage') return '#3b82f6';
              }
            }
            return '#64748b';
          }}
          maskColor="rgba(0, 0, 0, 0.4)"
        />
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

      {/* Module Picker Dialog */}
      <ModulePickerDialog
        open={pickerState !== null}
        onClose={() => setPickerState(null)}
        candidates={pickerState?.candidates ?? []}
        onSelect={handlePickerSelect}
      />
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
