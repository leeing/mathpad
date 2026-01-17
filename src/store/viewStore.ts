import { create } from 'zustand';
import type { FlipType } from '../core/triangleTransform';

interface TriangleTransformSettings {
  scale: number;
  rotationDeg: number;
  flip: FlipType;
}

interface ViewState {
  scale: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  showGrid: boolean;
  showAxes: boolean;
  showHiddenElements: boolean;
  darkTheme: boolean;
  selectedElementY: number | null;
  hoveredId: string | null;
  mousePosition: { x: number; y: number } | null;
  contextMenu: { elementId: string | null; x: number; y: number } | null;
  examMode: boolean;
  suggestionsEnabled: boolean;
  sidebarCollapsed: boolean;
  triangleTransform: TriangleTransformSettings;

  setScale: (scale: number) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setSize: (size: { width: number; height: number }) => void;
  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  toggleShowHiddenElements: () => void;
  toggleDarkTheme: () => void;
  setSelectedElementY: (y: number | null) => void;
  setHoveredId: (id: string | null) => void;
  setMousePosition: (pos: { x: number; y: number } | null) => void;
  openContextMenu: (elementId: string | null, x: number, y: number) => void;
  closeContextMenu: () => void;
  toggleExamMode: () => void;
  setExamMode: (enabled: boolean) => void;
  toggleSuggestionsEnabled: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTriangleTransform: (settings: Partial<TriangleTransformSettings>) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  scale: 1,
  position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  size: { width: window.innerWidth, height: window.innerHeight },
  showGrid: true,
  showAxes: true,
  showHiddenElements: false,
  darkTheme: localStorage.getItem('mathpad-theme') !== null
    ? localStorage.getItem('mathpad-theme') === 'dark'
    : true,  // Default to dark mode
  selectedElementY: null,
  hoveredId: null,
  mousePosition: null,
  contextMenu: null,
  examMode: false,
  suggestionsEnabled: true,
  sidebarCollapsed: false,
  triangleTransform: { scale: 1, rotationDeg: 0, flip: 'none' },

  setScale: (scale) => set({ scale }),
  setPosition: (position) => set({ position }),
  setSize: (size) =>
    set((state) => {
      const wasCentered =
        Math.abs(state.position.x - state.size.width / 2) < 1 &&
        Math.abs(state.position.y - state.size.height / 2) < 1;

      return {
        size,
        position: wasCentered ? { x: size.width / 2, y: size.height / 2 } : state.position,
      };
    }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowAxes: (showAxes) => set({ showAxes }),
  toggleShowHiddenElements: () => set((state) => ({ showHiddenElements: !state.showHiddenElements })),
  toggleDarkTheme: () => set((state) => {
    const newTheme = !state.darkTheme;
    localStorage.setItem('mathpad-theme', newTheme ? 'dark' : 'light');
    return { darkTheme: newTheme };
  }),
  setSelectedElementY: (y) => set({ selectedElementY: y }),
  setHoveredId: (hoveredId) => set({ hoveredId }),
  setMousePosition: (mousePosition) => set({ mousePosition }),
  openContextMenu: (elementId, x, y) => set({ contextMenu: { elementId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
  toggleExamMode: () => set((state) => ({ examMode: !state.examMode })),
  setExamMode: (examMode) => set({ examMode }),
  toggleSuggestionsEnabled: () => set((state) => ({ suggestionsEnabled: !state.suggestionsEnabled })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setTriangleTransform: (settings) => set((state) => ({
    triangleTransform: { ...state.triangleTransform, ...settings }
  })),
}));
