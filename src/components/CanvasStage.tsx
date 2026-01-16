import { useEffect, useState, forwardRef } from 'react';
import { Stage } from 'react-konva';
import { useViewStore } from '../store/viewStore';
import { Grid } from './Grid';
import { GeoLayer } from './GeoLayer';
import { EllipsePreviewLayer } from './EllipsePreviewLayer';
import Konva from 'konva';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { generateId } from '../utils/id';
import type { GeoElement } from '../types/geoElements';
import { getSnapPosition } from '../core/snapping';
import { getIncenter, getCircumcenter } from '../core/geometry';
import { PIXELS_PER_UNIT } from '../constants/grid';

export const CanvasStage = forwardRef<Konva.Stage>((_props, ref) => {
  const { scale, position, setScale, setPosition, setSize: setViewSize, setMousePosition } = useViewStore();
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
            style: { stroke: '#000', strokeWidth: 2 },
            dependencies: [p1Id, p2Id, p3Id],
            centerX,
            centerY,
            a,
            b,
            rotation,
            definition: { type: 'ellipse_by_foci', f1: p1Id, f2: p2Id, pointOn: p3Id }
          } as any);

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
            style: { stroke: '#000', strokeWidth: 2 },
            dependencies: [p1Id, p2Id, p3Id],
            centerX,
            centerY,
            a,
            b,
            rotation,
            definition: { type: 'ellipse_by_center_axes', center: p1Id, majorEnd: p2Id, minorEnd: p3Id }
          } as any);
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
    setLocalMousePos(worldPos);
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
    setLocalMousePos(null);
  };

  // Get cursor style based on tool and hover state
  const hoveredId = useViewStore.getState().hoveredId;
  const getCursorStyle = (): string => {
    // Drawing tools use crosshair
    const drawingTools = ['point', 'line', 'vector', 'circle', 'rectangle', 'arc', 'auxiliary', 'ellipse', 'parabola'];
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
      return hoveredId ? 'pointer' : 'default';
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
    </Stage>
  );
});
