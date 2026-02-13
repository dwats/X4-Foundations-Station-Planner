import { useCallback, useMemo, useRef } from 'react';
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
  type NodeTypes,
  type EdgeTypes,
  type Viewport,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { usePlanStore, useUIStore } from '@/store';
import {
  StationNode,
  SectorGroup,
  type StationNodeType,
  type SectorGroupType,
} from '@/components/nodes';
import { ResourceEdge, type ResourceEdgeType } from '@/components/edges';
import { ContextMenuShell } from './context-menu';

// Register custom node types
const nodeTypes: NodeTypes = {
  station: StationNode,
  sector: SectorGroup,
};

// Register custom edge types
const edgeTypes: EdgeTypes = {
  resource: ResourceEdge,
};

type AllNodeTypes = StationNodeType | SectorGroupType;

function NetworkCanvasInner() {
  const { setViewport, screenToFlowPosition } = useReactFlow();

  // Use granular selectors to ensure re-renders on changes
  const stations = usePlanStore((state) => state.plan.stations);
  const sectors = usePlanStore((state) => state.plan.sectors);
  const connections = usePlanStore((state) => state.plan.connections);
  const computed = usePlanStore((state) => state.computed);
  const updateStation = usePlanStore((state) => state.updateStation);
  const updateSector = usePlanStore((state) => state.updateSector);
  const removeStation = usePlanStore((state) => state.removeStation);
  const removeSector = usePlanStore((state) => state.removeSector);
  const moveStationToSector = usePlanStore((state) => state.moveStationToSector);
  const addConnection = usePlanStore((state) => state.addConnection);
  const removeConnection = usePlanStore((state) => state.removeConnection);

  const selectNode = useUIStore((state) => state.selectNode);
  const selectEdge = useUIStore((state) => state.selectEdge);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const openContextMenu = useUIStore((state) => state.openContextMenu);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Convert plan sectors and stations to React Flow nodes
  // Sectors are rendered first (lower z-index) so stations appear on top
  const nodes = useMemo<AllNodeTypes[]>(() => {
    const sectorNodes: SectorGroupType[] = sectors.map((sector) => ({
      id: sector.id,
      type: 'sector',
      position: sector.position,
      data: { sector },
      // Use width/height props instead of style for NodeResizer compatibility
      width: sector.size.width,
      height: sector.size.height,
      zIndex: -1,
      draggable: !sector.locked,
    }));

    const stationNodes: StationNodeType[] = stations.map((station) => ({
      id: station.id,
      type: 'station',
      position: station.position,
      data: { station },
      zIndex: 1,
      draggable: !station.locked,
    }));

    return [...sectorNodes, ...stationNodes];
  }, [sectors, stations]);

  // Convert plan connections to React Flow edges
  const edges = useMemo<ResourceEdgeType[]>(() => {
    return connections.map((conn) => ({
      id: conn.id,
      source: conn.sourceStationId,
      target: conn.targetStationId,
      sourceHandle: conn.wareId ? `output-${conn.wareId}` : undefined,
      targetHandle: conn.wareId ? `input-${conn.wareId}` : undefined,
      type: 'resource',
      data: { connection: conn },
    }));
  }, [connections]);

  // Check if a position is inside a sector's bounds
  const findSectorAtPosition = useCallback(
    (x: number, y: number) => {
      for (const sector of sectors) {
        const inBounds =
          x >= sector.position.x &&
          x <= sector.position.x + sector.size.width &&
          y >= sector.position.y &&
          y <= sector.position.y + sector.size.height;

        if (inBounds) {
          return sector.id;
        }
      }
      return null;
    },
    [sectors]
  );

  // Handle node changes (position, selection, removal)
  // Note: dimensions are handled by SectorGroup's onResizeEnd to avoid feedback loops
  const onNodesChange: OnNodesChange<AllNodeTypes> = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          // Check if this is a station or sector
          const station = stations.find((s) => s.id === change.id);
          const sector = sectors.find((s) => s.id === change.id);

          if (station) {
            updateStation(change.id, { position: change.position });
          } else if (sector) {
            // Calculate movement delta
            const deltaX = change.position.x - sector.position.x;
            const deltaY = change.position.y - sector.position.y;

            // Update sector position
            updateSector(change.id, { position: change.position });

            // Move all stations in this sector by the same delta
            if (deltaX !== 0 || deltaY !== 0) {
              stations
                .filter((s) => s.sectorId === sector.id)
                .forEach((s) => {
                  updateStation(s.id, {
                    position: {
                      x: s.position.x + deltaX,
                      y: s.position.y + deltaY,
                    },
                  });
                });
            }
          }
        } else if (change.type === 'remove') {
          const station = stations.find((s) => s.id === change.id);
          const sector = sectors.find((s) => s.id === change.id);

          if (station) {
            removeStation(change.id);
          } else if (sector) {
            removeSector(change.id);
          }
        } else if (change.type === 'select') {
          if (change.selected) {
            selectNode(change.id);
          }
        }
      });
    },
    [stations, sectors, updateStation, updateSector, removeStation, removeSector, selectNode]
  );

  // Handle station drag end - check if dropped into/out of a sector
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: AllNodeTypes) => {
      // Only process stations
      const station = stations.find((s) => s.id === node.id);
      if (!station) return;

      // Find which sector (if any) the station center is now inside
      const centerX = node.position.x + 80; // Approximate center (node width ~160)
      const centerY = node.position.y + 50; // Approximate center
      const newSectorId = findSectorAtPosition(centerX, centerY);

      // Update if sector assignment changed
      if (newSectorId !== station.sectorId) {
        moveStationToSector(station.id, newSectorId);
      }
    },
    [stations, findSectorAtPosition, moveStationToSector]
  );

  // Handle edge changes (removal)
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'remove') {
          removeConnection(change.id);
        } else if (change.type === 'select' && change.selected) {
          selectEdge(change.id);
        }
      });
    },
    [removeConnection, selectEdge]
  );

  // Parse ware ID from handle ID (format: "output-{wareId}" or "input-{wareId}")
  const parseWareFromHandle = (handleId: string | null): string => {
    if (!handleId) return '';
    const parts = handleId.split('-');
    // Handle IDs are like "output-energycells" or "input-ore"
    // Return everything after the first dash (to handle ware IDs with dashes)
    return parts.slice(1).join('-');
  };

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle) {
        // Extract wareId from the source handle (output-{wareId})
        const wareId = parseWareFromHandle(connection.sourceHandle);

        // Find source station's REMAINING output for this ware (what's still available after existing connections)
        // This uses stationOutputs - externallyConsumed, respecting manual connection amounts
        const sourceComputed = computed.stations.find(
          (s) => s.stationId === connection.source
        );
        const sourceOutput = sourceComputed?.remainingOutputs.find(
          (o) => o.wareId === wareId
        );

        // Find target station's REMAINING input for this ware (what's still needed after existing connections)
        // This uses stationInputs - externallySupplied, respecting manual connection amounts
        const targetComputed = computed.stations.find(
          (s) => s.stationId === connection.target
        );
        const targetInput = targetComputed?.remainingInputs.find(
          (i) => i.wareId === wareId
        );

        // For auto mode, amount is computed dynamically, but we store a reasonable default
        const defaultAmount = targetInput
          ? Math.min(sourceOutput?.amount ?? 0, targetInput.amount)
          : sourceOutput?.amount ?? 0;

        addConnection({
          sourceStationId: connection.source,
          targetStationId: connection.target,
          wareId,
          amount: defaultAmount,
          mode: 'auto', // New connections default to auto mode
        });
      }
    },
    [addConnection, computed.stations]
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
        target: { type: 'pane', viewMode: 'network' },
      });
    },
    [openContextMenu, screenToFlowPosition]
  );

  // Handle right-click on nodes
  const onNodeContextMenu: NodeMouseHandler<AllNodeTypes> = useCallback(
    (event, node) => {
      event.preventDefault();
      selectNode(node.id);
      openContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        target: { type: 'node', nodeId: node.id, nodeType: node.type ?? 'station', viewMode: 'network' },
      });
    },
    [openContextMenu, screenToFlowPosition, selectNode]
  );

  // Handle right-click on edges
  const onEdgeContextMenu: EdgeMouseHandler<ResourceEdgeType> = useCallback(
    (event, edge) => {
      event.preventDefault();
      selectEdge(edge.id);
      openContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        target: { type: 'edge', edgeId: edge.id, edgeType: edge.type ?? 'resource', viewMode: 'network' },
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

        if (selectedNodeId) {
          // Check if it's a station or sector
          const station = stations.find((s) => s.id === selectedNodeId);
          const sector = sectors.find((s) => s.id === selectedNodeId);

          if (station) {
            removeStation(selectedNodeId);
          } else if (sector) {
            removeSector(selectedNodeId);
          }
          clearSelection();
        } else if (selectedEdgeId) {
          removeConnection(selectedEdgeId);
          clearSelection();
        }
      }
    },
    [stations, sectors, removeStation, removeSector, removeConnection, clearSelection]
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
        onNodeDragStop={onNodeDragStop}
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
            if (node.type === 'sector') {
              return node.selected ? '#3b82f6' : '#475569';
            }
            return node.selected ? '#3b82f6' : '#64748b';
          }}
          maskColor="rgba(0, 0, 0, 0.4)"
        />
      </ReactFlow>

      {/* Context Menu */}
      <ContextMenuShell />
    </div>
  );
}

export function NetworkCanvas() {
  return (
    <ReactFlowProvider>
      <NetworkCanvasInner />
    </ReactFlowProvider>
  );
}
