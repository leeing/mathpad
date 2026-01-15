import type { GeoElement, PointElement, LineElement, CircleElement } from '../types/geoElements';

export type SnapType = 'point' | 'midpoint' | 'intersection' | 'on_line' | 'on_circle' | 'grid';

export interface SnapResult {
  x: number;
  y: number;
  snappedTo?: string; // ID of element
  snapType?: SnapType;
  label?: string; // Display hint for user
}

// Calculate midpoint between two points
function getMidpoint(p1: PointElement, p2: PointElement): { x: number; y: number } {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
}

// Calculate point projection onto a line segment
function projectPointOnLine(
  px: number, py: number,
  p1: PointElement, p2: PointElement
): { x: number; y: number; t: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len2 = dx * dx + dy * dy;

  if (len2 < 1e-10) {
    return { x: p1.x, y: p1.y, t: 0 };
  }

  const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / len2));

  return {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
    t
  };
}

export function getSnapPosition(
  x: number,
  y: number,
  elements: Record<string, GeoElement>,
  threshold: number = 10,
  excludeIds: string[] = [],
  getElement?: (id: string) => GeoElement | undefined
): SnapResult {
  let closestDist = threshold;
  let result: SnapResult = { x, y };

  const getter = getElement || ((id: string) => elements[id]);
  const points = Object.values(elements).filter(el => el.type === 'point' && el.visible) as PointElement[];
  const lines = Object.values(elements).filter(el => el.type === 'line' && el.visible) as LineElement[];

  // Priority 1: Existing points
  for (const p of points) {
    if (excludeIds.includes(p.id)) continue;

    const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
    if (dist < closestDist) {
      closestDist = dist;
      result = {
        x: p.x,
        y: p.y,
        snappedTo: p.id,
        snapType: 'point',
        label: p.name || '点'
      };
    }
  }

  // Priority 2: Midpoints of line segments
  for (const line of lines) {
    if (excludeIds.includes(line.id)) continue;

    const p1 = getter(line.p1) as PointElement | undefined;
    const p2 = getter(line.p2) as PointElement | undefined;

    if (p1 && p2 && line.subtype === 'segment') {
      const mid = getMidpoint(p1, p2);
      const dist = Math.sqrt((mid.x - x) ** 2 + (mid.y - y) ** 2);

      if (dist < closestDist) {
        closestDist = dist;
        result = {
          x: mid.x,
          y: mid.y,
          snappedTo: line.id,
          snapType: 'midpoint',
          label: '中点'
        };
      }
    }
  }

  // Priority 3: Points on line segments
  if (!result.snappedTo) {
    for (const line of lines) {
      if (excludeIds.includes(line.id)) continue;

      const p1 = getter(line.p1) as PointElement | undefined;
      const p2 = getter(line.p2) as PointElement | undefined;

      if (p1 && p2) {
        const proj = projectPointOnLine(x, y, p1, p2);
        const dist = Math.sqrt((proj.x - x) ** 2 + (proj.y - y) ** 2);

        // Only snap to line if within segment (for segments) and within threshold
        if (dist < closestDist && proj.t > 0.01 && proj.t < 0.99) {
          closestDist = dist;
          result = {
            x: proj.x,
            y: proj.y,
            snappedTo: line.id,
            snapType: 'on_line',
            label: '线上'
          };
        }
      }
    }
  }

  // Priority 4: Points on circles
  const circles = Object.values(elements).filter(el => el.type === 'circle' && el.visible) as CircleElement[];

  if (!result.snappedTo) {
    for (const circle of circles) {
      if (excludeIds.includes(circle.id)) continue;

      const center = getter(circle.center) as PointElement | undefined;
      const edge = getter(circle.edge) as PointElement | undefined;

      if (center && edge) {
        const radius = Math.sqrt((edge.x - center.x) ** 2 + (edge.y - center.y) ** 2);
        const distToCenter = Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2);
        const distToCircle = Math.abs(distToCenter - radius);

        if (distToCircle < closestDist && distToCenter > 0.1) {
          closestDist = distToCircle;
          // Project point onto circle
          const angle = Math.atan2(y - center.y, x - center.x);
          result = {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
            snappedTo: circle.id,
            snapType: 'on_circle',
            label: '圆上'
          };
        }
      }
    }
  }

  return result;
}
