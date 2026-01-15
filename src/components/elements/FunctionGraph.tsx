import React from 'react';
import { Line } from 'react-konva';
import type { FunctionGraphElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import * as math from 'mathjs';

interface FunctionGraphProps {
  element: FunctionGraphElement;
}

import { PIXELS_PER_UNIT } from '../../constants/grid';

export const FunctionGraph: React.FC<FunctionGraphProps> = ({ element }) => {
  const { scale, position, size } = useViewStore();

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

  return (
    <Line
      points={points}
      stroke={element.style.stroke || '#ef4444'}
      strokeWidth={element.style.strokeWidth ? element.style.strokeWidth / scale : 2 / scale}
      listening={false}
    />
  );
};
