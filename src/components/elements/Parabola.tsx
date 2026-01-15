import React, { useMemo, useRef } from 'react';
import { Line as KonvaLine } from 'react-konva';
import type { ParabolaElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import { useToolStore } from '../../store/toolStore';
import { PIXELS_PER_UNIT } from '../../constants/grid';
import Konva from 'konva';

interface ParabolaProps {
    element: ParabolaElement;
}

export const Parabola: React.FC<ParabolaProps> = ({ element }) => {
    const { scale, size } = useViewStore();
    const activeTool = useToolStore((state) => state.activeTool);
    const updateElement = useGeoStore((state) => state.updateElement);

    const darkTheme = useViewStore.getState().darkTheme;
    const selection = useGeoStore((state) => state.selection);
    const isSelected = selection.includes(element.id);

    // Track initial position for drag
    const dragStartRef = useRef<{ vertexX: number; vertexY: number } | null>(null);

    // Convert math coordinates to pixel coordinates
    const vertexXPixel = element.vertexX * PIXELS_PER_UNIT;
    const vertexYPixel = -element.vertexY * PIXELS_PER_UNIT; // Flip Y for canvas
    const pPixel = element.p * PIXELS_PER_UNIT;

    // Generate parabola points
    const points = useMemo(() => {
        const pts: number[] = [];
        const range = Math.max(size.width, size.height) / scale;
        const step = 2; // pixels per step

        // Parabola equation: y² = 4px (for right direction)
        // Parameterized: x = t²/(4p), y = t

        if (element.direction === 'right' || element.direction === 'left') {
            const sign = element.direction === 'right' ? 1 : -1;
            for (let t = -range; t <= range; t += step) {
                const x = vertexXPixel + sign * (t * t) / (4 * pPixel);
                const y = vertexYPixel + t;
                pts.push(x, y);
            }
        } else {
            // up or down
            const sign = element.direction === 'down' ? 1 : -1;
            for (let t = -range; t <= range; t += step) {
                const x = vertexXPixel + t;
                const y = vertexYPixel + sign * (t * t) / (4 * pPixel);
                pts.push(x, y);
            }
        }

        return pts;
    }, [element, vertexXPixel, vertexYPixel, pPixel, size, scale]);

    // Determine stroke color
    const getStrokeColor = () => {
        if (isSelected) return '#3b82f6';
        if (element.style.stroke && element.style.stroke !== '#000') {
            return element.style.stroke;
        }
        return darkTheme ? '#e5e7eb' : '#000';
    };

    const handleDragStart = () => {
        if (activeTool !== 'select') return;
        dragStartRef.current = { vertexX: element.vertexX, vertexY: element.vertexY };
    };

    const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (activeTool !== 'select' || !dragStartRef.current) return;

        // For Line shapes, we need to calculate delta from the group offset
        const dx = e.target.x() / PIXELS_PER_UNIT;
        const dy = -e.target.y() / PIXELS_PER_UNIT; // Flip Y

        updateElement(element.id, {
            vertexX: dragStartRef.current.vertexX + dx,
            vertexY: dragStartRef.current.vertexY + dy
        });
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        // Reset the Konva transform so it doesn't accumulate
        e.target.x(0);
        e.target.y(0);
        dragStartRef.current = null;
    };

    const handleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (activeTool === 'select') {
            e.cancelBubble = true;
            const { selection, setSelection } = useGeoStore.getState();
            const nativeEvent = e.evt as MouseEvent;

            if (nativeEvent.shiftKey) {
                if (selection.includes(element.id)) {
                    setSelection(selection.filter(id => id !== element.id));
                } else {
                    setSelection([...selection, element.id]);
                }
            } else {
                setSelection([element.id]);
            }
            useToolStore.getState().setSelectedId(element.id);
            return;
        }
    };

    return (
        <KonvaLine
            points={points}
            stroke={getStrokeColor()}
            strokeWidth={element.style.strokeWidth ? element.style.strokeWidth / scale : 2 / scale}
            dash={element.style.dash ? element.style.dash.map(d => d / scale) : undefined}
            hitStrokeWidth={10 / scale}
            listening={activeTool === 'select'}
            draggable={activeTool === 'select'}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onTap={handleClick}
            shadowColor={isSelected ? '#3b82f6' : undefined}
            shadowBlur={isSelected ? 8 : 0}
            shadowEnabled={isSelected}
            tension={0}
        />
    );
};
