import { create } from 'zustand';
import type { ContextMenuState } from '@/components/canvas/context-menu/types';

export type ViewMode = 'network' | 'station';
export type Theme = 'light' | 'dark' | 'system';
export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
}

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
  plansOpen: boolean;

  // Theme state
  theme: Theme;

  // Language state
  language: string;

  // Context menu state
  contextMenu: ContextMenuState | null;

  // Toast state
  toast: ToastState | null;

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
  setPlansOpen: (open: boolean) => void;

  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;

  openContextMenu: (state: ContextMenuState) => void;
  closeContextMenu: () => void;

  showToast: (message: string, type?: ToastType) => void;
  dismissToast: () => void;
}

let toastTimeoutId: NodeJS.Timeout | null = null;

export const useUIStore = create<UIStore>((set) => ({
  viewMode: 'network',
  activeStationId: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  sidebarOpen: true,
  reportOpen: false,
  plansOpen: false,
  theme: 'system',
  language: 'en',
  contextMenu: null,
  toast: null,

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
  setPlansOpen: (open) => set({ plansOpen: open }),

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),

  openContextMenu: (state) => set({ contextMenu: state }),
  closeContextMenu: () => set({ contextMenu: null }),

  showToast: (message, type = 'info') => {
    // Clear any existing timeout
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
    }

    // Set the new toast
    set({ toast: { message, type } });

    // Auto-dismiss after 3 seconds
    toastTimeoutId = setTimeout(() => {
      set({ toast: null });
      toastTimeoutId = null;
    }, 3000);
  },

  dismissToast: () => {
    // Clear timeout if exists
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
    set({ toast: null });
  },
}));
