import { create } from 'zustand';

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
  contextMenu: { elementId: string; x: number; y: number } | null;
  
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
  openContextMenu: (elementId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  scale: 1,
  position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  size: { width: window.innerWidth, height: window.innerHeight },
  showGrid: true,
  showAxes: true,
  showHiddenElements: false,
  darkTheme: false,
  selectedElementY: null,
  hoveredId: null,
  mousePosition: null,
  contextMenu: null,
  
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
  toggleDarkTheme: () => set((state) => ({ darkTheme: !state.darkTheme })),
  setSelectedElementY: (y) => set({ selectedElementY: y }),
  setHoveredId: (hoveredId) => set({ hoveredId }),
  setMousePosition: (mousePosition) => set({ mousePosition }),
  openContextMenu: (elementId, x, y) => set({ contextMenu: { elementId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
}));
