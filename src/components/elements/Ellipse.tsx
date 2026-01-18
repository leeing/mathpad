import React, { useRef } from 'react';
import { Ellipse as KonvaEllipse } from 'react-konva';
import type { EllipseElement, PointElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import { useToolStore } from '../../store/toolStore';
import { PIXELS_PER_UNIT } from '../../constants/grid';
import Konva from 'konva';

interface EllipseProps {
    element: EllipseElement;
}

export const Ellipse: React.FC<EllipseProps> = ({ element }) => {
    // All hooks MUST be called before any early returns
    const { scale } = useViewStore();
    const examMode = useViewStore((state) => state.examMode);
    const showHiddenElements = useViewStore((state) => state.showHiddenElements);
    const hoveredId = useViewStore((state) => state.hoveredId);
    const setHoveredId = useViewStore((state) => state.setHoveredId);
    const activeTool = useToolStore((state) => state.activeTool);
    const updateElement = useGeoStore((state) => state.updateElement);
    const getElementById = useGeoStore((state) => state.getElementById);
    const selection = useGeoStore((state) => state.selection);

    // Store initial positions for drag
    const dragStartRef = useRef<{
        centerX: number;
        centerY: number;
        pixelX: number;
        pixelY: number;
        // Store initial positions of dependency points
        depPoints: { id: string; x: number; y: number }[];
    } | null>(null);

    // Handle visibility - if hidden and not in preview mode, don't render
    const isHidden = element.visible === false;
    if (isHidden && !showHiddenElements) {
        return null;
    }

    const darkTheme = useViewStore.getState().darkTheme;
    const isSelected = selection.includes(element.id);
    const isHovered = hoveredId === element.id;

    const handleMouseEnter = () => setHoveredId(element.id);
    const handleMouseLeave = () => setHoveredId(null);

    // Convert math coordinates to pixel coordinates
    const centerXPixel = element.centerX * PIXELS_PER_UNIT;
    const centerYPixel = -element.centerY * PIXELS_PER_UNIT; // Flip Y for canvas
    const radiusXPixel = element.a * PIXELS_PER_UNIT;
    const radiusYPixel = element.b * PIXELS_PER_UNIT;

    // Determine stroke color: user color takes priority, selection shown via shadow
    const getStrokeColor = () => {
        // User-defined color takes priority (selection indicated by shadow instead)
        if (element.style.stroke && element.style.stroke !== '#000') {
            return element.style.stroke;
        }
        if (isHovered) return '#f59e0b';
        // In dark mode, skip examMode colors to keep elements visible
        if (examMode && !darkTheme) return '#111827';
        return darkTheme ? '#e5e7eb' : '#000';
    };

    const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (activeTool !== 'select') {
            e.target.x(centerXPixel);
            e.target.y(centerYPixel);
            return;
        }

        // Get initial positions of all dependency points
        const depPoints: { id: string; x: number; y: number }[] = [];
        for (const depId of element.dependencies) {
            const depEl = getElementById(depId);
            if (depEl && depEl.type === 'point') {
                const point = depEl as PointElement;
                depPoints.push({ id: depId, x: point.x, y: point.y });
            }
        }

        dragStartRef.current = {
            centerX: element.centerX,
            centerY: element.centerY,
            pixelX: centerXPixel,
            pixelY: centerYPixel,
            depPoints
        };
    };

    const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (activeTool !== 'select' || !dragStartRef.current) {
            e.target.x(centerXPixel);
            e.target.y(centerYPixel);
            return;
        }

        // Calculate delta in PIXEL coordinates
        const dxPixel = e.target.x() - dragStartRef.current.pixelX;
        const dyPixel = e.target.y() - dragStartRef.current.pixelY;

        // Convert to math coordinates for center update
        const dxMath = dxPixel / PIXELS_PER_UNIT;
        const dyMath = -dyPixel / PIXELS_PER_UNIT;

        // Update ellipse center
        updateElement(element.id, {
            centerX: dragStartRef.current.centerX + dxMath,
            centerY: dragStartRef.current.centerY + dyMath
        });

        // Update all dependency points (move them by the same delta in pixel coords)
        for (const dep of dragStartRef.current.depPoints) {
            updateElement(dep.id, {
                x: dep.x + dxPixel,
                y: dep.y + dyPixel
            });
        }
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
            rotation={element.rotation * (180 / Math.PI)}
            stroke={getStrokeColor()}
            strokeWidth={element.style.strokeWidth ? element.style.strokeWidth / scale : 1.5 / scale}
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
            onContextMenu={(e) => {
                e.evt.preventDefault();
                const stage = e.target.getStage();
                const pointer = stage?.getPointerPosition();
                if (!pointer) return;
                useViewStore.getState().openContextMenu(element.id, pointer.x, pointer.y);
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            shadowColor={isSelected ? '#dc2626' : (isHovered ? '#f59e0b' : undefined)}
            shadowBlur={isSelected ? 8 : (isHovered ? 6 : 0)}
            shadowEnabled={isSelected || isHovered}
            opacity={isHidden ? 0.4 : 1}
        />
    );
};
