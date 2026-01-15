import React, { useRef } from 'react';
import { Ellipse as KonvaEllipse } from 'react-konva';
import type { EllipseElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import { useToolStore } from '../../store/toolStore';
import { PIXELS_PER_UNIT } from '../../constants/grid';
import Konva from 'konva';

interface EllipseProps {
    element: EllipseElement;
}

export const Ellipse: React.FC<EllipseProps> = ({ element }) => {
    const { scale } = useViewStore();
    const activeTool = useToolStore((state) => state.activeTool);
    const updateElement = useGeoStore((state) => state.updateElement);

    const darkTheme = useViewStore.getState().darkTheme;
    const selection = useGeoStore((state) => state.selection);
    const isSelected = selection.includes(element.id);

    // Track initial position for drag
    const dragStartRef = useRef<{ centerX: number; centerY: number } | null>(null);

    // Convert math coordinates to pixel coordinates
    const centerXPixel = element.centerX * PIXELS_PER_UNIT;
    const centerYPixel = -element.centerY * PIXELS_PER_UNIT; // Flip Y for canvas
    const radiusXPixel = element.a * PIXELS_PER_UNIT;
    const radiusYPixel = element.b * PIXELS_PER_UNIT;

    // Determine stroke color
    const getStrokeColor = () => {
        if (isSelected) return '#3b82f6';
        if (element.style.stroke && element.style.stroke !== '#000') {
            return element.style.stroke;
        }
        return darkTheme ? '#e5e7eb' : '#000';
    };

    const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (activeTool !== 'select') {
            e.target.x(centerXPixel);
            e.target.y(centerYPixel);
            return;
        }
        dragStartRef.current = { centerX: element.centerX, centerY: element.centerY };
    };

    const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (activeTool !== 'select' || !dragStartRef.current) {
            e.target.x(centerXPixel);
            e.target.y(centerYPixel);
            return;
        }
        // Calculate delta in math coordinates (flip Y back)
        const dx = (e.target.x() - centerXPixel) / PIXELS_PER_UNIT;
        const dy = -(e.target.y() - centerYPixel) / PIXELS_PER_UNIT;

        updateElement(element.id, {
            centerX: dragStartRef.current.centerX + dx,
            centerY: dragStartRef.current.centerY + dy
        });
    };

    const handleDragEnd = () => {
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
        <KonvaEllipse
            x={centerXPixel}
            y={centerYPixel}
            radiusX={radiusXPixel}
            radiusY={radiusYPixel}
            rotation={element.rotation * (180 / Math.PI)} // Convert radians to degrees
            stroke={getStrokeColor()}
            strokeWidth={element.style.strokeWidth ? element.style.strokeWidth / scale : 2 / scale}
            dash={element.style.dash ? element.style.dash.map(d => d / scale) : undefined}
            fill={element.style.fill || 'transparent'}
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
        />
    );
};
