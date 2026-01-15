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
  const { scale, size } = useViewStore();
  const getElementById = useGeoStore((state) => state.getElementById);
  const updateElement = useGeoStore((state) => state.updateElement);
  const activeTool = useToolStore((state) => state.activeTool);

  // Track initial positions for drag translation
  const dragStartRef = useRef<{ p1x: number; p1y: number; p2x: number; p2y: number } | null>(null);

  const p1 = getElementById(element.p1) as PointElement;
  const p2 = getElementById(element.p2) as PointElement;

  if (!p1 || !p2) return null;

  let points = [p1.x, p1.y, p2.x, p2.y];

  if (element.subtype === 'line') {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-6) {
      // Extend well beyond the viewport
      const viewDiag = Math.sqrt((size.width / scale) ** 2 + (size.height / scale) ** 2);
      const extendLen = viewDiag * 3; // 3x diagonal should be enough coverage

      const ux = dx / len;
      const uy = dy / len;

      // Center of the segment
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      points = [
        cx - ux * extendLen,
        cy - uy * extendLen,
        cx + ux * extendLen,
        cy + uy * extendLen
      ];
    }
  }

  // Drag handlers for whole-shape translation
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (activeTool !== 'select') {
      e.target.x(0);
      e.target.y(0);
      return;
    }
    // Store initial positions
    dragStartRef.current = { p1x: p1.x, p1y: p1.y, p2x: p2.x, p2y: p2.y };
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (activeTool !== 'select' || !dragStartRef.current) {
      e.target.x(0);
      e.target.y(0);
      return;
    }
    // Calculate delta from group position (which was 0,0 at start)
    const dx = e.target.x();
    const dy = e.target.y();

    // Update both endpoints
    updateElement(element.p1, { x: dragStartRef.current.p1x + dx, y: dragStartRef.current.p1y + dy });
    updateElement(element.p2, { x: dragStartRef.current.p2x + dx, y: dragStartRef.current.p2y + dy });
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

    if (activeTool === 'perpendicular') {
      e.cancelBubble = true;
      const { addTempId, resetConstruction, tempIds } = useToolStore.getState();
      const { addElement, getElementById } = useGeoStore.getState();

      addTempId(element.id);

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
    } else if (activeTool === 'midpoint') {
      // For midpoint, clicking on a line segment creates its midpoint
      e.cancelBubble = true;
      const { resetConstruction } = useToolStore.getState();
      const { addElement, getElementById } = useGeoStore.getState();

      // Create midpoint of this line segment
      const p1 = getElementById(element.p1) as PointElement | undefined;
      const p2 = getElementById(element.p2) as PointElement | undefined;

      if (p1 && p2 && element.subtype === 'segment') {
        addElement({
          id: generateId(),
          type: 'point',
          name: 'M',
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2,
          visible: true,
          style: { stroke: '#2563eb', strokeWidth: 2, fill: '#3b82f6' },
          dependencies: [element.p1, element.p2],
          definition: { type: 'midpoint', p1: element.p1, p2: element.p2 }
        });
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
  const selection = useGeoStore((state) => state.selection);
  const isSelected = selection.includes(element.id);

  // Determine stroke color: selected -> blue, otherwise use element style (inverted for dark mode)
  const getStrokeColor = () => {
    if (isSelected) return '#3b82f6'; // Blue when selected
    if (element.style.stroke && element.style.stroke !== '#000') {
      return element.style.stroke; // Use custom color if set
    }
    return darkTheme ? '#e5e7eb' : '#000'; // Default: white in dark, black in light
  };

  const strokeWidth = element.style.strokeWidth ? element.style.strokeWidth / scale : 2 / scale;

  // Use Arrow component for vector subtype
  if (element.subtype === 'vector') {
    return (
      <Arrow
        points={points}
        stroke={getStrokeColor()}
        strokeWidth={strokeWidth}
        fill={getStrokeColor()}
        pointerLength={10 / scale}
        pointerWidth={8 / scale}
        hitStrokeWidth={20 / scale}
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
  }

  return (
    <KonvaLine
      points={points}
      stroke={getStrokeColor()}
      strokeWidth={strokeWidth}
      dash={element.style.dash ? element.style.dash.map(d => d / scale) : undefined}
      hitStrokeWidth={20 / scale}
      listening={activeTool === 'select' || activeTool === 'perpendicular' || activeTool === 'parallel' || activeTool === 'midpoint' || activeTool === 'segment_mark'}
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
