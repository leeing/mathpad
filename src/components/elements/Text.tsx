import React from 'react';
import { Text as KonvaText } from 'react-konva';
import type { TextElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useToolStore } from '../../store/toolStore';
import { useGeoStore } from '../../store/geoStore';

interface TextProps {
    element: TextElement;
}

export const Text: React.FC<TextProps> = ({ element }) => {
    const { scale } = useViewStore();
    const examMode = useViewStore((state) => state.examMode);
    const darkTheme = useViewStore((state) => state.darkTheme);
    const activeTool = useToolStore((state) => state.activeTool);
    const selectedId = useToolStore((state) => state.selectedId);
    const setSelectedId = useToolStore((state) => state.setSelectedId);
    const updateElement = useGeoStore((state) => state.updateElement);
    const setSelection = useGeoStore((state) => state.setSelection);

    if (!element.visible) return null;

    const isSelected = selectedId === element.id;
    const fill = isSelected ? '#3b82f6' : (examMode ? '#111827' : (element.style.stroke || (darkTheme ? '#f3f4f6' : '#111827')));

    return (
        <KonvaText
            x={element.x}
            y={element.y}
            text={element.content}
            fontSize={element.fontSize / scale}
            fill={fill}
            draggable={activeTool === 'select'}
            onDragMove={(e) => {
                if (activeTool !== 'select') return;
                updateElement(element.id, { x: e.target.x(), y: e.target.y() });
            }}
            onClick={() => {
                if (activeTool !== 'select') return;
                setSelectedId(element.id);
                setSelection([element.id]);
            }}
            onContextMenu={(e) => {
                e.evt.preventDefault();
                const stage = e.target.getStage();
                const pointer = stage?.getPointerPosition();
                if (!pointer) return;
                useViewStore.getState().openContextMenu(element.id, pointer.x, pointer.y);
            }}
            listening={activeTool === 'select'}
        />
    );
};
