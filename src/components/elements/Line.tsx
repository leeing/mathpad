import React, { useRef } from 'react';
import { Line as KonvaLine, Arrow } from 'react-konva';
import type { LineElement, PointElement } from '../../types/geoElements';
import { useGeoStore } from '../../store/geoStore';
import { useViewStore } from '../../store/viewStore';
import { useToolStore } from '../../store/toolStore';
import { generateId } from '../../utils/id';

import Konva from 'konva';

interface LineProps {
  element: LineElement;
}

export const Line: React.FC<LineProps> = ({ element }) => {
  // All hooks MUST be called before any early returns
  const { scale, size } = useViewStore();
  const examMode = useViewStore((state) => state.examMode);
  const showHiddenElements = useViewStore((state) => state.showHiddenElements);
  const hoveredId = useViewStore((state) => state.hoveredId);
  const setHoveredId = useViewStore((state) => state.setHoveredId);
  // Subscribe directly to endpoint elements so Line re-renders when they move
  const p1 = useGeoStore((state) => state.elements[element.p1]) as PointElement | undefined;
  const p2 = useGeoStore((state) => state.elements[element.p2]) as PointElement | undefined;
  const updateElement = useGeoStore((state) => state.updateElement);
  const activeTool = useToolStore((state) => state.activeTool);
  const selection = useGeoStore((state) => state.selection);

  // Check if this line is a parabola's directrix - if so, it should not be draggable
  const isParabolaDirectrix = (): boolean => {
    const { elements } = useGeoStore.getState();
    for (const el of Object.values(elements)) {
      if (el.type === 'parabola' && el.dependencies.includes(element.id)) {
        return true;
      }
    }
    return false;
  };

  // Determine if this line is draggable
  const isDraggable = activeTool === 'select' && !isParabolaDirectrix();

  // Track initial positions for drag translation (exactly like Circle)
  const dragStartRef = useRef<{ p1x: number; p1y: number; p2x: number; p2y: number } | null>(null);

  // Handle visibility - if hidden and not in preview mode, don't render
  const isHidden = element.visible === false;
  if (isHidden && !showHiddenElements) {
    return null;
  }

  if (!p1 || !p2) return null;

  // Use p1 as the position anchor (like Circle uses center)
  // Points are RELATIVE to p1, so when p1 moves, the line moves with it
  let relativePoints = [0, 0, p2.x - p1.x, p2.y - p1.y];

  if (element.subtype === 'line') {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-6) {
      // Extend well beyond the viewport
      const viewDiag = Math.sqrt((size.width / scale) ** 2 + (size.height / scale) ** 2);
      const extendLen = viewDiag * 3;

      const ux = dx / len;
      const uy = dy / len;

      // Center of the segment, relative to p1
      const cx = dx / 2;
      const cy = dy / 2;

      relativePoints = [
        cx - ux * extendLen,
        cy - uy * extendLen,
        cx + ux * extendLen,
        cy + uy * extendLen
      ];
    }
  }

  // Drag handlers - EXACTLY matching Circle pattern
  // Circle uses x={center.x}, Line uses x={p1.x} - same concept
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (activeTool !== 'select') {
      e.target.x(p1.x);
      e.target.y(p1.y);
      return;
    }
    // Store initial positions (like Circle stores center.x, center.y, edge.x, edge.y)
    dragStartRef.current = { p1x: p1.x, p1y: p1.y, p2x: p2.x, p2y: p2.y };
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (activeTool !== 'select' || !dragStartRef.current) {
      e.target.x(p1.x);
      e.target.y(p1.y);
      return;
    }
    // Calculate delta from p1 position (exactly like Circle: dx = e.target.x() - dragStartRef.cx)
    const dx = e.target.x() - dragStartRef.current.p1x;
    const dy = e.target.y() - dragStartRef.current.p1y;

    // Update both endpoints (like Circle updates center and edge)
    updateElement(element.p1, { x: dragStartRef.current.p1x + dx, y: dragStartRef.current.p1y + dy });
    updateElement(element.p2, { x: dragStartRef.current.p2x + dx, y: dragStartRef.current.p2y + dy });
  };

  const handleDragEnd = () => {
    // Just clear the ref, exactly like Circle does
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

    if (activeTool === 'perpendicular') {
      e.cancelBubble = true;
      const { addTempId, resetConstruction, tempIds, setConstructionStep, constructionStep } = useToolStore.getState();
      const { addElement, getElementById } = useGeoStore.getState();

      // Step 1: Select line (just store line id, don't create anything yet)
      if (constructionStep === 0) {
        addTempId(element.id);
        setConstructionStep(1);
        return;
      }

      // If step 1 done and clicking on another line, check if we have line + point
      const ids = [...tempIds, element.id];
      const fetchedElements = ids.map(id => getElementById(id)).filter(el => el);
      const lines = fetchedElements.filter(el => el?.type === 'line');
      const points = fetchedElements.filter(el => el?.type === 'point');

      if (lines.length === 1 && points.length === 1) {
        const lineId = lines[0]!.id;
        const pointId = points[0]!.id;

        const dirPointId = generateId();
        addElement({
          id: dirPointId,
          type: 'point',
          name: 'D',
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
          style: { stroke: '#000', strokeWidth: 1, dash: [5, 5] },
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
      const fetchedElements = ids.map(id => getElementById(id)).filter(el => el);
      const lines = fetchedElements.filter(el => el?.type === 'line');
      const points = fetchedElements.filter(el => el?.type === 'point');

      if (lines.length === 1 && points.length === 1) {
        const lineEl = lines[0] as LineElement;
        const pointId = points[0]!.id;

        // Get direction from the original line
        const lp1 = getElementById(lineEl.p1) as PointElement | undefined;
        const lp2 = getElementById(lineEl.p2) as PointElement | undefined;
        const sourcePoint = getElementById(pointId) as PointElement | undefined;

        if (lp1 && lp2 && sourcePoint) {
          const dx = lp2.x - lp1.x;
          const dy = lp2.y - lp1.y;
          const len = Math.sqrt(dx * dx + dy * dy);

          if (len > 1e-6) {
            // Create second point in parallel direction
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
    } else if (activeTool === 'segment_mark') {
      e.cancelBubble = true;
      const { resetConstruction } = useToolStore.getState();
      const { addElement } = useGeoStore.getState();

      // Cycle through mark types: equal_1 -> equal_2 -> equal_3 -> parallel_1 -> parallel_2 -> remove
      // For simplicity, just add equal_1 mark
      addElement({
        id: generateId(),
        type: 'segment_mark',
        name: 'mark',
        visible: true,
        style: { stroke: '#000', strokeWidth: 1.5 },
        dependencies: [element.id],
        lineId: element.id,
        markType: 'equal_1',
        definition: { type: 'segment_mark', lineId: element.id, markType: 'equal_1' }
      });
      resetConstruction();
    }
  };

  const darkTheme = useViewStore.getState().darkTheme;
  const isSelected = selection.includes(element.id);
  const isHovered = hoveredId === element.id;

  const handleMouseEnter = () => setHoveredId(element.id);
  const handleMouseLeave = () => setHoveredId(null);

  // Determine stroke color: user color takes priority, selection shown via shadow
  const getStrokeColor = () => {
    // User-defined color takes priority (selection indicated by shadow instead)
    if (element.style.stroke && element.style.stroke !== '#000') {
      return element.style.stroke; // Use custom color if set
    }
    if (isHovered) return '#f59e0b'; // Orange when hovered
    // In dark mode, skip examMode colors to keep elements visible
    if (examMode && !darkTheme) {
      const isAux = element.name === 'aux' || (Array.isArray(element.style.dash) && element.style.dash.length > 0);
      return isAux ? '#6b7280' : '#111827';
    }
    return darkTheme ? '#e5e7eb' : '#000'; // Default: white in dark, black in light
  };

  const strokeWidth = element.style.strokeWidth ? element.style.strokeWidth / scale : 1.5 / scale;

  // Use Arrow component for vector subtype
  if (element.subtype === 'vector') {
    return (
      <Arrow
        x={p1.x}
        y={p1.y}
        points={relativePoints}
        stroke={getStrokeColor()}
        strokeWidth={strokeWidth}
        fill={getStrokeColor()}
        pointerLength={10 / scale}
        pointerWidth={8 / scale}
        hitStrokeWidth={20 / scale}
        listening={activeTool === 'select'}
        draggable={isDraggable}
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
  }

  return (
    <KonvaLine
      x={p1.x}
      y={p1.y}
      points={relativePoints}
      stroke={getStrokeColor()}
      strokeWidth={strokeWidth}
      dash={element.style.dash ? element.style.dash.map(d => d / scale) : undefined}
      hitStrokeWidth={20 / scale}
      listening={activeTool === 'select' || activeTool === 'perpendicular' || activeTool === 'parallel' || activeTool === 'segment_mark'}
      draggable={isDraggable}
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
