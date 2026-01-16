import { create } from 'zustand';

export type ToolType =
  | 'select'
  | 'point'
  | 'line'
  | 'circle'
  | 'rectangle'
  | 'arc'
  | 'vector'
  | 'ellipse'
  | 'hyperbola'
  | 'parabola'
  | 'template'       // v0.12.0 - 图形模板
  | 'perpendicular'
  | 'parallel'
  | 'midpoint'
  | 'incenter'
  | 'circumcenter'
  | 'tangent'
  | 'segment_mark'
  | 'congruent'
  | 'similar'
  | 'auxiliary'
  | 'text'
  | 'measure_length'
  | 'measure_angle'
  | 'verify_triangle';

export type EllipseMode = 'foci' | 'center' | 'equation';
export type ParabolaMode = 'focus_directrix' | 'vertex_focus' | 'equation';

interface ToolState {
  activeTool: ToolType;
  selectedId: string | null;
  constructionStep: number;
  tempIds: string[];
  ellipseMode: EllipseMode;
  parabolaMode: ParabolaMode;
  setActiveTool: (tool: ToolType) => void;
  setSelectedId: (id: string | null) => void;
  setConstructionStep: (step: number) => void;
  addTempId: (id: string) => void;
  resetConstruction: () => void;
  setEllipseMode: (mode: EllipseMode) => void;
  setParabolaMode: (mode: ParabolaMode) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'select',
  selectedId: null,
  constructionStep: 0,
  tempIds: [],
  ellipseMode: 'equation',
  parabolaMode: 'equation',
  setActiveTool: (tool) => set({ activeTool: tool, constructionStep: 0, tempIds: [], selectedId: null }),
  setSelectedId: (id) => set({ selectedId: id }),
  setConstructionStep: (step) => set({ constructionStep: step }),
  addTempId: (id) => set((state) => ({ tempIds: [...state.tempIds, id] })),
  resetConstruction: () => set({ constructionStep: 0, tempIds: [] }),
  setEllipseMode: (mode) => set({ ellipseMode: mode, constructionStep: 0, tempIds: [] }),
  setParabolaMode: (mode) => set({ parabolaMode: mode, constructionStep: 0, tempIds: [] }),
}));
