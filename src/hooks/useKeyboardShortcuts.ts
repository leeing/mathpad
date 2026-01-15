import { useEffect } from 'react';
import { useToolStore } from '../store/toolStore';
import { useGeoStore, useTemporalStore } from '../store/geoStore';

export function useKeyboardShortcuts() {
    const setActiveTool = useToolStore((state) => state.setActiveTool);
    const resetConstruction = useToolStore((state) => state.resetConstruction);
    const selectedId = useToolStore((state) => state.selectedId);
    const setSelectedId = useToolStore((state) => state.setSelectedId);
    const removeElement = useGeoStore((state) => state.removeElement);
    const selection = useGeoStore((state) => state.selection);
    const setSelection = useGeoStore((state) => state.setSelection);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in input fields
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // Undo: Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                const { undo } = useTemporalStore().getState();
                undo();
                return;
            }

            // Redo: Ctrl+Y or Cmd+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                const { redo } = useTemporalStore().getState();
                redo();
                return;
            }

            // Select All: Ctrl+A or Cmd+A
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                const allIds = Object.keys(useGeoStore.getState().elements);
                setSelection(allIds);
                return;
            }

            // Tool shortcuts (only when no modifier keys)
            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'v':
                        setActiveTool('select');
                        break;
                    case 'p':
                        setActiveTool('point');
                        break;
                    case 'l':
                        setActiveTool('line');
                        break;
                    case 'c':
                        setActiveTool('circle');
                        break;
                    case 'r':
                        setActiveTool('rectangle');
                        break;
                    case 'escape':
                        resetConstruction();
                        setSelectedId(null);
                        setSelection([]);
                        break;
                    case 'delete':
                    case 'backspace':
                        // Delete all selected elements (from geoStore.selection[])
                        if (selection.length > 0) {
                            selection.forEach(id => removeElement(id));
                            setSelection([]);
                        } else if (selectedId) {
                            // Fallback to single selection from toolStore
                            removeElement(selectedId);
                            setSelectedId(null);
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setActiveTool, resetConstruction, selectedId, setSelectedId, removeElement, selection, setSelection]);
}

