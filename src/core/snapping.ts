import type { GeoElement, PointElement, LineElement, CircleElement } from '../types/geoElements';

export type SnapType = 'point' | 'midpoint' | 'intersection' | 'on_line' | 'on_circle' | 'grid';

export interface SnapResult {
  x: number;
  y: number;
  snappedTo?: string; // ID of element
  snapType?: SnapType;
  label?: string; // Display hint for user
  intersectionElements?: [string, string]; // IDs of two intersecting elements
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

// Calculate circle-line intersections
// Returns 0, 1, or 2 intersection points
function getCircleLineIntersections(
  center: { x: number; y: number },
  radius: number,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  constrainToSegment: boolean = true
): { x: number; y: number }[] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const fx = p1.x - center.x;
  const fy = p1.y - center.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0 || a < 1e-10) {
    return []; // No intersection
  }

  const intersections: { x: number; y: number }[] = [];
  const sqrtD = Math.sqrt(discriminant);

  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  // Check if t values are within valid range
  const isValidT = (t: number) => constrainToSegment ? (t >= -0.01 && t <= 1.01) : true;

  if (isValidT(t1)) {
    intersections.push({
      x: p1.x + t1 * dx,
      y: p1.y + t1 * dy
    });
  }

  if (isValidT(t2) && Math.abs(t1 - t2) > 1e-6) {
    intersections.push({
      x: p1.x + t2 * dx,
      y: p1.y + t2 * dy
    });
  }

  return intersections;
}

// Calculate line-line intersection
function getLineLineIntersection(
  l1p1: { x: number; y: number },
  l1p2: { x: number; y: number },
  l2p1: { x: number; y: number },
  l2p2: { x: number; y: number },
  constrainToSegments: boolean = true
): { x: number; y: number } | null {
  const x1 = l1p1.x, y1 = l1p1.y;
  const x2 = l1p2.x, y2 = l1p2.y;
  const x3 = l2p1.x, y3 = l2p1.y;
  const x4 = l2p2.x, y4 = l2p2.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 1e-10) {
    return null; // Parallel or coincident
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (constrainToSegments) {
    if (t < -0.01 || t > 1.01 || u < -0.01 || u > 1.01) {
      return null; // Intersection outside segments
    }
  }

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1)
  };
}

