import React, { useRef } from 'react';
import { Circle as KonvaCircle } from 'react-konva';
import type { CircleElement, PointElement } from '../../types/geoElements';
import { useGeoStore } from '../../store/geoStore';
import { useViewStore } from '../../store/viewStore';
import { useToolStore } from '../../store/toolStore';
import Konva from 'konva';

interface CircleProps {
  element: CircleElement;
}

export const Circle: React.FC<CircleProps> = ({ element }) => {
  const { scale } = useViewStore();
  const examMode = useViewStore((state) => state.examMode);
  const activeTool = useToolStore((state) => state.activeTool);
  const selection = useGeoStore((state) => state.selection);
  const getElementById = useGeoStore((state) => state.getElementById);
  const updateElement = useGeoStore((state) => state.updateElement);
  const hoveredId = useViewStore((state) => state.hoveredId);
  const setHoveredId = useViewStore((state) => state.setHoveredId);

  // Track initial positions for drag translation
  const dragStartRef = useRef<{ cx: number; cy: number; ex: number; ey: number } | null>(null);

  const center = getElementById(element.center) as PointElement;
  const edge = getElementById(element.edge) as PointElement;

  if (!element.visible) return null;
  if (!center || !edge) return null;

  const dx = edge.x - center.x;
  const dy = edge.y - center.y;
  const radius = Math.sqrt(dx * dx + dy * dy);

  // Drag handlers for whole-shape translation
  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (activeTool !== 'select') {
      e.target.x(center.x);
      e.target.y(center.y);
      return;
    }
    dragStartRef.current = { cx: center.x, cy: center.y, ex: edge.x, ey: edge.y };
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (activeTool !== 'select' || !dragStartRef.current) {
      e.target.x(center.x);
      e.target.y(center.y);
      return;
    }
    // Calculate delta from center position (shape was at center.x, center.y at start)
    const dx = e.target.x() - dragStartRef.current.cx;
    const dy = e.target.y() - dragStartRef.current.cy;

    // Update both center and edge points
    updateElement(element.center, { x: dragStartRef.current.cx + dx, y: dragStartRef.current.cy + dy });
    updateElement(element.edge, { x: dragStartRef.current.ex + dx, y: dragStartRef.current.ey + dy });
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

    // Tangent tool: click circle to add to tempIds
    if (activeTool === 'tangent') {
      e.cancelBubble = true;
      const { addTempId } = useToolStore.getState();
      addTempId(element.id);
      return;
    }
  };

  const darkTheme = useViewStore.getState().darkTheme;
  const isSelected = selection.includes(element.id);
  const isHovered = hoveredId === element.id;

  const handleMouseEnter = () => setHoveredId(element.id);
  const handleMouseLeave = () => setHoveredId(null);

  // Determine stroke color: use element's set color, only hover changes color
  const getStrokeColor = () => {
    // User-defined color takes priority (selection indicated by shadow instead)
    if (element.style.stroke && element.style.stroke !== '#000') {
      return element.style.stroke;
    }
    if (isHovered) return '#f59e0b';
    if (examMode) return '#111827';
    return darkTheme ? '#e5e7eb' : '#000';
  };

  return (
    <KonvaCircle
      x={center.x}
      y={center.y}
      radius={radius}
      stroke={getStrokeColor()}
      strokeWidth={element.style.strokeWidth ? element.style.strokeWidth / scale : 1.5 / scale}
      dash={element.style.dash ? element.style.dash.map(d => d / scale) : undefined}
      fill={element.style.fill || 'transparent'}
      hitStrokeWidth={10 / scale}
      listening={activeTool === 'select' || activeTool === 'tangent'}
      draggable={activeTool === 'select'}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return;
        useViewStore.getState().openContextMenu(element.id, pointer.x, pointer.y);
      }}
      shadowColor={isSelected ? '#dc2626' : (isHovered ? '#f59e0b' : undefined)}
      shadowBlur={isSelected ? 8 : (isHovered ? 6 : 0)}
      shadowEnabled={isSelected || isHovered}
    />
  );
};
