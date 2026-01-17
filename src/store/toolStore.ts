import { create } from 'zustand';
import { useGeoStore } from './geoStore';

export type ToolType =
  | 'select'
  | 'point'
  | 'line'
  | 'straight_line'
  | 'circle'
  | 'rectangle'
  | 'triangle'
  | 'arc'
  | 'vector'
  | 'ellipse'
  | 'hyperbola'
  | 'parabola'
  | 'function'        // 函数图像
  | 'perpendicular'
  | 'parallel'
  | 'midpoint'
  | 'incenter'
  | 'circumcenter'
  | 'tangent'
  | 'segment_mark'
  | 'auxiliary'
  | 'text'
  | 'measure_length'
  | 'measure_angle'
  | 'congruent'
  | 'similar';

export type EllipseMode = 'foci' | 'center' | 'equation';
export type ParabolaMode = 'focus_directrix' | 'vertex_focus' | 'equation' | 'general_equation';

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
  setActiveTool: (tool) => {
    // Clear geoStore selection when switching tools
    useGeoStore.getState().setSelection([]);
    set({ activeTool: tool, constructionStep: 0, tempIds: [], selectedId: null });
  },
  setSelectedId: (id) => set({ selectedId: id }),
  setConstructionStep: (step) => set({ constructionStep: step }),
  addTempId: (id) => set((state) => ({ tempIds: [...state.tempIds, id] })),
  resetConstruction: () => set({ constructionStep: 0, tempIds: [] }),
  setEllipseMode: (mode) => set({ ellipseMode: mode, constructionStep: 0, tempIds: [] }),
  setParabolaMode: (mode) => set({ parabolaMode: mode, constructionStep: 0, tempIds: [] }),
}));