// Calculate circle-circle intersections
// Returns 0, 1, or 2 intersection points
function getCircleCircleIntersections(
  c1: { x: number; y: number },
  r1: number,
  c2: { x: number; y: number },
  r2: number
): { x: number; y: number }[] {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  // No intersection cases
  if (d > r1 + r2 || d < Math.abs(r1 - r2) || d < 1e-10) {
    return [];
  }

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;

  if (h2 < 0) {
    return [];
  }

  const h = Math.sqrt(h2);

  // Point P is on the line between centers
  const px = c1.x + a * dx / d;
  const py = c1.y + a * dy / d;

  // Perpendicular direction
  const perpX = -dy / d;
  const perpY = dx / d;

  const intersections: { x: number; y: number }[] = [];

  // First intersection
  intersections.push({
    x: px + h * perpX,
    y: py + h * perpY
  });

  // Second intersection (if h > 0)
  if (h > 1e-6) {
    intersections.push({
      x: px - h * perpX,
      y: py - h * perpY
    });
  }

  return intersections;
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
  const circles = Object.values(elements).filter(el => el.type === 'circle' && el.visible) as CircleElement[];

  // Priority 0.5: Origin point (0, 0) - always available as intersection
  const originDist = Math.sqrt(x * x + y * y);
  if (originDist < closestDist) {
    closestDist = originDist;
    result = {
      x: 0,
      y: 0,
      snapType: 'intersection',
      label: '原点'
    };
  }

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

  // Priority 1.5: Intersection points (higher priority than midpoints/on_line)
  // Circle-Line intersections
  for (const circle of circles) {
    if (excludeIds.includes(circle.id)) continue;

    const center = getter(circle.center) as PointElement | undefined;
    const edge = getter(circle.edge) as PointElement | undefined;
    if (!center || !edge) continue;

    const radius = Math.sqrt((edge.x - center.x) ** 2 + (edge.y - center.y) ** 2);

    for (const line of lines) {
      if (excludeIds.includes(line.id)) continue;

      const p1 = getter(line.p1) as PointElement | undefined;
      const p2 = getter(line.p2) as PointElement | undefined;
      if (!p1 || !p2) continue;

      const constrainToSegment = line.subtype === 'segment';
      const intersections = getCircleLineIntersections(center, radius, p1, p2, constrainToSegment);

      for (const inter of intersections) {
        const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: inter.x,
            y: inter.y,
            snapType: 'intersection',
            label: '交点',
            intersectionElements: [circle.id, line.id]
          };
        }
      }
    }
  }

  // Line-Line intersections
  for (let i = 0; i < lines.length; i++) {
    const line1 = lines[i];
    if (excludeIds.includes(line1.id)) continue;

    const l1p1 = getter(line1.p1) as PointElement | undefined;
    const l1p2 = getter(line1.p2) as PointElement | undefined;
    if (!l1p1 || !l1p2) continue;

    for (let j = i + 1; j < lines.length; j++) {
      const line2 = lines[j];
      if (excludeIds.includes(line2.id)) continue;

      const l2p1 = getter(line2.p1) as PointElement | undefined;
      const l2p2 = getter(line2.p2) as PointElement | undefined;
      if (!l2p1 || !l2p2) continue;

      const constrainToSegments = line1.subtype === 'segment' && line2.subtype === 'segment';
      const inter = getLineLineIntersection(l1p1, l1p2, l2p1, l2p2, constrainToSegments);

      if (inter) {
        const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: inter.x,
            y: inter.y,
            snapType: 'intersection',
            label: '交点',
            intersectionElements: [line1.id, line2.id]
          };
        }
      }
    }
  }

  // Priority 1.55: Circle-Circle intersections
  for (let i = 0; i < circles.length; i++) {
    const circle1 = circles[i];
    if (excludeIds.includes(circle1.id)) continue;

    const c1Center = getter(circle1.center) as PointElement | undefined;
    const c1Edge = getter(circle1.edge) as PointElement | undefined;
    if (!c1Center || !c1Edge) continue;

    const r1 = Math.sqrt((c1Edge.x - c1Center.x) ** 2 + (c1Edge.y - c1Center.y) ** 2);

    for (let j = i + 1; j < circles.length; j++) {
      const circle2 = circles[j];
      if (excludeIds.includes(circle2.id)) continue;

      const c2Center = getter(circle2.center) as PointElement | undefined;
      const c2Edge = getter(circle2.edge) as PointElement | undefined;
      if (!c2Center || !c2Edge) continue;

      const r2 = Math.sqrt((c2Edge.x - c2Center.x) ** 2 + (c2Edge.y - c2Center.y) ** 2);

      const intersections = getCircleCircleIntersections(c1Center, r1, c2Center, r2);

      for (const inter of intersections) {
        const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: inter.x,
            y: inter.y,
            snapType: 'intersection',
            label: '交点',
            intersectionElements: [circle1.id, circle2.id]
          };
        }
      }
    }
  }

  // Priority 1.6: X-axis and Y-axis intersections with lines and circles
  // X-axis is y=0, Y-axis is x=0 (in pixel coordinates, these are the origin lines)
  // For each line segment, check if it crosses the axes
  for (const line of lines) {
    if (excludeIds.includes(line.id)) continue;

    const p1 = getter(line.p1) as PointElement | undefined;
    const p2 = getter(line.p2) as PointElement | undefined;
    if (!p1 || !p2) continue;

    const constrainToSegment = line.subtype === 'segment';

    // Check intersection with X-axis (y = 0)
    // For infinite lines, always calculate; for segments, only if crossing axis
    const dy = p2.y - p1.y;
    const dx = p2.x - p1.x;

    if (Math.abs(dy) > 1e-10) { // Not parallel to X-axis
      const crossesXAxis = (p1.y >= 0 && p2.y <= 0) || (p1.y <= 0 && p2.y >= 0);
      if (!constrainToSegment || crossesXAxis) {
        const t = -p1.y / dy;
        if (!constrainToSegment || (t >= -0.01 && t <= 1.01)) {
          const interX = p1.x + t * dx;
          const dist = Math.sqrt((interX - x) ** 2 + (0 - y) ** 2);
          if (dist < closestDist) {
            closestDist = dist;
            result = {
              x: interX,
              y: 0,
              snapType: 'intersection',
              label: 'X轴交点'
            };
          }
        }
      }
    }

    // Check intersection with Y-axis (x = 0)
    // For infinite lines, always calculate; for segments, only if crossing axis
    if (Math.abs(dx) > 1e-10) { // Not parallel to Y-axis
      const crossesYAxis = (p1.x >= 0 && p2.x <= 0) || (p1.x <= 0 && p2.x >= 0);
      if (!constrainToSegment || crossesYAxis) {
        const t = -p1.x / dx;
        if (!constrainToSegment || (t >= -0.01 && t <= 1.01)) {
          const interY = p1.y + t * dy;
          const dist = Math.sqrt((0 - x) ** 2 + (interY - y) ** 2);
          if (dist < closestDist) {
            closestDist = dist;
            result = {
              x: 0,
              y: interY,
              snapType: 'intersection',
              label: 'Y轴交点'
            };
          }
        }
      }
    }
  }

  // Check circles intersection with axes
  for (const circle of circles) {
    if (excludeIds.includes(circle.id)) continue;

    const center = getter(circle.center) as PointElement | undefined;
    const edge = getter(circle.edge) as PointElement | undefined;
    if (!center || !edge) continue;

    const radius = Math.sqrt((edge.x - center.x) ** 2 + (edge.y - center.y) ** 2);

    // Intersection with X-axis (y = 0)
    if (Math.abs(center.y) <= radius) {
      const dx = Math.sqrt(radius * radius - center.y * center.y);
      const x1 = center.x - dx;
      const x2 = center.x + dx;

      for (const interX of [x1, x2]) {
        const dist = Math.sqrt((interX - x) ** 2 + (0 - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: interX,
            y: 0,
            snapType: 'intersection',
            label: 'X轴交点'
          };
        }
      }
    }

    // Intersection with Y-axis (x = 0)
    if (Math.abs(center.x) <= radius) {
      const dy = Math.sqrt(radius * radius - center.x * center.x);
      const y1 = center.y - dy;
      const y2 = center.y + dy;

      for (const interY of [y1, y2]) {
        const dist = Math.sqrt((0 - x) ** 2 + (interY - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: 0,
            y: interY,
            snapType: 'intersection',
            label: 'Y轴交点'
          };
        }
      }
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
  if (!result.snappedTo && result.snapType !== 'intersection') {
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
  if (!result.snappedTo && result.snapType !== 'intersection') {
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

