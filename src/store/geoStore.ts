import { create } from 'zustand';
import { temporal } from 'zundo';
import { persist } from 'zustand/middleware';
import type { GeoElement } from '../types/geoElements';
import { calculateElement } from '../core/geometry';

// State that will be tracked by undo/redo
interface GeoState {
  elements: Record<string, GeoElement>;
}

// Full store interface
interface GeoStore extends GeoState {
  selection: string[];

  addElement: (element: GeoElement) => void;
  updateElement: (id: string, updates: Partial<GeoElement>) => void;
  removeElement: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearAll: () => void;
  loadElements: (elements: Record<string, GeoElement>) => void;

  getElementById: (id: string) => GeoElement | undefined;
}

// Helper: get next available point name (A, B, C...)
const getNextPointName = (elements: Record<string, GeoElement>): string => {
  const usedNames = new Set(
    Object.values(elements)
      .filter(e => e.type === 'point')
      .map(e => e.name)
  );
  for (let i = 0; i < 26; i++) {
    const name = String.fromCharCode(65 + i); // A, B, C...
    if (!usedNames.has(name)) return name;
  }
  // If all letters used, try A1, B1, etc.
  for (let i = 0; i < 26; i++) {
    const name = String.fromCharCode(65 + i) + '₁';
    if (!usedNames.has(name)) return name;
  }
  return 'P';
};

// Create store with temporal (undo/redo) and persist (localStorage) middleware
export const useGeoStore = create<GeoStore>()(
  persist(
    temporal(
      (set, get) => ({
        elements: {},
        selection: [],

        addElement: (element) => set((state) => {
          // Auto-assign name for points if not provided or default
          let finalElement = element;
          if (element.type === 'point' && (element.name === 'P' || !element.name)) {
            finalElement = { ...element, name: getNextPointName(state.elements) };
          }

          // Calculate initial values for derived elements (labels, angles, etc.)
          const calculated = calculateElement(finalElement, (id) =>
            state.elements[id] || (id === finalElement.id ? finalElement : undefined)
          );
          const elementWithCalculatedValues = calculated
            ? { ...finalElement, ...calculated }
            : finalElement;

          return {
            elements: { ...state.elements, [element.id]: elementWithCalculatedValues as GeoElement }
          };
        }),

        updateElement: (id, updates) => set((state) => {
          const oldEl = state.elements[id];
          if (!oldEl) return state;

          const newEl = { ...oldEl, ...updates } as GeoElement;
          const newElements: Record<string, GeoElement> = { ...state.elements, [id]: newEl };

          // Cascade updates to dependents
          const queue = [id];
          const visited = new Set<string>();
          let iterations = 0;
          const MAX_ITERATIONS = 1000;

          while (queue.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const children = Object.values(newElements).filter(el =>
              el.dependencies.includes(currentId)
            );

            for (const child of children) {
              const calculated = calculateElement(child, (eid) => newElements[eid]);
              if (calculated) {
                newElements[child.id] = { ...child, ...calculated } as GeoElement;
                queue.push(child.id);
              }
            }
          }

          return { elements: newElements };
        }),

        removeElement: (id) => set((state) => {
          const toRemove = new Set<string>([id]);

          // Find all dependents recursively
          let foundNew = true;
          while (foundNew) {
            foundNew = false;
            Object.values(state.elements).forEach(el => {
              if (!toRemove.has(el.id) && el.dependencies.some(depId => toRemove.has(depId))) {
                toRemove.add(el.id);
                foundNew = true;
              }
            });
          }

          const newElements: Record<string, GeoElement> = {};
          Object.entries(state.elements).forEach(([elId, el]) => {
            if (!toRemove.has(elId)) {
              newElements[elId] = el;
            }
          });
          return { elements: newElements };
        }),

        setSelection: (ids) => set({ selection: ids }),

        clearAll: () => set({ elements: {}, selection: [] }),

        loadElements: (elements) => set({ elements, selection: [] }),

        getElementById: (id) => get().elements[id],
      }),
      {
        // Only track 'elements' for undo/redo, not 'selection'
        partialize: (state) => ({ elements: state.elements }),
        limit: 50, // Keep 50 history states
      }
    ),
    {
      name: 'mathpad-storage', // localStorage key
      partialize: (state) => ({ elements: state.elements }), // Only persist elements
    }
  )
);

// Export temporal store for undo/redo access
export const useTemporalStore = () => useGeoStore.temporal;

