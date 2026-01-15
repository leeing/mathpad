import React from 'react';
import { Circle, Text, Group } from 'react-konva';
import type { PointElement, GeoElement, LineElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import { useToolStore } from '../../store/toolStore';
import { generateId } from '../../utils/id';
import { getIncenter, getCircumcenter } from '../../core/geometry';
import Konva from 'konva';

interface PointProps {
    element: PointElement;
}

export const Point: React.FC<PointProps> = ({ element }) => {
    const { scale } = useViewStore();
    const updateElement = useGeoStore((state) => state.updateElement);
    const activeTool = useToolStore((state) => state.activeTool);

    // Use custom point radius from style or default to 6
    const baseRadius = element.style.pointRadius || 6;
    const radius = baseRadius / scale;
    const hitRadius = 15 / scale;

    // Track initial positions of all connected points for group drag
    const dragStartRef = React.useRef<Map<string, { x: number; y: number }> | null>(null);

    // Find all points connected to this point via line segments (BFS)
    const findConnectedPoints = (startPointId: string): string[] => {
        const { elements } = useGeoStore.getState();
        const visited = new Set<string>();
        const queue = [startPointId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Find all lines connected to this point
            Object.values(elements).forEach(el => {
                if (el.type === 'line') {
                    const line = el as any;
                    if (line.p1 === currentId && !visited.has(line.p2)) {
                        queue.push(line.p2);
                    }
                    if (line.p2 === currentId && !visited.has(line.p1)) {
                        queue.push(line.p1);
                    }
                }
            });
        }

        return Array.from(visited);
    };

    const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (activeTool !== 'select') {
            e.evt.preventDefault();
            e.cancelBubble = true;
            return;
        }

        // Find all connected points and store their initial positions
        const connectedPointIds = findConnectedPoints(element.id);
        const { getElementById } = useGeoStore.getState();

        const initialPositions = new Map<string, { x: number; y: number }>();
        connectedPointIds.forEach(id => {
            const pt = getElementById(id) as PointElement;
            if (pt) {
                initialPositions.set(id, { x: pt.x, y: pt.y });
            }
        });
        dragStartRef.current = initialPositions;
    };

    const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (activeTool !== 'select' || !dragStartRef.current) {
            e.target.x(element.x);
            e.target.y(element.y);
            return;
        }

        // Calculate delta from this point's movement
        const myInitialPos = dragStartRef.current.get(element.id);
        if (!myInitialPos) return;

        const dx = e.target.x() - myInitialPos.x;
        const dy = e.target.y() - myInitialPos.y;

        // Move all connected points by the same delta
        dragStartRef.current.forEach((initialPos, pointId) => {
            updateElement(pointId, {
                x: initialPos.x + dx,
                y: initialPos.y + dy,
            });
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
                // Shift+click: toggle in selection
                if (selection.includes(element.id)) {
                    setSelection(selection.filter(id => id !== element.id));
                } else {
                    setSelection([...selection, element.id]);
                }
            } else {
                // Normal click: replace selection
                setSelection([element.id]);
            }
            useToolStore.getState().setSelectedId(element.id);
            return;
        }

        if (activeTool === 'line') {
            e.cancelBubble = true; // Prevent stage click

            const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();
            const addElement = useGeoStore.getState().addElement;

            if (constructionStep === 0) {
                addTempId(element.id);
                setConstructionStep(1);
            } else if (constructionStep === 1) {
                const p1Id = tempIds[0];
                const p2Id = element.id;
                if (p1Id === p2Id) return;

                addElement({
                    id: generateId(),
                    type: 'line',
                    subtype: 'segment',
                    name: 'l',
                    visible: true,
                    style: { stroke: '#000', strokeWidth: 2 },
                    dependencies: [p1Id, p2Id],
                    definition: { type: 'line_from_points', p1: p1Id, p2: p2Id },
                    p1: p1Id,
                    p2: p2Id
                });
                resetConstruction();
            }
        } else if (activeTool === 'perpendicular') {
            e.cancelBubble = true;
            const { addTempId, resetConstruction, tempIds } = useToolStore.getState();
            const { addElement, getElementById } = useGeoStore.getState();

            addTempId(element.id);

            const ids = [...tempIds, element.id];
            const elements = ids.map(id => getElementById(id)).filter(e => e);
            const lines = elements.filter(e => e?.type === 'line');
            const points = elements.filter(e => e?.type === 'point');

            if (lines.length === 1 && points.length === 1) {
                const lineId = lines[0]!.id;
                const pointId = points[0]!.id;

                const dirPointId = generateId();
                addElement({
                    id: dirPointId,
                    type: 'point',
                    name: 'Dir',
                    x: 0, y: 0,
                    visible: false,
                    style: { stroke: '', strokeWidth: 0 },
                    dependencies: [lineId, pointId],
                    definition: { type: 'perpendicular_point', lineId, pointId }
                });

                addElement({
                    id: generateId(),
                    type: 'line',
                    subtype: 'line',
                    name: 'perp',
                    visible: true,
                    style: { stroke: '#000', strokeWidth: 1 },
                    dependencies: [pointId, dirPointId],
                    definition: { type: 'line_from_points', p1: pointId, p2: dirPointId },
                    p1: pointId,
                    p2: dirPointId
                });

                resetConstruction();
            }
        } else if (activeTool === 'parallel') {
            e.cancelBubble = true;
            const { addTempId, resetConstruction, tempIds } = useToolStore.getState();
            const { addElement, getElementById } = useGeoStore.getState();

            addTempId(element.id);

            const ids = [...tempIds, element.id];
            const fetchedElements = ids.map(id => getElementById(id)).filter(e => e);
            const lines = fetchedElements.filter(e => e?.type === 'line') as LineElement[];
            const points = fetchedElements.filter(e => e?.type === 'point') as PointElement[];

            if (lines.length === 1 && points.length === 1) {
                const lineEl = lines[0];
                const pointId = points[0].id;

                const lp1 = getElementById(lineEl.p1) as PointElement | undefined;
                const lp2 = getElementById(lineEl.p2) as PointElement | undefined;
                const sourcePoint = getElementById(pointId) as PointElement | undefined;

                if (lp1 && lp2 && sourcePoint) {
                    const dx = lp2.x - lp1.x;
                    const dy = lp2.y - lp1.y;
                    const len = Math.sqrt(dx * dx + dy * dy);

                    if (len > 1e-6) {
                        const dirPointId = generateId();
                        addElement({
                            id: dirPointId,
                            type: 'point',
                            name: 'D',
                            x: sourcePoint.x + (dx / len) * 100,
                            y: sourcePoint.y + (dy / len) * 100,
                            visible: false,
                            style: { stroke: '', strokeWidth: 0 },
                            dependencies: [lineEl.id, pointId],
                            definition: { type: 'free' }
                        });

                        addElement({
                            id: generateId(),
                            type: 'line',
                            subtype: 'line',
                            name: 'par',
                            visible: true,
                            style: { stroke: '#000', strokeWidth: 1, dash: [5, 5] },
                            dependencies: [pointId, dirPointId],
                            definition: { type: 'line_from_points', p1: pointId, p2: dirPointId },
                            p1: pointId,
                            p2: dirPointId
                        });
                    }
                }

                resetConstruction();
            }
        } else if (activeTool === 'circle') {
            e.cancelBubble = true;
            const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();
            const addElement = useGeoStore.getState().addElement;

            if (constructionStep === 0) {
                addTempId(element.id);
                setConstructionStep(1);
            } else if (constructionStep === 1) {
                const centerId = tempIds[0];
                const edgeId = element.id;
                if (centerId === edgeId) return;

                addElement({
                    id: generateId(),
                    type: 'circle',
                    name: 'c',
                    visible: true,
                    style: { stroke: '#000', strokeWidth: 2 },
                    dependencies: [centerId, edgeId],
                    definition: { type: 'circle_by_points', center: centerId, edge: edgeId },
                    center: centerId,
                    edge: edgeId
                });
                resetConstruction();
            }
        } else if (activeTool === 'measure_length') {
            e.cancelBubble = true;
            const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();
            const addElement = useGeoStore.getState().addElement;

            if (constructionStep === 0) {
                addTempId(element.id);
                setConstructionStep(1);
            } else if (constructionStep === 1) {
                const p1Id = tempIds[0];
                const p2Id = element.id;
                if (p1Id === p2Id) return;

                addElement({
                    id: generateId(),
                    type: 'label',
                    name: 'dist',
                    visible: true,
                    style: { stroke: '#000', strokeWidth: 1 },
                    dependencies: [p1Id, p2Id],
                    definition: { type: 'distance', el1: p1Id, el2: p2Id, type2: 'point' },
                    text: '',
                    x: 0, y: 0
                });
                resetConstruction();
            }
        } else if (activeTool === 'measure_angle') {
            e.cancelBubble = true;
            const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();
            const addElement = useGeoStore.getState().addElement;

            if (constructionStep === 0) {
                addTempId(element.id);
                setConstructionStep(1);
            } else if (constructionStep === 1) {
                const p1Id = tempIds[0];
                const vertexId = element.id;
                if (p1Id === vertexId) return;
                addTempId(element.id);
                setConstructionStep(2);
            } else if (constructionStep === 2) {
                const p1Id = tempIds[0];
                const vertexId = tempIds[1];
                const p2Id = element.id;
                if (p2Id === vertexId || p2Id === p1Id) return;

                addElement({
                    id: generateId(),
                    type: 'angle',
                    name: 'angle',
                    visible: true,
                    style: { stroke: 'orange', strokeWidth: 2, fill: 'rgba(255, 165, 0, 0.2)' },
                    dependencies: [p1Id, vertexId, p2Id],
                    definition: { type: 'angle_3points', p1: p1Id, vertex: vertexId, p2: p2Id },
                    p1: p1Id,
                    vertex: vertexId,
                    p2: p2Id,
                    angleValue: 0
                } as GeoElement);
                resetConstruction();
            }
        } else if (activeTool === 'verify_triangle') {
            e.cancelBubble = true;
            const { addTempId, tempIds } = useToolStore.getState();

            if (tempIds.length < 3) {
                addTempId(element.id);
            } else {
                // Already selected 3, maybe reset?
                useToolStore.getState().resetConstruction();
                addTempId(element.id);
            }
        } else if (activeTool === 'incenter' || activeTool === 'circumcenter') {
            e.cancelBubble = true;
            const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();
            const { addElement, getElementById } = useGeoStore.getState();

            if (constructionStep < 2) {
                addTempId(element.id);
                setConstructionStep(constructionStep + 1);
            } else if (constructionStep === 2) {
                const p1Id = tempIds[0];
                const p2Id = tempIds[1];
                const p3Id = element.id;

                if (p1Id === p3Id || p2Id === p3Id || p1Id === p2Id) {
                    resetConstruction();
                    return;
                }

                const p1 = getElementById(p1Id) as PointElement | undefined;
                const p2 = getElementById(p2Id) as PointElement | undefined;
                const p3 = getElementById(p3Id) as PointElement | undefined;

                if (!p1 || !p2 || !p3 || p1.type !== 'point' || p2.type !== 'point' || p3.type !== 'point') {
                    resetConstruction();
                    return;
                }

                if (activeTool === 'incenter') {
                    const incenter = getIncenter(p1, p2, p3);

                    const incenterPointId = generateId();
                    addElement({
                        id: incenterPointId,
                        type: 'point',
                        name: 'I',
                        x: incenter.x,
                        y: incenter.y,
                        visible: true,
                        style: { stroke: '#dc2626', strokeWidth: 2, fill: '#ef4444' },
                        dependencies: [p1Id, p2Id, p3Id],
                        definition: { type: 'free' }
                    });

                    const edgePointId = generateId();
                    addElement({
                        id: edgePointId,
                        type: 'point',
                        name: 'iE',
                        x: incenter.x + incenter.inradius,
                        y: incenter.y,
                        visible: false,
                        style: { stroke: '#dc2626', strokeWidth: 2, fill: '#ef4444' },
                        dependencies: [incenterPointId],
                        definition: { type: 'free' }
                    });

                    addElement({
                        id: generateId(),
                        type: 'circle',
                        name: 'incircle',
                        visible: true,
                        style: { stroke: '#dc2626', strokeWidth: 1.5, dash: [5, 3] },
                        dependencies: [incenterPointId, edgePointId],
                        definition: { type: 'circle_by_points', center: incenterPointId, edge: edgePointId },
                        center: incenterPointId,
                        edge: edgePointId
                    });
                } else {
                    const circumcenter = getCircumcenter(p1, p2, p3);

                    const circumcenterPointId = generateId();
                    addElement({
                        id: circumcenterPointId,
                        type: 'point',
                        name: 'O',
                        x: circumcenter.x,
                        y: circumcenter.y,
                        visible: true,
                        style: { stroke: '#7c3aed', strokeWidth: 2, fill: '#8b5cf6' },
                        dependencies: [p1Id, p2Id, p3Id],
                        definition: { type: 'free' }
                    });

                    addElement({
                        id: generateId(),
                        type: 'circle',
                        name: 'circumcircle',
                        visible: true,
                        style: { stroke: '#7c3aed', strokeWidth: 1.5, dash: [5, 3] },
                        dependencies: [circumcenterPointId, p1Id],
                        definition: { type: 'circle_by_points', center: circumcenterPointId, edge: p1Id },
                        center: circumcenterPointId,
                        edge: p1Id
                    });
                }

                resetConstruction();
            }
        }
    }

    const darkTheme = useViewStore.getState().darkTheme;
    const selection = useGeoStore((state) => state.selection);
    const isSelected = selection.includes(element.id);

    return (
        <Group
            x={element.x}
            y={element.y}
            draggable={activeTool === 'select'}
            onDragMove={handleDragMove}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onTap={handleClick}
        >
            <Circle radius={hitRadius} fill="transparent" />
            <Circle
                radius={radius}
                fill={isSelected ? '#60a5fa' : (element.style.fill || '#3b82f6')}
                stroke={isSelected ? '#2563eb' : (element.style.stroke || '#2563eb')}
                strokeWidth={element.style.strokeWidth ? element.style.strokeWidth / scale : 2 / scale}
                shadowColor={isSelected ? '#3b82f6' : undefined}
                shadowBlur={isSelected ? 10 : 0}
                shadowEnabled={isSelected}
            />
            <Text
                text={element.name}
                fontSize={14 / scale}
                x={10 / scale}
                y={-10 / scale}
                fill={darkTheme ? '#93c5fd' : '#1e3a8a'}
            />
        </Group>
    );
};

