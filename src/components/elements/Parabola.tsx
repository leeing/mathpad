import React, { useMemo } from 'react';
import { Line } from 'react-konva';
import type { ParabolaElement, PointElement, LineElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import { useToolStore } from '../../store/toolStore';
import { PIXELS_PER_UNIT } from '../../constants/grid';
import { parabolaPointsByFocusDirectrix, parabolaPointsByVertexFocus } from '../../core/parabola';

interface ParabolaProps {
  element: ParabolaElement;
}

export const Parabola: React.FC<ParabolaProps> = ({ element }) => {
  const { scale, size } = useViewStore();
  const selectedId = useToolStore((state) => state.selectedId);
  const getElementById = useGeoStore((state) => state.getElementById);

  const points = useMemo(() => {
    const pts: number[] = [];
    const tMax = Math.max(size.width, size.height) / scale;
    const samples = 160;
    
    const def = element.definition;

    if (def.type === 'parabola_by_equation') {
        const { p, direction } = def;
        const vX = (element.vertexX || 0) * PIXELS_PER_UNIT;
        const vY = -(element.vertexY || 0) * PIXELS_PER_UNIT;
        const pPixels = p * PIXELS_PER_UNIT;

        for (let i = -samples; i <= samples; i++) {
            const t = (i / samples) * tMax;
            let x = 0, y = 0;
            
            // Standard equations: y^2 = 2px or x^2 = 2py
            // In our case p is focal length (vertex to focus), so y^2 = 4px?
            // Actually usually p is dist vertex to focus. x^2 = 4py.
            
            if (direction === 'up') {
                x = t;
                y = -(t * t) / (4 * pPixels);
            } else if (direction === 'down') {
                x = t;
                y = (t * t) / (4 * pPixels);
            } else if (direction === 'right') {
                y = t;
                x = (t * t) / (4 * pPixels);
            } else if (direction === 'left') {
                y = t;
                x = -(t * t) / (4 * pPixels);
            }
            pts.push(vX + x, vY + y);
        }
    } else if (def.type === 'parabola_general') {
        const { a, b, c, axis } = def;
        const xRange = tMax / PIXELS_PER_UNIT;
        for (let i = -samples; i <= samples; i++) {
            const t = (i / samples) * xRange;
            let xMath = 0, yMath = 0;
            if (axis === 'y') {
                xMath = t;
                yMath = a * t * t + b * t + c;
            } else {
                yMath = t;
                xMath = a * t * t + b * t + c;
            }
            pts.push(xMath * PIXELS_PER_UNIT, -yMath * PIXELS_PER_UNIT);
        }
    } else if (def.type === 'parabola_by_vertex_focus') {
        const vertex = getElementById(def.vertex) as PointElement;
        const focus = getElementById(def.focus) as PointElement;
        if (vertex && focus) {
            return parabolaPointsByVertexFocus({ x: vertex.x, y: vertex.y }, { x: focus.x, y: focus.y }, tMax, samples);
        }
    } else if (def.type === 'parabola_by_focus_directrix') {
        const focus = getElementById(def.focus) as PointElement;
        const directrix = getElementById(def.directrix) as LineElement;
        if (focus && directrix) {
            const p1 = getElementById(directrix.p1) as PointElement;
            const p2 = getElementById(directrix.p2) as PointElement;
            if (p1 && p2) {
                return parabolaPointsByFocusDirectrix(
                  { x: focus.x, y: focus.y },
                  { x: p1.x, y: p1.y },
                  { x: p2.x, y: p2.y },
                  tMax,
                  samples
                );
            }
        }
    }

    return pts;
  }, [element, getElementById, scale, size.height, size.width]);

  if (points.length === 0) return null;

  const isSelected = selectedId === element.id;

  return (
    <Line
      points={points}
      stroke={isSelected ? '#3b82f6' : element.style.stroke}
      strokeWidth={element.style.strokeWidth / scale}
      dash={element.style.dash ? element.style.dash.map(d => d / scale) : undefined}
      hitStrokeWidth={10 / scale}
      onClick={() => useToolStore.getState().setSelectedId(element.id)}
    />
  );
};
