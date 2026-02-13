import { create } from 'zustand';
import type { ContextMenuState } from '@/components/canvas/context-menu/types';

export type ViewMode = 'network' | 'station';
export type Theme = 'light' | 'dark' | 'system';

interface UIStore {
  // View state
  viewMode: ViewMode;
  activeStationId: string | null;

  // Selection state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Panel state
  sidebarOpen: boolean;
  reportOpen: boolean;

  // Theme state
  theme: Theme;

  // Language state
  language: string;

  // Context menu state
  contextMenu: ContextMenuState | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  drillIntoStation: (stationId: string) => void;
  exitStationView: () => void;

  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleReport: () => void;
  setReportOpen: (open: boolean) => void;

  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;

  openContextMenu: (state: ContextMenuState) => void;
  closeContextMenu: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'network',
  activeStationId: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  sidebarOpen: true,
  reportOpen: false,
  theme: 'system',
  language: 'en',
  contextMenu: null,

  setViewMode: (mode) => set({ viewMode: mode }),

  drillIntoStation: (stationId) =>
    set({
      viewMode: 'station',
      activeStationId: stationId,
      selectedNodeId: null,
      selectedEdgeId: null,
      contextMenu: null,
    }),

  exitStationView: () =>
    set({
      viewMode: 'network',
      activeStationId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      contextMenu: null,
    }),

  selectNode: (nodeId) =>
    set({
      selectedNodeId: nodeId,
      selectedEdgeId: null,
    }),

  selectEdge: (edgeId) =>
    set({
      selectedNodeId: null,
      selectedEdgeId: edgeId,
    }),

  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedEdgeId: null,
    }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleReport: () => set((state) => ({ reportOpen: !state.reportOpen })),
  setReportOpen: (open) => set({ reportOpen: open }),

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),

  openContextMenu: (state) => set({ contextMenu: state }),
  closeContextMenu: () => set({ contextMenu: null }),
}));
