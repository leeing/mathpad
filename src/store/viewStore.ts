import { create } from 'zustand';

interface ContextMenuState {
  elementId: string;
  x: number;
  y: number;
}

interface ViewState {
  scale: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  showGrid: boolean;
  showAxes: boolean;
  mousePosition: { x: number; y: number } | null;
  darkTheme: boolean;
  showHiddenElements: boolean;
  hoveredId: string | null;
  contextMenu: ContextMenuState | null;
  selectedElementY: number | null; // Y position of selected element in sidebar
  setScale: (scale: number) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setSize: (size: { width: number; height: number }) => void;
  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setMousePosition: (pos: { x: number; y: number } | null) => void;
  centerOnOrigin: () => void;
  toggleDarkTheme: () => void;
  toggleShowHiddenElements: () => void;
  setHoveredId: (id: string | null) => void;
  openContextMenu: (elementId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
  setSelectedElementY: (y: number | null) => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  scale: 1,
  position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  size: { width: window.innerWidth, height: window.innerHeight },
  showGrid: true,
  showAxes: true,
  mousePosition: null,
  darkTheme: false,
  showHiddenElements: false,
  hoveredId: null,
  contextMenu: null,
  selectedElementY: null,
  setScale: (scale) => set({ scale }),
  setPosition: (position) => set({ position }),
  setSize: (size) => set({ size }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowAxes: (showAxes) => set({ showAxes }),
  setMousePosition: (mousePosition) => set({ mousePosition }),
  centerOnOrigin: () => {
    const { size } = get();
    set({ position: { x: size.width / 2, y: size.height / 2 } });
  },
  toggleDarkTheme: () => set((state) => ({ darkTheme: !state.darkTheme })),
  toggleShowHiddenElements: () => set((state) => ({ showHiddenElements: !state.showHiddenElements })),
  setHoveredId: (hoveredId) => set({ hoveredId }),
  openContextMenu: (elementId, x, y) => set({ contextMenu: { elementId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
  setSelectedElementY: (selectedElementY) => set({ selectedElementY }),
}));

