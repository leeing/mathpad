import { useEffect, useState, forwardRef } from 'react';
import { Stage } from 'react-konva';
import { useViewStore } from '../store/viewStore';
import { Grid } from './Grid';
import { GeoLayer } from './GeoLayer';
import { EllipsePreviewLayer } from './EllipsePreviewLayer';
import { SnapPreviewLayer } from './SnapPreviewLayer';
import Konva from 'konva';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { generateId } from '../utils/id';
import type { GeoElement, PointElement } from '../types/geoElements';
import { getSnapPosition } from '../core/snapping';
import { getIncenter, getCircumcenter } from '../core/geometry';
import { PIXELS_PER_UNIT } from '../constants/grid';
import { transformTriangle } from '../core/triangleTransform';

export const CanvasStage = forwardRef<Konva.Stage>((props, ref) => {
  void props;
  const { scale, position, setScale, setPosition, setSize: setViewSize } = useViewStore();
  const activeTool = useToolStore((state) => state.activeTool);
  const ellipseMode = useToolStore((state) => state.ellipseMode);
  const setSelectedId = useToolStore((state) => state.setSelectedId);
  const addElement = useGeoStore((state) => state.addElement);
  const elements = useGeoStore((state) => state.elements);

  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [localMousePos, setLocalMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const newSize = { width: window.innerWidth, height: window.innerHeight };
      setSize(newSize);
      setViewSize(newSize);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setViewSize]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPos);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) {
      setPosition({ x: e.target.x(), y: e.target.y() });
    }
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnStage = e.target === e.target.getStage();
    if (!clickedOnStage) return;

    if (activeTool === 'select') {
      setSelectedId(null);
    }

    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldPos = {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale,
    };

    const snapResult = getSnapPosition(worldPos.x, worldPos.y, elements, 10 / scale);

    // Handle congruent/similar triangle placement
    if (activeTool === 'congruent' || activeTool === 'similar') {
      const { tempIds, resetConstruction } = useToolStore.getState();

      // Only place if 3 vertices have been selected
      if (tempIds.length === 3) {
        const { triangleTransform } = useViewStore.getState();
        const getElementById = useGeoStore.getState().getElementById;

        // Get original triangle vertices
        const p1 = getElementById(tempIds[0]) as PointElement | undefined;
        const p2 = getElementById(tempIds[1]) as PointElement | undefined;
        const p3 = getElementById(tempIds[2]) as PointElement | undefined;

        if (p1 && p2 && p3) {
          // Use scale=1 for congruent, or user-set scale for similar
          const transformScale = activeTool === 'congruent' ? 1 : triangleTransform.scale;

          // Transform the triangle
          const transformed = transformTriangle(
            [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }, { x: p3.x, y: p3.y }],
            transformScale,
            triangleTransform.rotationDeg,
            triangleTransform.flip,
            { x: worldPos.x, y: worldPos.y }
          );

          // Create new points for the transformed triangle
          const newP1Id = generateId();
          const newP2Id = generateId();
          const newP3Id = generateId();

          addElement({
            id: newP1Id,
            type: 'point',
            name: 'P',
            x: transformed[0].x,
            y: transformed[0].y,
            visible: true,
            style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
            dependencies: [],
            definition: { type: 'free' }
          });

          addElement({
            id: newP2Id,
            type: 'point',
            name: 'P',
            x: transformed[1].x,
            y: transformed[1].y,
            visible: true,
            style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
            dependencies: [],
            definition: { type: 'free' }
          });

          addElement({
            id: newP3Id,
            type: 'point',
            name: 'P',
            x: transformed[2].x,
            y: transformed[2].y,
            visible: true,
            style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
            dependencies: [],
            definition: { type: 'free' }
          });

          // Create the three line segments to form the triangle
          addElement({
            id: generateId(),
            type: 'line',
            name: 'line',
            subtype: 'segment',
            p1: newP1Id,
            p2: newP2Id,
            visible: true,
            style: { stroke: '#000', strokeWidth: 1.5 },
            dependencies: [newP1Id, newP2Id],
            definition: { type: 'line_from_points', p1: newP1Id, p2: newP2Id }
          } as GeoElement);

          addElement({
            id: generateId(),
            type: 'line',
            name: 'line',
            subtype: 'segment',
            p1: newP2Id,
            p2: newP3Id,
            visible: true,
            style: { stroke: '#000', strokeWidth: 1.5 },
            dependencies: [newP2Id, newP3Id],
            definition: { type: 'line_from_points', p1: newP2Id, p2: newP3Id }
          } as GeoElement);

          addElement({
            id: generateId(),
            type: 'line',
            name: 'line',
            subtype: 'segment',
            p1: newP3Id,
            p2: newP1Id,
            visible: true,
            style: { stroke: '#000', strokeWidth: 1.5 },
            dependencies: [newP3Id, newP1Id],
            definition: { type: 'line_from_points', p1: newP3Id, p2: newP1Id }
          } as GeoElement);

          resetConstruction();
        }
      }
      return;
    }

    if (activeTool === 'point') {
      // Only prevent creating point on top of existing point
      // Allow creating at intersections, midpoints, etc.
      if (snapResult.snapType === 'point') return;

      addElement({
        id: generateId(),
        type: 'point',
        name: 'P',
        x: snapResult.x, // Use snap position for intersections/midpoints
        y: snapResult.y,
        visible: true,
        style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
        dependencies: [],
        definition: { type: 'free' }
      });
    } else if (activeTool === 'line' || activeTool === 'straight_line' || activeTool === 'vector' || activeTool === 'auxiliary') {
      // Line, Vector, or Auxiliary: create line segment
      let targetPointId = snapResult.snappedTo;

      if (!targetPointId) {
        targetPointId = generateId();
        addElement({
          id: targetPointId,
          type: 'point',
          name: 'P',
          x: worldPos.x,
          y: worldPos.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
      }

      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      if (constructionStep === 0) {
        addTempId(targetPointId);
        setConstructionStep(1);
      } else if (constructionStep === 1) {
        const p1Id = tempIds[0];
        const p2Id = targetPointId;

        if (p1Id === p2Id) return;

        const isVector = activeTool === 'vector';
        const isAuxiliary = activeTool === 'auxiliary';
        const isStraightLine = activeTool === 'straight_line';
        addElement({
          id: generateId(),
          type: 'line',
          subtype: isVector ? 'vector' : (isStraightLine ? 'line' : 'segment'),
          name: isAuxiliary ? 'aux' : (isVector ? 'v' : (isStraightLine ? 'l' : 'seg')),
          visible: true,
          style: {
            stroke: isAuxiliary ? '#9ca3af' : (isVector ? '#dc2626' : '#000'),
            strokeWidth: isAuxiliary ? 1 : 1.5,
            dash: isAuxiliary ? [6, 4] : undefined,
          },
          dependencies: [p1Id, p2Id],
          definition: { type: 'line_from_points', p1: p1Id, p2: p2Id },
          p1: p1Id,
          p2: p2Id
        });
        resetConstruction();
      }
    } else if (activeTool === 'circle') {
      let targetPointId = snapResult.snappedTo;

      if (!targetPointId) {
        targetPointId = generateId();
        addElement({
          id: targetPointId,
          type: 'point',
          name: 'P',
          x: worldPos.x,
          y: worldPos.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
      }

      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      if (constructionStep === 0) {
        addTempId(targetPointId);
        setConstructionStep(1);
      } else if (constructionStep === 1) {
        const centerId = tempIds[0];
        const edgeId = targetPointId;
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
    } else if (activeTool === 'parabola') {
      const parabolaMode = useToolStore.getState().parabolaMode;
      if (parabolaMode === 'equation' || parabolaMode === 'general_equation') {
        return;
      }

      let targetPointId = snapResult.snappedTo;

      if (!targetPointId) {
        targetPointId = generateId();
        addElement({
          id: targetPointId,
          type: 'point',
          name: 'P',
          x: worldPos.x,
          y: worldPos.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
      }

      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      if (parabolaMode === 'vertex_focus') {
        if (constructionStep === 0) {
          addTempId(targetPointId);
          setConstructionStep(1);
        } else if (constructionStep === 1) {
          const vertexId = tempIds[0];
          const focusId = targetPointId;

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
          addTempId(targetPointId);
          setConstructionStep(1);
        } else if (constructionStep === 1) {
          addTempId(targetPointId);
          setConstructionStep(2);
        } else if (constructionStep === 2) {
          const focusId = tempIds[0];
          const dirP1Id = tempIds[1];
          const dirP2Id = targetPointId;

          if (dirP1Id === dirP2Id) return;

          const focus = useGeoStore.getState().getElementById(focusId);
          const dp1 = useGeoStore.getState().getElementById(dirP1Id);
          const dp2 = useGeoStore.getState().getElementById(dirP2Id);
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
    } else if (activeTool === 'text') {
      const id = generateId();
      addElement({
        id,
        type: 'text',
        name: '文本',
        visible: true,
        style: { stroke: '#111827', strokeWidth: 1 },
        dependencies: [],
        definition: { type: 'free' },
        x: worldPos.x,
        y: worldPos.y,
        content: '文本',
        fontSize: 16,
      } as GeoElement);
      useToolStore.getState().setSelectedId(id);
      useGeoStore.getState().setSelection([id]);
      useToolStore.getState().setActiveTool('select');
    } else if (activeTool === 'measure_length') {
      let targetPointId = snapResult.snappedTo;

      if (!targetPointId) {
        targetPointId = generateId();
        addElement({
          id: targetPointId,
          type: 'point',
          name: 'P',
          x: worldPos.x,
          y: worldPos.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
      }

      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      if (constructionStep === 0) {
        addTempId(targetPointId);
        setConstructionStep(1);
      } else if (constructionStep === 1) {
        const p1Id = tempIds[0];
        const p2Id = targetPointId;
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
      let targetPointId = snapResult.snappedTo;

      if (!targetPointId) {
        targetPointId = generateId();
        addElement({
          id: targetPointId,
          type: 'point',
          name: 'P',
          x: worldPos.x,
          y: worldPos.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
      }

      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      if (constructionStep === 0) {
        addTempId(targetPointId);
        setConstructionStep(1);
      } else if (constructionStep === 1) {
        const p1Id = tempIds[0];
        const vertexId = targetPointId;
        if (p1Id === vertexId) return;
        addTempId(targetPointId);
        setConstructionStep(2);
      } else if (constructionStep === 2) {
        const p1Id = tempIds[0];
        const vertexId = tempIds[1];
        const p2Id = targetPointId;
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
    } else if (activeTool === 'rectangle') {
      // Rectangle: 2 clicks define opposite corners
      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      if (constructionStep === 0) {
        // First click: create corner point A
        const cornerAId = generateId();
        addElement({
          id: cornerAId,
          type: 'point',
          name: 'P',
          x: snapResult.x,
          y: snapResult.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
        addTempId(cornerAId);
        setConstructionStep(1);
      } else if (constructionStep === 1) {
        // Second click: create 3 more corners and 4 line segments
        const cornerAId = tempIds[0];
        const cornerA = useGeoStore.getState().getElementById(cornerAId);
        if (!cornerA || cornerA.type !== 'point') return;

        const ax = cornerA.x;
        const ay = cornerA.y;
        const cx = snapResult.x;
        const cy = snapResult.y;

        // Generate a unique group ID for this rectangle
        const rectGroupId = `rect_${generateId()}`;

        // Update corner A with the group ID
        const { updateElement } = useGeoStore.getState();
        updateElement(cornerAId, { groupId: rectGroupId });

        // Create corners B, C, D (A is already created)
        // Rectangle corners: A(ax,ay), B(cx,ay), C(cx,cy), D(ax,cy)
        const cornerBId = generateId();
        const cornerCId = generateId();
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
          id: cornerCId,
          type: 'point',
          name: 'P',
          x: cx,
          y: cy,
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

        // Create 4 line segments: AB, BC, CD, DA
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
      // Triangle: 3 clicks define 3 vertices
      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      let targetPointId = snapResult.snappedTo;

      if (!targetPointId) {
        targetPointId = generateId();
        addElement({
          id: targetPointId,
          type: 'point',
          name: 'P',
          x: snapResult.x,
          y: snapResult.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
      }

      if (constructionStep < 2) {
        addTempId(targetPointId);
        setConstructionStep(constructionStep + 1);
      } else if (constructionStep === 2) {
        // We have 3 points now, create 3 line segments
        const p1Id = tempIds[0];
        const p2Id = tempIds[1];
        const p3Id = targetPointId;

        if (p1Id === p3Id || p2Id === p3Id || p1Id === p2Id) {
          resetConstruction();
          return;
        }

        // Generate a unique group ID for this triangle
        const triangleGroupId = `triangle_${generateId()}`;

        // Update all 3 vertices with the group ID
        const { updateElement } = useGeoStore.getState();
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
    } else if (activeTool === 'incenter' || activeTool === 'circumcenter') {
      // Incenter/Circumcenter: 3 point clicks to define a triangle
      let targetPointId = snapResult.snappedTo;

      if (!targetPointId) {
        targetPointId = generateId();
        addElement({
          id: targetPointId,
          type: 'point',
          name: 'P',
          x: worldPos.x,
          y: worldPos.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
      }

      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      if (constructionStep < 2) {
        addTempId(targetPointId);
        setConstructionStep(constructionStep + 1);
      } else if (constructionStep === 2) {
        // We have 3 points now
        const p1Id = tempIds[0];
        const p2Id = tempIds[1];
        const p3Id = targetPointId;

        if (p1Id === p3Id || p2Id === p3Id || p1Id === p2Id) {
          resetConstruction();
          return;
        }

        const p1 = useGeoStore.getState().getElementById(p1Id);
        const p2 = useGeoStore.getState().getElementById(p2Id);
        const p3 = useGeoStore.getState().getElementById(p3Id);

        if (!p1 || !p2 || !p3 || p1.type !== 'point' || p2.type !== 'point' || p3.type !== 'point') {
          resetConstruction();
          return;
        }

        // Use static import for geometry functions

        if (activeTool === 'incenter') {
          const incenter = getIncenter(p1, p2, p3);

          // Create incenter point
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

          // Create incircle edge point (at distance = inradius from incenter)
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

          // Create incircle
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

          // Create circumcenter point
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

          // Create circumcircle (use p1 as edge point since all vertices are on the circle)
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
    } else if (activeTool === 'ellipse' && ellipseMode !== 'equation') {
      // Ellipse by foci or center mode (3 clicks)
      let targetPointId = snapResult.snappedTo;

      if (!targetPointId) {
        targetPointId = generateId();
        addElement({
          id: targetPointId,
          type: 'point',
          name: 'P',
          x: worldPos.x,
          y: worldPos.y,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 1.5, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });
      }

      const { constructionStep, addTempId, setConstructionStep, resetConstruction, tempIds } = useToolStore.getState();

      if (constructionStep < 2) {
        addTempId(targetPointId);
        setConstructionStep(constructionStep + 1);
      } else if (constructionStep === 2) {
        // We have 3 points now
        const p1Id = tempIds[0];
        const p2Id = tempIds[1];
        const p3Id = targetPointId;

        const p1 = useGeoStore.getState().getElementById(p1Id);
        const p2 = useGeoStore.getState().getElementById(p2Id);
        const p3 = useGeoStore.getState().getElementById(p3Id);

        if (!p1 || !p2 || !p3 || p1.type !== 'point' || p2.type !== 'point' || p3.type !== 'point') {
          resetConstruction();
          return;
        }

        if (ellipseMode === 'foci') {
          // F1, F2, and P on ellipse
          // Calculate: 2a = |PF1| + |PF2|, 2c = |F1F2|, b = sqrt(a^2 - c^2)

          // Distance calculation in pixel coordinates (before Y flip doesn't matter for distances)
          const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
            Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

          // Calculate distances in pixel coordinates (PIXELS_PER_UNIT cancels out)
          const pf1Pixels = dist(p3, p1);
          const pf2Pixels = dist(p3, p2);
          const f1f2Pixels = dist(p1, p2);

          const twoA = pf1Pixels + pf2Pixels;
          const aPixels = twoA / 2;
          const cPixels = f1f2Pixels / 2;

          if (aPixels <= cPixels) {
            // Invalid ellipse (point not outside foci span)
            resetConstruction();
            return;
          }

          const bPixels = Math.sqrt(aPixels * aPixels - cPixels * cPixels);

          // Convert to math units
          const a = aPixels / PIXELS_PER_UNIT;
          const b = bPixels / PIXELS_PER_UNIT;

          // Center is midpoint of foci (convert to math coordinates)
          const centerX = ((p1.x + p2.x) / 2) / PIXELS_PER_UNIT;
          const centerY = -((p1.y + p2.y) / 2) / PIXELS_PER_UNIT;  // Flip Y

          // Calculate rotation angle in SCREEN coordinates (for Konva)
          // Konva uses screen coords where Y increases downward, so NO Y flip needed
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;  // NO Y flip - Konva expects screen angle
          const rotation = Math.atan2(dy, dx);

          addElement({
            id: generateId(),
            type: 'ellipse',
            name: `椭圆`,
            visible: true,
            style: { stroke: '#000', strokeWidth: 1.5 },
            dependencies: [p1Id, p2Id, p3Id],
            centerX,
            centerY,
            a,
            b,
            rotation,
            definition: { type: 'ellipse_by_foci', f1: p1Id, f2: p2Id, pointOn: p3Id }
          } as GeoElement);

        } else if (ellipseMode === 'center') {
          // Center, major axis endpoint, minor axis endpoint
          // Work in pixel coordinates, then convert to math coords

          // Center in math coordinates
          const centerX = p1.x / PIXELS_PER_UNIT;
          const centerY = -p1.y / PIXELS_PER_UNIT;  // Flip Y

          // Major axis endpoint determines a and rotation
          // Distance in pixels, then convert to units
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

          addElement({
            id: generateId(),
            type: 'ellipse',
            name: `椭圆`,
            visible: true,
            style: { stroke: '#000', strokeWidth: 1.5 },
            dependencies: [p1Id, p2Id, p3Id],
            centerX,
            centerY,
            a,
            b,
            rotation,
            definition: { type: 'ellipse_by_center_axes', center: p1Id, majorEnd: p2Id, minorEnd: p3Id }
          } as GeoElement);
        }

        resetConstruction();
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldPos = {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale,
    };
    useViewStore.getState().setMousePosition(worldPos);
    setLocalMousePos(worldPos);
  };

  const handleMouseLeave = () => {
    useViewStore.getState().setMousePosition(null);
    setLocalMousePos(null);
  };

  // Get cursor style based on tool and hover state
  const getCursorStyle = (): string => {
    // Drawing tools use crosshair
    const drawingTools = ['point', 'line', 'vector', 'circle', 'rectangle', 'triangle', 'arc', 'auxiliary', 'ellipse', 'parabola', 'hyperbola', 'text'];
    if (drawingTools.includes(activeTool)) {
      return 'crosshair';
    }
    // Construction tools use crosshair
    const constructionTools = ['perpendicular', 'parallel', 'midpoint', 'incenter', 'circumcenter', 'tangent'];
    if (constructionTools.includes(activeTool)) {
      return 'crosshair';
    }
    // Measurement tools
    const measureTools = ['measure_length', 'measure_angle', 'segment_mark'];
    if (measureTools.includes(activeTool)) {
      return 'crosshair';
    }
    // Select tool: pointer when hovering, default otherwise
    if (activeTool === 'select') {
      return 'default';
    }
    return 'default';
  };

  return (
    <Stage
      width={size.width}
      height={size.height}
      onWheel={handleWheel}
      draggable={activeTool === 'select'}
      onDragMove={handleDragMove}
      onClick={handleStageClick}
      onTap={handleStageClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        if (e.target === e.target.getStage()) {
          const stage = e.target.getStage();
          const pointer = stage?.getPointerPosition();
          if (pointer) useViewStore.getState().openContextMenu(null, pointer.x, pointer.y);
        }
      }}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      ref={ref}
      style={{ cursor: getCursorStyle() }}
    >
      <Grid width={size.width} height={size.height} />
      <GeoLayer />
      <EllipsePreviewLayer mousePosition={localMousePos} />
      <SnapPreviewLayer mousePosition={localMousePos} />
    </Stage>
  );
});
