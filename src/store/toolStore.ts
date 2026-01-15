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

interface ToolState {
  activeTool: ToolType;
  selectedId: string | null;
  constructionStep: number;
  tempIds: string[];
  setActiveTool: (tool: ToolType) => void;
  setSelectedId: (id: string | null) => void;
  setConstructionStep: (step: number) => void;
  addTempId: (id: string) => void;
  resetConstruction: () => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: 'select',
  selectedId: null,
  constructionStep: 0,
  tempIds: [],
  setActiveTool: (tool) => set({ activeTool: tool, constructionStep: 0, tempIds: [], selectedId: null }),
  setSelectedId: (id) => set({ selectedId: id }),
  setConstructionStep: (step) => set({ constructionStep: step }),
  addTempId: (id) => set((state) => ({ tempIds: [...state.tempIds, id] })),
  resetConstruction: () => set({ constructionStep: 0, tempIds: [] }),
}));

