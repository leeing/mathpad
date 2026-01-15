import { useEffect, useState, forwardRef } from 'react';
import { Stage } from 'react-konva';
import { useViewStore } from '../store/viewStore';
import { Grid } from './Grid';
import { GeoLayer } from './GeoLayer';
import Konva from 'konva';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { generateId } from '../utils/id';
import type { GeoElement } from '../types/geoElements';
import { getSnapPosition } from '../core/snapping';
import { getIncenter, getCircumcenter } from '../core/geometry';

export const CanvasStage = forwardRef<Konva.Stage>((_props, ref) => {
  const { scale, position, setScale, setPosition, setSize: setViewSize, setMousePosition } = useViewStore();
  const activeTool = useToolStore((state) => state.activeTool);
  const setSelectedId = useToolStore((state) => state.setSelectedId);
  const addElement = useGeoStore((state) => state.addElement);
  const elements = useGeoStore((state) => state.elements);

  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

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

    if (activeTool === 'point') {
      if (snapResult.snappedTo) return; // Don't create point on top of existing point

      addElement({
        id: generateId(),
        type: 'point',
        name: 'P',
        x: snapResult.x, // Use snap position (though for point creation it's just mouse pos if not snapped)
        y: snapResult.y,
        visible: true,
        style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
        dependencies: [],
        definition: { type: 'free' }
      });
    } else if (activeTool === 'line' || activeTool === 'vector' || activeTool === 'auxiliary') {
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
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
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
        addElement({
          id: generateId(),
          type: 'line',
          subtype: isVector ? 'vector' : 'segment',
          name: isAuxiliary ? 'aux' : (isVector ? 'v' : 'l'),
          visible: true,
          style: {
            stroke: isAuxiliary ? '#9ca3af' : (isVector ? '#dc2626' : '#000'),
            strokeWidth: isAuxiliary ? 1.5 : 2,
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
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
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
          style: { stroke: '#000', strokeWidth: 2 },
          dependencies: [centerId, edgeId],
          definition: { type: 'circle_by_points', center: centerId, edge: edgeId },
          center: centerId,
          edge: edgeId
        });
        resetConstruction();
      }
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
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
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
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
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
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
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
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });

        addElement({
          id: cornerCId,
          type: 'point',
          name: 'P',
          x: cx,
          y: cy,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
        });

        addElement({
          id: cornerDId,
          type: 'point',
          name: 'P',
          x: ax,
          y: cy,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
          dependencies: [],
          definition: { type: 'free' }
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
            style: { stroke: '#000', strokeWidth: 2 },
            dependencies: [p1Id, p2Id],
            definition: { type: 'line_from_points', p1: p1Id, p2: p2Id },
            p1: p1Id,
            p2: p2Id
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
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
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
            style: { stroke: '#dc2626', strokeWidth: 2, fill: '#ef4444' },
            dependencies: [p1Id, p2Id, p3Id],
            definition: { type: 'free' }
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
            style: { stroke: '#dc2626', strokeWidth: 2, fill: '#ef4444' },
            dependencies: [incenterPointId],
            definition: { type: 'free' }
          });

          // Create incircle
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

          // Create circumcenter point
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

          // Create circumcircle (use p1 as edge point since all vertices are on the circle)
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
    setMousePosition(worldPos);
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
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
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      ref={ref}
    >
      <Grid width={size.width} height={size.height} />
      <GeoLayer />
    </Stage>
  );
});
