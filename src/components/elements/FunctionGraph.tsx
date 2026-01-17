import React from 'react';
import { Line } from 'react-konva';
import type { FunctionGraphElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import { useToolStore } from '../../store/toolStore';
import * as math from 'mathjs';
import Konva from 'konva';

interface FunctionGraphProps {
  element: FunctionGraphElement;
}

import { PIXELS_PER_UNIT } from '../../constants/grid';

export const FunctionGraph: React.FC<FunctionGraphProps> = ({ element }) => {
  const { scale, position, size } = useViewStore();
  const showHiddenElements = useViewStore((state) => state.showHiddenElements);
  const selection = useGeoStore((state) => state.selection);
  const setSelection = useGeoStore((state) => state.setSelection);
  const activeTool = useToolStore((state) => state.activeTool);
  const hoveredId = useViewStore((state) => state.hoveredId);
  const setHoveredId = useViewStore((state) => state.setHoveredId);

  // Handle visibility
  if (!element.visible && !showHiddenElements) return null;

  const isSelected = selection.includes(element.id);
  const isHovered = hoveredId === element.id;

  // Generate points
  const points: number[] = [];

  // Viewport bounds in world coordinates (pixels)
  const minXPixel = -position.x / scale;
  const maxXPixel = (size.width - position.x) / scale;

  // Step size (pixel density)
  const step = 2 / scale;

  try {
    const compiled = math.compile(element.expression);

    for (let xPixel = minXPixel; xPixel <= maxXPixel; xPixel += step) {
      try {
        // Convert screen pixel X to math unit X
        const xMath = xPixel / PIXELS_PER_UNIT;

        const scope = { x: xMath };
        const yMath = compiled.evaluate(scope);

        if (typeof yMath === 'number' && isFinite(yMath)) {
          // Convert math unit Y to screen pixel Y
          const yPixel = yMath * PIXELS_PER_UNIT;

          points.push(xPixel, -yPixel); // Invert Y because screen Y is down
        }
      } catch {
        // Ignore evaluation errors for specific x
      }
    }
  } catch {
    // Invalid expression
    return null;
  }

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (activeTool === 'select') {
      e.cancelBubble = true;
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
    }
  };

  const handleMouseEnter = () => setHoveredId(element.id);
  const handleMouseLeave = () => setHoveredId(null);

  // Determine stroke: user color takes priority, selection shown via shadow
  const getStrokeColor = () => {
    // User-defined color takes priority
    if (element.style.stroke) return element.style.stroke;
    if (isHovered) return '#f59e0b';
    return '#ef4444'; // Default red for function graphs
  };

  return (
    <Line
      points={points}
      stroke={getStrokeColor()}
      strokeWidth={(isSelected ? 3 : (element.style.strokeWidth || 2)) / scale}
      hitStrokeWidth={15 / scale}
      listening={activeTool === 'select'}
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      shadowColor={isSelected ? '#dc2626' : (isHovered ? '#f59e0b' : undefined)}
      shadowBlur={isSelected ? 8 : (isHovered ? 6 : 0)}
      shadowEnabled={isSelected || isHovered}
    />
  );
};
