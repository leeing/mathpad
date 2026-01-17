import React, { useMemo } from 'react';
import { Line } from 'react-konva';
import type { ParabolaElement, PointElement, LineElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import { useToolStore } from '../../store/toolStore';
import { PIXELS_PER_UNIT } from '../../constants/grid';
import { parabolaPointsByFocusDirectrix, parabolaPointsByVertexFocus } from '../../core/parabola';
import Konva from 'konva';

interface ParabolaProps {
    element: ParabolaElement;
}

export const Parabola: React.FC<ParabolaProps> = ({ element }) => {
    const { scale, size } = useViewStore();
    const examMode = useViewStore((state) => state.examMode);
    const showHiddenElements = useViewStore((state) => state.showHiddenElements);
    const hoveredId = useViewStore((state) => state.hoveredId);
    const setHoveredId = useViewStore((state) => state.setHoveredId);
    const activeTool = useToolStore((state) => state.activeTool);
    const selection = useGeoStore((state) => state.selection);
    const getElementById = useGeoStore((state) => state.getElementById);

    // Handle visibility
    const isHidden = element.visible === false;
    if (isHidden && !showHiddenElements) {
        return null;
    }

    const darkTheme = useViewStore.getState().darkTheme;
    const isSelected = selection.includes(element.id);
    const isHovered = hoveredId === element.id;


    const handleMouseEnter = () => setHoveredId(element.id);
    const handleMouseLeave = () => setHoveredId(null);

    const getStrokeColor = () => {
        // User-defined color takes priority (selection indicated by shadow instead)
        if (element.style.stroke && element.style.stroke !== '#000') {
            return element.style.stroke;
        }
        if (isHovered) return '#f59e0b';
        if (examMode) return '#111827';
        return darkTheme ? '#e5e7eb' : '#000';
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

    const points = useMemo(() => {
        const pts: number[] = [];
        const tMax = Math.max(size.width, size.height) / scale;
        const samples = 160;

        const def = element.definition;

        if (def.type === 'parabola_by_equation') {
            const { p, direction } = def;
            const vX = (element.vertexX || 0) * PIXELS_PER_UNIT;
            const vY = -(element.vertexY || 0) * PIXELS_PER_UNIT;
            const pPixels = p * PIXELS_PER_UNIT;

            for (let i = -samples; i <= samples; i++) {
                const t = (i / samples) * tMax;
                let x = 0, y = 0;

                if (direction === 'up') {
                    x = t;
                    y = -(t * t) / (4 * pPixels);
                } else if (direction === 'down') {
                    x = t;
                    y = (t * t) / (4 * pPixels);
                } else if (direction === 'right') {
                    y = t;
                    x = (t * t) / (4 * pPixels);
                } else if (direction === 'left') {
                    y = t;
                    x = -(t * t) / (4 * pPixels);
                }
                pts.push(vX + x, vY + y);
            }
        } else if (def.type === 'parabola_general') {
            const { a, b, c, axis } = def;
            const xRange = tMax / PIXELS_PER_UNIT;
            for (let i = -samples; i <= samples; i++) {
                const t = (i / samples) * xRange;
                let xMath = 0, yMath = 0;
                if (axis === 'y') {
                    xMath = t;
                    yMath = a * t * t + b * t + c;
                } else {
                    yMath = t;
                    xMath = a * t * t + b * t + c;
                }
                pts.push(xMath * PIXELS_PER_UNIT, -yMath * PIXELS_PER_UNIT);
            }
        } else if (def.type === 'parabola_by_vertex_focus') {
            const vertex = getElementById(def.vertex) as PointElement;
            const focus = getElementById(def.focus) as PointElement;
            if (vertex && focus) {
                return parabolaPointsByVertexFocus({ x: vertex.x, y: vertex.y }, { x: focus.x, y: focus.y }, tMax, samples);
            }
        } else if (def.type === 'parabola_by_focus_directrix') {
            const focus = getElementById(def.focus) as PointElement;
            const directrix = getElementById(def.directrix) as LineElement;
            if (focus && directrix) {
                const p1 = getElementById(directrix.p1) as PointElement;
                const p2 = getElementById(directrix.p2) as PointElement;
                if (p1 && p2) {
                    return parabolaPointsByFocusDirectrix(
                        { x: focus.x, y: focus.y },
                        { x: p1.x, y: p1.y },
                        { x: p2.x, y: p2.y },
                        tMax,
                        samples
                    );
                }
            }
        }

        return pts;
    }, [element, getElementById, scale, size.height, size.width]);

    if (points.length === 0) return null;

    return (
        <Line
            points={points}
            stroke={getStrokeColor()}
            strokeWidth={element.style.strokeWidth / scale}
            dash={element.style.dash ? element.style.dash.map(d => d / scale) : undefined}
            hitStrokeWidth={10 / scale}
            listening={activeTool === 'select'}
            draggable={false}
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
