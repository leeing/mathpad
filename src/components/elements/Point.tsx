import React from 'react';
import { Circle, Text, Group } from 'react-konva';
import type { PointElement, GeoElement, LineElement, EllipseElement, CircleElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import { useToolStore } from '../../store/toolStore';
import { generateId } from '../../utils/id';
import { getIncenter, getCircumcenter } from '../../core/geometry';
import { PIXELS_PER_UNIT } from '../../constants/grid';
import Konva from 'konva';

interface PointProps {
    element: PointElement;
}

export const Point: React.FC<PointProps> = ({ element }) => {
    // All hooks MUST be called before any early returns
    const { scale } = useViewStore();
    const examMode = useViewStore((state) => state.examMode);
    const showHiddenElements = useViewStore((state) => state.showHiddenElements);
    const hoveredId = useViewStore((state) => state.hoveredId);
    const setHoveredId = useViewStore((state) => state.setHoveredId);
    const updateElement = useGeoStore((state) => state.updateElement);
    const activeTool = useToolStore((state) => state.activeTool);
    const selection = useGeoStore((state) => state.selection);
    const dragStartRef = React.useRef<Map<string, { x: number; y: number }> | null>(null);

    // Handle visibility - if hidden and not in preview mode, don't render
    const isHidden = element.visible === false;
    if (isHidden && !showHiddenElements) {
        return null;
    }

    // Use custom point radius from style or default to 4 (smaller)
    const baseRadius = element.style.pointRadius || 4;
    const radius = baseRadius / scale;
    const hitRadius = 15 / scale;

    // Check if this point should NOT be individually draggable:
    // 1. Points belonging to ellipse or parabola
    // 2. Points belonging to parabola's directrix line
    // 3. Points with circumcenter or incenter definition (derived points)
    const isConstrainedPoint = (): boolean => {
        const { elements, getElementById } = useGeoStore.getState();

        // Check 1: Point has circumcenter or incenter definition (derived from triangle vertices)
        const def = element.definition;
        if (def.type === 'circumcenter' || def.type === 'incenter') {
            return true;
        }

        // Check 2: Point is directly in conic's (ellipse/parabola) dependencies
        for (const el of Object.values(elements)) {
            if ((el.type === 'ellipse' || el.type === 'parabola') && el.dependencies.includes(element.id)) {
                return true;
            }
        }

        // Check 3: Point belongs to a line that is a parabola's directrix
        for (const el of Object.values(elements)) {
            if (el.type === 'parabola') {
                for (const depId of el.dependencies) {
                    const depEl = getElementById(depId);
                    if (depEl && depEl.type === 'line') {
                        const lineEl = depEl as { p1: string; p2: string };
                        if (lineEl.p1 === element.id || lineEl.p2 === element.id) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    };

    // Determine if this point is draggable
    const isDraggable = activeTool === 'select' && !isConstrainedPoint();

    // Find all points in the same group as this point
    const findGroupPoints = (pointId: string): string[] => {
        const { elements } = useGeoStore.getState();
        const currentPoint = elements[pointId];

        // If no groupId, only return this point
        if (!currentPoint?.groupId) {
            return [pointId];
        }

        // Find all points with the same groupId
        const groupPoints: string[] = [];
        Object.values(elements).forEach(el => {
            if (el.type === 'point' && el.groupId === currentPoint.groupId) {
                groupPoints.push(el.id);
            }
        });

        return groupPoints;
    };

    const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
        if (activeTool !== 'select') {
            e.evt.preventDefault();
            e.cancelBubble = true;
            return;
        }

        // Find all points in the same group and store their initial positions
        const groupPointIds = findGroupPoints(element.id);
        const { getElementById } = useGeoStore.getState();

        const initialPositions = new Map<string, { x: number; y: number }>();
        groupPointIds.forEach(id => {
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

        // Move all group points by the same delta
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
                    style: { stroke: '#000', strokeWidth: 1.5 },
                    dependencies: [p1Id, p2Id],
                    definition: { type: 'line_from_points', p1: p1Id, p2: p2Id },
                    p1: p1Id,
                    p2: p2Id
                });
                resetConstruction();
            }
        } else if (activeTool === 'straight_line') {
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
                    type: 'line',
                    subtype: 'line',
                    name: 'l',
                    visible: true,
                    style: { stroke: '#000', strokeWidth: 1.5 },
                    dependencies: [p1Id, p2Id],
                    definition: { type: 'line_from_points', p1: p1Id, p2: p2Id },
                    p1: p1Id,
                    p2: p2Id
                });
                resetConstruction();
            }
        } else if (activeTool === 'vector') {
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
                    type: 'line',
                    subtype: 'vector',
                    name: 'v',
                    visible: true,
                    style: { stroke: '#dc2626', strokeWidth: 1.5 },
                    dependencies: [p1Id, p2Id],
                    definition: { type: 'line_from_points', p1: p1Id, p2: p2Id },
                    p1: p1Id,
                    p2: p2Id
                });
                resetConstruction();
            }
        } else if (activeTool === 'auxiliary') {
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
                    type: 'line',
                    subtype: 'segment',
                    name: 'aux',
                    visible: true,
                    style: { stroke: '#9ca3af', strokeWidth: 1, dash: [6, 4] },
                    dependencies: [p1Id, p2Id],
                    definition: { type: 'line_from_points', p1: p1Id, p2: p2Id },
                    p1: p1Id,
                    p2: p2Id
                });
                resetConstruction();
            }
        } else if (activeTool === 'perpendicular') {
            e.cancelBubble = true;
            const { addTempId, resetConstruction, tempIds, constructionStep } = useToolStore.getState();
            const { addElement, getElementById } = useGeoStore.getState();

            // Only allow point selection after line is selected (step 1 done)
            if (constructionStep < 1) {
                // Line not yet selected, ignore point click
                return;
            }

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
        } else if (activeTool === 'tangent') {
            // Tangent tool: select point (must be outside circle)
            e.cancelBubble = true;
            const { addTempId, resetConstruction, tempIds } = useToolStore.getState();
            const { addElement, getElementById } = useGeoStore.getState();

            addTempId(element.id);

            const ids = [...tempIds, element.id];
            const fetchedElements = ids.map(id => getElementById(id)).filter(el => el);
            const circles = fetchedElements.filter(el => el?.type === 'circle') as CircleElement[];
            const points = fetchedElements.filter(el => el?.type === 'point') as PointElement[];

            if (circles.length === 1 && points.length === 1) {
                const circleEl = circles[0];
                const pointEl = points[0];
                const centerEl = getElementById(circleEl.center) as PointElement | undefined;
                const edgeEl = getElementById(circleEl.edge) as PointElement | undefined;

                if (centerEl && edgeEl) {
                    const radius = Math.sqrt((edgeEl.x - centerEl.x) ** 2 + (edgeEl.y - centerEl.y) ** 2);
                    const dx = pointEl.x - centerEl.x;
                    const dy = pointEl.y - centerEl.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Point must be outside circle
                    if (dist > radius + 1) {
                        const theta = Math.acos(radius / dist);
                        const baseAngle = Math.atan2(dy, dx);

                        for (const sign of [1, -1]) {
                            const tangentAngle = baseAngle + sign * theta;
                            const tx = centerEl.x + radius * Math.cos(tangentAngle);
                            const ty = centerEl.y + radius * Math.sin(tangentAngle);

                            const tangentPointId = generateId();
                            addElement({
                                id: tangentPointId,
                                type: 'point',
                                name: 'T',
                                x: tx, y: ty,
                                visible: true,
                                style: { stroke: '#3b82f6', strokeWidth: 1.5 },
                                dependencies: [circleEl.id, pointEl.id],
                                definition: { type: 'tangent_point', circleId: circleEl.id, externalPointId: pointEl.id, index: sign === 1 ? 0 : 1 }
                            });

                            addElement({
                                id: generateId(),
                                type: 'line',
                                subtype: 'segment',
                                name: 'tangent',
                                visible: true,
                                style: { stroke: '#000', strokeWidth: 1 },
                                dependencies: [pointEl.id, tangentPointId],
                                definition: { type: 'line_from_points', p1: pointEl.id, p2: tangentPointId },
                                p1: pointEl.id,
                                p2: tangentPointId
                            });
                        }
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
                    style: { stroke: '#000', strokeWidth: 1.5 },
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
                    style: { stroke: 'orange', strokeWidth: 1.5, fill: 'rgba(255, 165, 0, 0.2)' },
                    dependencies: [p1Id, vertexId, p2Id],
                    definition: { type: 'angle_3points', p1: p1Id, vertex: vertexId, p2: p2Id },
                    p1: p1Id,
                    vertex: vertexId,
                    p2: p2Id,
                    angleValue: 0
                } as GeoElement);
                resetConstruction();
            }
        } else if (activeTool === 'congruent' || activeTool === 'similar') {
            // Triangle vertex selection for congruent/similar tools
            e.cancelBubble = true;
            const { addTempId, tempIds } = useToolStore.getState();

            // Only allow selecting up to 3 vertices
            if (tempIds.length < 3 && !tempIds.includes(element.id)) {
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
                        style: { stroke: '#dc2626', strokeWidth: 1.5, fill: '#ef4444' },
                        dependencies: [p1Id, p2Id, p3Id],
                        definition: { type: 'incenter', p1: p1Id, p2: p2Id, p3: p3Id }
                    });

                    const edgePointId = generateId();
                    addElement({
                        id: edgePointId,
                        type: 'point',
                        name: 'iE',
                        x: incenter.x + incenter.inradius,
                        y: incenter.y,
                        visible: false,
                        style: { stroke: '#dc2626', strokeWidth: 1.5, fill: '#ef4444' },
                        dependencies: [incenterPointId, p1Id, p2Id, p3Id],
                        definition: { type: 'incircle_edge', incenter: incenterPointId, p1: p1Id, p2: p2Id, p3: p3Id }
                    });

                    addElement({
                        id: generateId(),
                        type: 'circle',
                        name: 'incircle',
                        visible: true,
                        style: { stroke: '#dc2626', strokeWidth: 1, dash: [5, 3] },
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
                        style: { stroke: '#7c3aed', strokeWidth: 1.5, fill: '#8b5cf6' },
                        dependencies: [p1Id, p2Id, p3Id],
                        definition: { type: 'circumcenter', p1: p1Id, p2: p2Id, p3: p3Id }
                    });

                    addElement({
                        id: generateId(),
                        type: 'circle',
                        name: 'circumcircle',
                        visible: true,
                        style: { stroke: '#7c3aed', strokeWidth: 1, dash: [5, 3] },
                        dependencies: [circumcenterPointId, p1Id],
                        definition: { type: 'circle_by_points', center: circumcenterPointId, edge: p1Id },
                        center: circumcenterPointId,
                        edge: p1Id
                    });
                }

                resetConstruction();
            }
        } else if (activeTool === 'ellipse') {
            const ellipseMode = useToolStore.getState().ellipseMode;
            if (ellipseMode === 'equation') return; // Handled by panel

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

                const p1 = getElementById(p1Id) as PointElement | undefined;
                const p2 = getElementById(p2Id) as PointElement | undefined;
                const p3 = getElementById(p3Id) as PointElement | undefined;

                if (!p1 || !p2 || !p3) { resetConstruction(); return; }

                if (ellipseMode === 'foci') {
                    // Distance calculation in pixel coordinates
                    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
                        Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

                    // Calculate distances in pixel coordinates
                    const pf1Pixels = dist(p3, p1);
                    const pf2Pixels = dist(p3, p2);
                    const f1f2Pixels = dist(p1, p2);

                    const twoA = pf1Pixels + pf2Pixels;
                    const aPixels = twoA / 2;
                    const cPixels = f1f2Pixels / 2;

                    if (aPixels <= cPixels) { resetConstruction(); return; }

                    const bPixels = Math.sqrt(aPixels * aPixels - cPixels * cPixels);

                    // Convert to math units
                    const a = aPixels / PIXELS_PER_UNIT;
                    const b = bPixels / PIXELS_PER_UNIT;

                    // Center is midpoint of foci (convert to math coordinates)
                    const centerX = ((p1.x + p2.x) / 2) / PIXELS_PER_UNIT;
                    const centerY = -((p1.y + p2.y) / 2) / PIXELS_PER_UNIT;  // Flip Y

                    // Calculate rotation in SCREEN coordinates for Konva (NO Y flip)
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;  // NO Y flip - Konva expects screen angle
                    const rotation = Math.atan2(dy, dx);

                    const ellipseEl: EllipseElement = {
                        id: generateId(),
                        type: 'ellipse',
                        name: '椭圆',
                        visible: true,
                        style: { stroke: '#000', strokeWidth: 1.5 },
                        dependencies: [p1Id, p2Id, p3Id],
                        centerX, centerY, a, b, rotation,
                        definition: { type: 'ellipse_by_foci', f1: p1Id, f2: p2Id, pointOn: p3Id }
                    };
                    addElement(ellipseEl);
                } else if (ellipseMode === 'center') {
                    // Center in math coordinates
                    const centerX = p1.x / PIXELS_PER_UNIT;
                    const centerY = -p1.y / PIXELS_PER_UNIT;  // Flip Y

                    // Major axis: distance in pixels, convert to units
                    const aPixels = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
                    const a = aPixels / PIXELS_PER_UNIT;

                    // Rotation in SCREEN coordinates for Konva (NO Y flip)
                    const dxMajor = p2.x - p1.x;
                    const dyMajor = p2.y - p1.y;
                    const rotation = Math.atan2(dyMajor, dxMajor);

                    // Calculate unit vectors for major and minor axes
                    const majorLength = Math.sqrt(dxMajor * dxMajor + dyMajor * dyMajor);
                    if (majorLength < 1) { resetConstruction(); return; }
                    const ux = dxMajor / majorLength;  // Major axis direction
                    const uy = dyMajor / majorLength;
                    const vx = -uy;  // Perpendicular (minor axis direction)
                    const vy = ux;

                    // Project point 3 onto the minor axis to get b
                    const p3ToCenter = { x: p3.x - p1.x, y: p3.y - p1.y };
                    const bPixels = Math.abs(p3ToCenter.x * vx + p3ToCenter.y * vy);
                    const b = bPixels / PIXELS_PER_UNIT;

                    const ellipseEl: EllipseElement = {
                        id: generateId(),
                        type: 'ellipse',
                        name: '椭圆',
                        visible: true,
                        style: { stroke: '#000', strokeWidth: 1.5 },
                        dependencies: [p1Id, p2Id, p3Id],
                        centerX, centerY, a, b, rotation,
                        definition: { type: 'ellipse_by_center_axes', center: p1Id, majorEnd: p2Id, minorEnd: p3Id }
                    };
                    addElement(ellipseEl);
                }

                resetConstruction();
            }
        } else if (activeTool === 'parabola') {
            const parabolaMode = useToolStore.getState().parabolaMode;
            if (parabolaMode === 'equation' || parabolaMode === 'general_equation') return;

            e.cancelBubble = true;
            const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();
            const { addElement, getElementById } = useGeoStore.getState();

            if (parabolaMode === 'vertex_focus') {
                if (constructionStep === 0) {
                    addTempId(element.id);
                    setConstructionStep(1);
                } else if (constructionStep === 1) {
                    const vertexId = tempIds[0];
                    const focusId = element.id;

                    if (vertexId === focusId) return;

                    addElement({
                        id: generateId(),
                        type: 'parabola',
                        name: 'parabola',
                        visible: true,
                        style: { stroke: '#000', strokeWidth: 1.5 },
                        dependencies: [vertexId, focusId],
                        definition: { type: 'parabola_by_vertex_focus', vertex: vertexId, focus: focusId }
                    } as GeoElement);

                    resetConstruction();
                }
            } else if (parabolaMode === 'focus_directrix') {
                if (constructionStep === 0) {
                    addTempId(element.id);
                    setConstructionStep(1);
                } else if (constructionStep === 1) {
                    addTempId(element.id);
                    setConstructionStep(2);
                } else if (constructionStep === 2) {
                    const focusId = tempIds[0];
                    const dirP1Id = tempIds[1];
                    const dirP2Id = element.id;

                    if (dirP1Id === dirP2Id) return;

                    const focus = getElementById(focusId);
                    const dp1 = getElementById(dirP1Id);
                    const dp2 = getElementById(dirP2Id);
                    if (!focus || !dp1 || !dp2 || focus.type !== 'point' || dp1.type !== 'point' || dp2.type !== 'point') {
                        resetConstruction();
                        return;
                    }

                    const dx = dp2.x - dp1.x;
                    const dy = dp2.y - dp1.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len < 1) {
                        resetConstruction();
                        return;
                    }
                    const nx = -dy / len;
                    const ny = dx / len;
                    const dist = Math.abs((focus.x - dp1.x) * nx + (focus.y - dp1.y) * ny);
                    if (dist < 1) {
                        resetConstruction();
                        return;
                    }

                    const directrixLineId = generateId();
                    addElement({
                        id: directrixLineId,
                        type: 'line',
                        subtype: 'line',
                        name: 'directrix',
                        visible: true,
                        style: { stroke: '#6b7280', strokeWidth: 1, dash: [6, 4] },
                        dependencies: [dirP1Id, dirP2Id],
                        definition: { type: 'line_from_points', p1: dirP1Id, p2: dirP2Id },
                        p1: dirP1Id,
                        p2: dirP2Id
                    });

                    addElement({
                        id: generateId(),
                        type: 'parabola',
                        name: 'parabola',
                        visible: true,
                        style: { stroke: '#000', strokeWidth: 1.5 },
                        dependencies: [focusId, directrixLineId],
                        definition: { type: 'parabola_by_focus_directrix', focus: focusId, directrix: directrixLineId }
                    } as GeoElement);

                    resetConstruction();
                }
            }
        } else if (activeTool === 'rectangle') {
            e.cancelBubble = true;
            const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();
            const { addElement, getElementById, updateElement } = useGeoStore.getState();

            if (constructionStep === 0) {
                // First click: use this point as corner A
                addTempId(element.id);
                setConstructionStep(1);
            } else if (constructionStep === 1) {
                // Second click: create 3 more corners and 4 line segments
                const cornerAId = tempIds[0];
                const cornerA = getElementById(cornerAId);
                if (!cornerA || cornerA.type !== 'point') return;

                const ax = cornerA.x;
                const ay = cornerA.y;
                const cx = element.x;
                const cy = element.y;

                // Generate a unique group ID for this rectangle
                const rectGroupId = `rect_${generateId()}`;

                // Update corner A with the group ID
                updateElement(cornerAId, { groupId: rectGroupId });
                // Also add clicked point to the group
                updateElement(element.id, { groupId: rectGroupId });

                // Create corners B and D (A is first click, C is current click)
                const cornerBId = generateId();
                const cornerDId = generateId();

                addElement({
                    id: cornerBId,
                    type: 'point',
                    name: 'P',
                    x: cx,
                    y: ay,
                    visible: true,
                    style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
                    dependencies: [],
                    definition: { type: 'free' },
                    groupId: rectGroupId
                });

                addElement({
                    id: cornerDId,
                    type: 'point',
                    name: 'P',
                    x: ax,
                    y: cy,
                    visible: true,
                    style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
                    dependencies: [],
                    definition: { type: 'free' },
                    groupId: rectGroupId
                });

                // Create 4 line segments: AB, BC, CD, DA (C is the clicked element)
                const cornerCId = element.id;
                const sides = [
                    [cornerAId, cornerBId],
                    [cornerBId, cornerCId],
                    [cornerCId, cornerDId],
                    [cornerDId, cornerAId],
                ];

                for (const [p1Id, p2Id] of sides) {
                    addElement({
                        id: generateId(),
                        type: 'line',
                        subtype: 'segment',
                        name: 'l',
                        visible: true,
                        style: { stroke: '#000', strokeWidth: 1.5 },
                        dependencies: [p1Id, p2Id],
                        definition: { type: 'line_from_points', p1: p1Id, p2: p2Id },
                        p1: p1Id,
                        p2: p2Id,
                        groupId: rectGroupId
                    });
                }

                resetConstruction();
            }
        } else if (activeTool === 'triangle') {
            e.cancelBubble = true;
            const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();
            const { addElement, updateElement } = useGeoStore.getState();

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

                // Generate a unique group ID for this triangle
                const triangleGroupId = `triangle_${generateId()}`;

                // Update all 3 vertices with the group ID
                updateElement(p1Id, { groupId: triangleGroupId });
                updateElement(p2Id, { groupId: triangleGroupId });
                updateElement(p3Id, { groupId: triangleGroupId });

                // Create 3 line segments with the same group ID
                const sides = [
                    [p1Id, p2Id],
                    [p2Id, p3Id],
                    [p3Id, p1Id],
                ];

                for (const [pAId, pBId] of sides) {
                    addElement({
                        id: generateId(),
                        type: 'line',
                        subtype: 'segment',
                        name: 'l',
                        visible: true,
                        style: { stroke: '#000', strokeWidth: 1.5 },
                        dependencies: [pAId, pBId],
                        definition: { type: 'line_from_points', p1: pAId, p2: pBId },
                        p1: pAId,
                        p2: pBId,
                        groupId: triangleGroupId
                    });
                }

                resetConstruction();
            }
        }
    }

    const darkTheme = useViewStore.getState().darkTheme;
    const isSelected = selection.includes(element.id);
    const isHovered = hoveredId === element.id;

    const handleMouseEnter = () => setHoveredId(element.id);
    const handleMouseLeave = () => setHoveredId(null);

    const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
        e.evt.preventDefault();
        const { openContextMenu } = useViewStore.getState();
        const stage = e.target.getStage();
        if (stage) {
            const pointer = stage.getPointerPosition();
            if (pointer) {
                openContextMenu(element.id, pointer.x, pointer.y);
            }
        }
    };

    return (
        <Group
            x={element.x}
            y={element.y}
            draggable={isDraggable}
            onDragMove={handleDragMove}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onTap={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onContextMenu={handleContextMenu}
            opacity={isHidden ? 0.4 : 1}
        >
            <Circle radius={hitRadius} fill="transparent" />
            <Circle
                radius={radius}
                fill={examMode ? '#ffffff' : (element.style.fill || (isSelected ? '#fca5a5' : '#3b82f6'))}
                stroke={element.style.stroke || (isSelected ? '#dc2626' : (isHovered ? '#f59e0b' : (examMode ? '#111827' : '#2563eb')))}
                strokeWidth={element.style.strokeWidth ? element.style.strokeWidth / scale : 1.5 / scale}
                shadowColor={isSelected ? '#dc2626' : (isHovered ? '#f59e0b' : undefined)}
                shadowBlur={isSelected ? 10 : (isHovered ? 8 : 0)}
                shadowEnabled={isSelected || isHovered}
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
