import type { GeoElement, PointElement, LineElement, CircleElement, FunctionGraphElement, EllipseElement, ParabolaElement, HyperbolaElement } from '../types/geoElements';
import * as math from 'mathjs';
import { PIXELS_PER_UNIT } from '../constants/grid';

export type SnapType = 'point' | 'midpoint' | 'intersection' | 'on_line' | 'on_circle' | 'on_function' | 'on_ellipse' | 'on_parabola' | 'on_hyperbola' | 'grid';

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

// Calculate point projection onto a line segment (t clamped to [0,1])
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

// Calculate point projection onto an infinite line (t NOT clamped)
function projectPointOnLineUnclamped(
  px: number, py: number,
  p1: { x: number; y: number }, p2: { x: number; y: number }
): { x: number; y: number; t: number; dist: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len2 = dx * dx + dy * dy;

  if (len2 < 1e-10) {
    const dist = Math.sqrt((px - p1.x) ** 2 + (py - p1.y) ** 2);
    return { x: p1.x, y: p1.y, t: 0, dist };
  }

  const t = ((px - p1.x) * dx + (py - p1.y) * dy) / len2;
  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;
  const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);

  return { x: projX, y: projY, t, dist };
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

// Calculate ellipse-line intersections
// Ellipse: ((x-cx)*cos(r) + (y-cy)*sin(r))²/a² + (-(x-cx)*sin(r) + (y-cy)*cos(r))²/b² = 1
// Returns 0, 1, or 2 intersection points
function getEllipseLineIntersections(
  ellipse: { centerX: number; centerY: number; a: number; b: number; rotation: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  constrainToSegment: boolean = true
): { x: number; y: number }[] {
  // Convert to pixel coordinates
  const cx = ellipse.centerX * PIXELS_PER_UNIT;
  const cy = -ellipse.centerY * PIXELS_PER_UNIT;
  const a = ellipse.a * PIXELS_PER_UNIT;
  const b = ellipse.b * PIXELS_PER_UNIT;
  const r = ellipse.rotation;

  const cosR = Math.cos(r);
  const sinR = Math.sin(r);

  // Line parametric form: P = p1 + t*(p2-p1)
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Substitute into ellipse equation
  // Let u = (x-cx)*cosR + (y-cy)*sinR, v = -(x-cx)*sinR + (y-cy)*cosR
  // u²/a² + v²/b² = 1

  const intersections: { x: number; y: number }[] = [];

  // For each t, x = p1.x + t*dx, y = p1.y + t*dy
  // u = (p1.x + t*dx - cx)*cosR + (p1.y + t*dy - cy)*sinR
  // u = (p1.x - cx)*cosR + (p1.y - cy)*sinR + t*(dx*cosR + dy*sinR)
  // u = u0 + t*du

  const u0 = (p1.x - cx) * cosR + (p1.y - cy) * sinR;
  const du = dx * cosR + dy * sinR;
  const v0 = -(p1.x - cx) * sinR + (p1.y - cy) * cosR;
  const dv = -dx * sinR + dy * cosR;

  // (u0 + t*du)²/a² + (v0 + t*dv)²/b² = 1
  // Expand and collect terms in t²:
  // t² * (du²/a² + dv²/b²) + t * 2*(u0*du/a² + v0*dv/b²) + (u0²/a² + v0²/b² - 1) = 0

  const A = (du * du) / (a * a) + (dv * dv) / (b * b);
  const B = 2 * ((u0 * du) / (a * a) + (v0 * dv) / (b * b));
  const C = (u0 * u0) / (a * a) + (v0 * v0) / (b * b) - 1;

  const discriminant = B * B - 4 * A * C;

  if (discriminant < 0 || Math.abs(A) < 1e-10) {
    return [];
  }

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-B - sqrtD) / (2 * A);
  const t2 = (-B + sqrtD) / (2 * A);

  const isValidT = (t: number) => constrainToSegment ? (t >= -0.01 && t <= 1.01) : true;

  if (isValidT(t1)) {
    intersections.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy });
  }
  if (isValidT(t2) && Math.abs(t1 - t2) > 1e-6) {
    intersections.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy });
  }

  return intersections;
}

// Calculate parabola-line intersections (for parabola_by_equation type)
// Returns 0, 1, or 2 intersection points
function getParabolaLineIntersections(
  parabola: { vertexX: number; vertexY: number; p: number; direction: 'up' | 'down' | 'left' | 'right' },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  constrainToSegment: boolean = true
): { x: number; y: number }[] {
  // Convert to pixel coordinates
  const vx = parabola.vertexX * PIXELS_PER_UNIT;
  const vy = -parabola.vertexY * PIXELS_PER_UNIT;
  const pPixels = parabola.p * PIXELS_PER_UNIT;
  const dir = parabola.direction;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const intersections: { x: number; y: number }[] = [];

  // Parabola equations (in pixel coords):
  // up:    y = vy - (x-vx)² / (4*p)
  // down:  y = vy + (x-vx)² / (4*p)
  // right: x = vx + (y-vy)² / (4*p)
  // left:  x = vx - (y-vy)² / (4*p)

  let A: number, B: number, C: number;

  if (dir === 'up' || dir === 'down') {
    // y = vy ± (x-vx)²/(4p)
    // Substitute x = p1.x + t*dx, y = p1.y + t*dy
    // p1.y + t*dy = vy ± (p1.x + t*dx - vx)²/(4p)
    const sign = dir === 'down' ? 1 : -1;
    const k = 1 / (4 * pPixels);

    // (p1.x + t*dx - vx)² = (p1.x - vx + t*dx)² = (x0 + t*dx)²
    // = x0² + 2*x0*t*dx + t²*dx²
    const x0 = p1.x - vx;

    // p1.y + t*dy = vy + sign*k*(x0² + 2*x0*t*dx + t²*dx²)
    // t*dy - sign*k*t²*dx² - sign*k*2*x0*t*dx = vy + sign*k*x0² - p1.y
    // t²*(-sign*k*dx²) + t*(dy - sign*k*2*x0*dx) + (p1.y - vy - sign*k*x0²) = 0

    A = -sign * k * dx * dx;
    B = dy - sign * k * 2 * x0 * dx;
    C = p1.y - vy - sign * k * x0 * x0;
  } else {
    // x = vx ± (y-vy)²/(4p)
    const sign = dir === 'right' ? 1 : -1;
    const k = 1 / (4 * pPixels);

    const y0 = p1.y - vy;

    A = -sign * k * dy * dy;
    B = dx - sign * k * 2 * y0 * dy;
    C = p1.x - vx - sign * k * y0 * y0;
  }

  if (Math.abs(A) < 1e-10) {
    // Linear case
    if (Math.abs(B) > 1e-10) {
      const t = -C / B;
      const isValidT = (t: number) => constrainToSegment ? (t >= -0.01 && t <= 1.01) : true;
      if (isValidT(t)) {
        intersections.push({ x: p1.x + t * dx, y: p1.y + t * dy });
      }
    }
    return intersections;
  }

  const discriminant = B * B - 4 * A * C;
  if (discriminant < 0) return [];

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-B - sqrtD) / (2 * A);
  const t2 = (-B + sqrtD) / (2 * A);

  const isValidT = (t: number) => constrainToSegment ? (t >= -0.01 && t <= 1.01) : true;

  if (isValidT(t1)) {
    intersections.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy });
  }
  if (isValidT(t2) && Math.abs(t1 - t2) > 1e-6) {
    intersections.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy });
  }

  return intersections;
}

// Calculate hyperbola-line intersections
// Returns 0, 1, or 2 intersection points
function getHyperbolaLineIntersections(
  hyperbola: { centerX: number; centerY: number; a: number; b: number; orientation: 'horizontal' | 'vertical' },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  constrainToSegment: boolean = true
): { x: number; y: number }[] {
  // Convert to pixel coordinates
  const cx = hyperbola.centerX * PIXELS_PER_UNIT;
  const cy = -hyperbola.centerY * PIXELS_PER_UNIT;
  const a = hyperbola.a * PIXELS_PER_UNIT;
  const b = hyperbola.b * PIXELS_PER_UNIT;
  const isHorizontal = hyperbola.orientation === 'horizontal';

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Hyperbola equations (in pixel coords, note y is inverted):
  // Horizontal: (x-cx)²/a² - (y-cy)²/b² = 1
  // Vertical:   (y-cy)²/a² - (x-cx)²/b² = 1

  // Line: x = p1.x + t*dx, y = p1.y + t*dy
  // Let x0 = p1.x - cx, y0 = p1.y - cy

  const x0 = p1.x - cx;
  const y0 = p1.y - cy;

  let A: number, B: number, C: number;

  if (isHorizontal) {
    // (x0 + t*dx)²/a² - (y0 + t*dy)²/b² = 1
    // t²*(dx²/a² - dy²/b²) + t*2*(x0*dx/a² - y0*dy/b²) + (x0²/a² - y0²/b² - 1) = 0
    A = (dx * dx) / (a * a) - (dy * dy) / (b * b);
    B = 2 * ((x0 * dx) / (a * a) - (y0 * dy) / (b * b));
    C = (x0 * x0) / (a * a) - (y0 * y0) / (b * b) - 1;
  } else {
    // (y0 + t*dy)²/a² - (x0 + t*dx)²/b² = 1
    A = (dy * dy) / (a * a) - (dx * dx) / (b * b);
    B = 2 * ((y0 * dy) / (a * a) - (x0 * dx) / (b * b));
    C = (y0 * y0) / (a * a) - (x0 * x0) / (b * b) - 1;
  }

  const intersections: { x: number; y: number }[] = [];

  if (Math.abs(A) < 1e-10) {
    // Linear case (line parallel to asymptote)
    if (Math.abs(B) > 1e-10) {
      const t = -C / B;
      const isValidT = (t: number) => constrainToSegment ? (t >= -0.01 && t <= 1.01) : true;
      if (isValidT(t)) {
        intersections.push({ x: p1.x + t * dx, y: p1.y + t * dy });
      }
    }
    return intersections;
  }

  const discriminant = B * B - 4 * A * C;
  if (discriminant < 0) return [];

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-B - sqrtD) / (2 * A);
  const t2 = (-B + sqrtD) / (2 * A);

  const isValidT = (t: number) => constrainToSegment ? (t >= -0.01 && t <= 1.01) : true;

  if (isValidT(t1)) {
    intersections.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy });
  }
  if (isValidT(t2) && Math.abs(t1 - t2) > 1e-6) {
    intersections.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy });
  }

  return intersections;
}

// Calculate function-line intersections using sampling + bisection
// Returns intersection points where the function y=f(x) crosses the line segment
function getFunctionLineIntersections(
  expression: string,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  constrainToSegment: boolean = true
): { x: number; y: number }[] {
  const SAMPLE_COUNT = 30;
  const BISECTION_ITERATIONS = 10;

  try {
    const compiled = math.compile(expression);
    const intersections: { x: number; y: number }[] = [];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lineLen = Math.sqrt(dx * dx + dy * dy);
    if (lineLen < 1e-6) return [];

    // Function to evaluate g(t) = f(x(t)) - y(t)
    // where (x(t), y(t)) is the point on line at parameter t
    const evalG = (t: number): number | null => {
      const xPixel = p1.x + t * dx;
      const yPixel = p1.y + t * dy;

      // Convert to math coordinates
      const xMath = xPixel / PIXELS_PER_UNIT;
      try {
        const yMath = compiled.evaluate({ x: xMath });
        if (typeof yMath !== 'number' || !isFinite(yMath)) return null;

        // Convert function result to pixels and compare with line y
        const yFuncPixel = -yMath * PIXELS_PER_UNIT;
        return yFuncPixel - yPixel;
      } catch {
        return null;
      }
    };

    // Sample along the line and detect sign changes
    const samples: { t: number; g: number | null }[] = [];
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const t = i / SAMPLE_COUNT;
      samples.push({ t, g: evalG(t) });
    }

    // Find sign changes and use bisection to refine
    for (let i = 0; i < samples.length - 1; i++) {
      const s1 = samples[i];
      const s2 = samples[i + 1];

      if (s1.g === null || s2.g === null) continue;

      // Check for sign change (or zero crossing)
      if (s1.g * s2.g <= 0) {
        // Bisection to find precise intersection
        let tLow = s1.t;
        let tHigh = s2.t;
        let gLow = s1.g;
        void s2.g;  // gHigh not needed, we use gLow for sign comparison

        for (let iter = 0; iter < BISECTION_ITERATIONS; iter++) {
          const tMid = (tLow + tHigh) / 2;
          const gMid = evalG(tMid);

          if (gMid === null) break;

          if (Math.abs(gMid) < 0.5) {
            // Close enough, use this point
            tLow = tMid;
            break;
          }

          if (gLow * gMid <= 0) {
            tHigh = tMid;
          } else {
            tLow = tMid;
            gLow = gMid;
          }
        }

        const tFinal = (tLow + tHigh) / 2;

        // Check constraint
        const isValidT = constrainToSegment ? (tFinal >= -0.01 && tFinal <= 1.01) : true;
        if (isValidT) {
          intersections.push({
            x: p1.x + tFinal * dx,
            y: p1.y + tFinal * dy
          });
        }
      }
    }

    return intersections;
  } catch {
    return [];
  }
}

// Find function zeros (intersections with X-axis) in a given range
function getFunctionXAxisIntersections(
  expression: string,
  xPixelMin: number,
  xPixelMax: number
): { x: number; y: number }[] {
  const SAMPLE_COUNT = 40;
  const BISECTION_ITERATIONS = 12;

  try {
    const compiled = math.compile(expression);
    const intersections: { x: number; y: number }[] = [];

    // Sample and find sign changes in f(x)
    const samples: { xPixel: number; yPixel: number | null }[] = [];
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const xPixel = xPixelMin + (xPixelMax - xPixelMin) * i / SAMPLE_COUNT;
      const xMath = xPixel / PIXELS_PER_UNIT;
      try {
        const yMath = compiled.evaluate({ x: xMath });
        if (typeof yMath === 'number' && isFinite(yMath)) {
          samples.push({ xPixel, yPixel: -yMath * PIXELS_PER_UNIT });
        } else {
          samples.push({ xPixel, yPixel: null });
        }
      } catch {
        samples.push({ xPixel, yPixel: null });
      }
    }

    // Find sign changes in yPixel (zeros of f(x))
    for (let i = 0; i < samples.length - 1; i++) {
      const s1 = samples[i];
      const s2 = samples[i + 1];

      if (s1.yPixel === null || s2.yPixel === null) continue;

      // yPixel is -f(x)*PIXELS, so zero crossing is when yPixel changes sign
      if (s1.yPixel * s2.yPixel <= 0) {
        // Bisection
        let xLow = s1.xPixel;
        let xHigh = s2.xPixel;

        for (let iter = 0; iter < BISECTION_ITERATIONS; iter++) {
          const xMid = (xLow + xHigh) / 2;
          const xMath = xMid / PIXELS_PER_UNIT;
          try {
            const yMath = compiled.evaluate({ x: xMath });
            if (typeof yMath !== 'number' || !isFinite(yMath)) break;

            const yLowMath = compiled.evaluate({ x: xLow / PIXELS_PER_UNIT });
            if (yMath * yLowMath <= 0) {
              xHigh = xMid;
            } else {
              xLow = xMid;
            }
          } catch {
            break;
          }
        }

        intersections.push({ x: (xLow + xHigh) / 2, y: 0 });
      }
    }

    return intersections;
  } catch {
    return [];
  }
}

// Find function Y-axis intersection (f(0))
function getFunctionYAxisIntersection(expression: string): { x: number; y: number } | null {
  try {
    const compiled = math.compile(expression);
    const yMath = compiled.evaluate({ x: 0 });
    if (typeof yMath === 'number' && isFinite(yMath)) {
      return { x: 0, y: -yMath * PIXELS_PER_UNIT };
    }
  } catch {
    // Function may not be defined at x=0
  }
  return null;
}


// Uses 20 points sampling for performance/accuracy balance
function findNearestPointOnFunction(
  expression: string,
  mouseX: number,  // in pixel coordinates
  mouseY: number,  // in pixel coordinates
  searchRadius: number = 50  // pixels to search around mouseX
): { x: number; y: number; dist: number } | null {
  const SAMPLE_COUNT = 20;

  try {
    const compiled = math.compile(expression);

    let bestPoint: { x: number; y: number; dist: number } | null = null;

    // Sample points around mouseX
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const xPixel = mouseX - searchRadius + (2 * searchRadius * i) / (SAMPLE_COUNT - 1);

      try {
        // Convert pixel X to math unit X
        const xMath = xPixel / PIXELS_PER_UNIT;
        const scope = { x: xMath };
        const yMath = compiled.evaluate(scope);

        if (typeof yMath === 'number' && isFinite(yMath)) {
          // Convert math Y to pixel Y (inverted because screen Y is down)
          const yPixel = -yMath * PIXELS_PER_UNIT;

          // Calculate distance to mouse
          const dist = Math.sqrt((xPixel - mouseX) ** 2 + (yPixel - mouseY) ** 2);

          if (!bestPoint || dist < bestPoint.dist) {
            bestPoint = { x: xPixel, y: yPixel, dist };
          }
        }
      } catch {
        // Ignore evaluation errors for specific x values
      }
    }

    return bestPoint;
  } catch {
    // Invalid expression
    return null;
  }
}

// Find the nearest point on an ellipse using parametric sampling
// Ellipse: x = cx + a*cos(θ)*cos(r) - b*sin(θ)*sin(r)
//          y = cy + a*cos(θ)*sin(r) + b*sin(θ)*cos(r)
function findNearestPointOnEllipse(
  ellipse: EllipseElement,
  mouseX: number,  // in pixel coordinates
  mouseY: number   // in pixel coordinates
): { x: number; y: number; dist: number } {
  const SAMPLE_COUNT = 36; // Sample every 10 degrees
  const { centerX, centerY, a, b, rotation } = ellipse;

  // Convert from math coordinates to pixel coordinates
  // Ellipse stores: centerX/Y in math units, a/b in math units
  const cxPixel = centerX * PIXELS_PER_UNIT;
  const cyPixel = -centerY * PIXELS_PER_UNIT;  // Flip Y for canvas
  const aPixel = a * PIXELS_PER_UNIT;
  const bPixel = b * PIXELS_PER_UNIT;

  let bestPoint = { x: cxPixel + aPixel, y: cyPixel, dist: Infinity };

  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const theta = (2 * Math.PI * i) / SAMPLE_COUNT;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Parametric ellipse with rotation (in pixel coordinates)
    const xPixel = cxPixel + aPixel * cosT * cosR - bPixel * sinT * sinR;
    const yPixel = cyPixel + aPixel * cosT * sinR + bPixel * sinT * cosR;

    const dist = Math.sqrt((xPixel - mouseX) ** 2 + (yPixel - mouseY) ** 2);

    if (dist < bestPoint.dist) {
      bestPoint = { x: xPixel, y: yPixel, dist };
    }
  }

  return bestPoint;
}

// Find the nearest point on a parabola using sampling
// Handles all definition types: equation, general, vertex-focus, focus-directrix
function findNearestPointOnParabola(
  parabola: ParabolaElement,
  mouseX: number,  // in pixel coordinates
  mouseY: number,  // in pixel coordinates
  searchRadius: number = 100,
  getElement?: (id: string) => GeoElement | undefined
): { x: number; y: number; dist: number } | null {
  const SAMPLE_COUNT = 40;  // Balanced for performance
  const def = parabola.definition;

  let bestPoint: { x: number; y: number; dist: number } | null = null;

  // Helper function to find nearest point from a list of pixel coordinates
  const findNearestFromPoints = (pts: number[]): { x: number; y: number; dist: number } | null => {
    let best: { x: number; y: number; dist: number } | null = null;
    for (let i = 0; i < pts.length; i += 2) {
      const xPixel = pts[i];
      const yPixel = pts[i + 1];
      const dist = Math.sqrt((xPixel - mouseX) ** 2 + (yPixel - mouseY) ** 2);
      if (!best || dist < best.dist) {
        best = { x: xPixel, y: yPixel, dist };
      }
    }
    return best;
  };

  if (def.type === 'parabola_by_equation') {
    // Standard form with vertex, p, direction
    const { p, direction } = def;
    const vxPixel = (parabola.vertexX || 0) * PIXELS_PER_UNIT;
    const vyPixel = -(parabola.vertexY || 0) * PIXELS_PER_UNIT;
    const pPixels = p * PIXELS_PER_UNIT;

    const pts: number[] = [];
    // Use larger search range
    const largeRadius = searchRadius * 5;
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const t = -largeRadius + (2 * largeRadius * i) / (SAMPLE_COUNT - 1);
      let xPixel: number, yPixel: number;

      switch (direction) {
        case 'up':
          xPixel = vxPixel + t;
          yPixel = vyPixel - (t * t) / (4 * pPixels);
          break;
        case 'down':
          xPixel = vxPixel + t;
          yPixel = vyPixel + (t * t) / (4 * pPixels);
          break;
        case 'right':
          yPixel = vyPixel + t;
          xPixel = vxPixel + (t * t) / (4 * pPixels);
          break;
        case 'left':
          yPixel = vyPixel + t;
          xPixel = vxPixel - (t * t) / (4 * pPixels);
          break;
      }
      pts.push(xPixel, yPixel);
    }
    bestPoint = findNearestFromPoints(pts);

  } else if (def.type === 'parabola_general') {
    // General form: y = ax^2 + bx + c or x = ay^2 + by + c
    const { a, b, c, axis } = def;
    const isYAxis = axis === 'y';

    // Pre-compute constants to avoid repeated divisions
    const invPixelUnit = 1 / PIXELS_PER_UNIT;
    // Use higher sample count for general parabolas to ensure accuracy
    const localSampleCount = 80;
    const largeRadius = searchRadius * 5;
    const tStep = (2 * largeRadius) / (localSampleCount - 1);
    const tStart = (isYAxis ? mouseX : mouseY) - largeRadius;

    const pts: number[] = [];
    for (let i = 0; i < localSampleCount; i++) {
      const t = tStart + tStep * i;
      let xPixel: number, yPixel: number;

      if (isYAxis) {
        const xMath = t * invPixelUnit;
        const yMath = a * xMath * xMath + b * xMath + c;
        xPixel = t;
        yPixel = -yMath * PIXELS_PER_UNIT;
      } else {
        const yMath = -t * invPixelUnit;
        const xMath = a * yMath * yMath + b * yMath + c;
        xPixel = xMath * PIXELS_PER_UNIT;
        yPixel = t;
      }

      if (isFinite(xPixel) && isFinite(yPixel)) {
        pts.push(xPixel, yPixel);
      }
    }
    bestPoint = findNearestFromPoints(pts);

  } else if (def.type === 'parabola_by_vertex_focus' && getElement) {
    // Geometric definition with vertex and focus points
    const vertex = getElement(def.vertex) as PointElement | undefined;
    const focus = getElement(def.focus) as PointElement | undefined;

    if (vertex && focus) {
      // Calculate parabola using the same logic as parabolaPointsByVertexFocus
      const dx = focus.x - vertex.x;
      const dy = focus.y - vertex.y;
      const pDist = Math.sqrt(dx * dx + dy * dy);
      if (pDist >= 1e-6) {
        const ux = dx / pDist;
        const uy = dy / pDist;
        const vx = -uy;
        const vy = ux;

        const pts: number[] = [];
        // Use much larger search range for geometric parabolas
        const largeRadius = 500;  // 500 pixels coverage
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const t = -largeRadius + (2 * largeRadius * i) / (SAMPLE_COUNT - 1);
          const x0 = (t * t) / (4 * pDist);
          // These are in pixel coordinates (vertex.x/y are already in pixels)
          const px = vertex.x + ux * x0 + vx * t;
          const py = vertex.y + uy * x0 + vy * t;
          pts.push(px, py);
        }
        bestPoint = findNearestFromPoints(pts);
      }
    }
  } else if (def.type === 'parabola_by_focus_directrix' && getElement) {
    // Geometric definition with focus and directrix line
    const focus = getElement(def.focus) as PointElement | undefined;
    const directrix = getElement(def.directrix) as LineElement | undefined;

    if (focus && directrix) {
      const p1 = getElement(directrix.p1) as PointElement | undefined;
      const p2 = getElement(directrix.p2) as PointElement | undefined;

      if (p1 && p2) {
        // Calculate signed distance from focus to directrix
        const ldx = p2.x - p1.x;
        const ldy = p2.y - p1.y;
        const len = Math.sqrt(ldx * ldx + ldy * ldy);
        if (len >= 1e-9) {
          const nx = -ldy / len;
          const ny = ldx / len;
          const dSigned = (focus.x - p1.x) * nx + (focus.y - p1.y) * ny;
          const d = Math.abs(dSigned);

          if (d >= 1e-6) {
            const sign = Math.sign(dSigned) || 1;
            const ux = nx * sign;
            const uy = ny * sign;
            const vx = -uy;
            const vy = ux;

            const vx0 = focus.x - (d / 2) * ux;
            const vy0 = focus.y - (d / 2) * uy;

            const pts: number[] = [];
            // Use much larger search range for geometric parabolas
            const largeRadius = 500;  // 500 pixels coverage
            for (let i = 0; i < SAMPLE_COUNT; i++) {
              const t = -largeRadius + (2 * largeRadius * i) / (SAMPLE_COUNT - 1);
              const x0 = (t * t) / (2 * d);
              const px = vx0 + ux * x0 + vx * t;
              const py = vy0 + uy * x0 + vy * t;
              pts.push(px, py);
            }
            bestPoint = findNearestFromPoints(pts);
          }
        }
      }
    }
  }

  return bestPoint;
}

// Find the nearest point on a hyperbola using sampling
// Hyperbola: x^2/a^2 - y^2/b^2 = 1 (horizontal) or y^2/a^2 - x^2/b^2 = 1 (vertical)
function findNearestPointOnHyperbola(
  hyperbola: HyperbolaElement,
  mouseX: number,  // in pixel coordinates
  mouseY: number   // in pixel coordinates
): { x: number; y: number; dist: number } | null {
  const SAMPLE_COUNT = 40;
  const { centerX, centerY, a, b, orientation } = hyperbola;

  // Convert from math coordinates to pixel coordinates
  const cxPixel = centerX * PIXELS_PER_UNIT;
  const cyPixel = -centerY * PIXELS_PER_UNIT;  // Flip Y for canvas
  const aPixel = a * PIXELS_PER_UNIT;
  const bPixel = b * PIXELS_PER_UNIT;

  let bestPoint: { x: number; y: number; dist: number } | null = null;

  // Sample using parametric form with hyperbolic functions
  // For horizontal: x = cx + a*cosh(t), y = cy + b*sinh(t)
  // For vertical: x = cx + b*sinh(t), y = cy + a*cosh(t)

  // Map search radius to parameter range
  const tRange = 3; // cosh(3) ≈ 10, giving good coverage

  // Sample both branches
  for (const branch of [-1, 1]) {
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const t = -tRange + (2 * tRange * i) / (SAMPLE_COUNT - 1);

      const coshT = Math.cosh(t);
      const sinhT = Math.sinh(t);

      let xPixel: number, yPixel: number;

      if (orientation === 'horizontal') {
        // x = cx + branch * a * cosh(t), y = cy - b * sinh(t) (Y inverted in pixel coords)
        xPixel = cxPixel + branch * aPixel * coshT;
        yPixel = cyPixel - bPixel * sinhT;  // Note: subtract because Y is flipped
      } else {
        // x = cx + b * sinh(t), y = cy - branch * a * cosh(t)
        xPixel = cxPixel + bPixel * sinhT;
        yPixel = cyPixel - branch * aPixel * coshT;  // Note: subtract because Y is flipped
      }

      const dist = Math.sqrt((xPixel - mouseX) ** 2 + (yPixel - mouseY) ** 2);
      if (!bestPoint || dist < bestPoint.dist) {
        bestPoint = { x: xPixel, y: yPixel, dist };
      }
    }
  }

  return bestPoint;
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

  // Priority 1.65: Ellipse-Line intersections
  const ellipses = Object.values(elements).filter(
    el => el.type === 'ellipse' && el.visible
  ) as EllipseElement[];

  for (const ellipse of ellipses) {
    if (excludeIds.includes(ellipse.id)) continue;

    for (const line of lines) {
      if (excludeIds.includes(line.id)) continue;

      const p1 = getter(line.p1) as PointElement | undefined;
      const p2 = getter(line.p2) as PointElement | undefined;
      if (!p1 || !p2) continue;

      const constrainToSegment = line.subtype === 'segment';
      const intersections = getEllipseLineIntersections(ellipse, p1, p2, constrainToSegment);

      for (const inter of intersections) {
        const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: inter.x,
            y: inter.y,
            snapType: 'intersection',
            label: '交点',
            intersectionElements: [ellipse.id, line.id]
          };
        }
      }
    }

    // Ellipse-Axis intersections
    const xAxisIntersections = getEllipseLineIntersections(ellipse, { x: -10000, y: 0 }, { x: 10000, y: 0 }, false);
    for (const inter of xAxisIntersections) {
      const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        result = { x: inter.x, y: inter.y, snapType: 'intersection', label: 'X轴交点' };
      }
    }
    const yAxisIntersections = getEllipseLineIntersections(ellipse, { x: 0, y: -10000 }, { x: 0, y: 10000 }, false);
    for (const inter of yAxisIntersections) {
      const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        result = { x: inter.x, y: inter.y, snapType: 'intersection', label: 'Y轴交点' };
      }
    }
  }

  // Priority 1.66: Parabola-Line intersections (only for parabola_by_equation)
  const parabolasForInt = Object.values(elements).filter(
    el => el.type === 'parabola' && el.visible
  ) as ParabolaElement[];

  for (const parabola of parabolasForInt) {
    if (excludeIds.includes(parabola.id)) continue;

    const def = parabola.definition;
    if (def.type !== 'parabola_by_equation') continue;

    const parabolaParams = {
      vertexX: parabola.vertexX || 0,
      vertexY: parabola.vertexY || 0,
      p: def.p,
      direction: def.direction
    };

    for (const line of lines) {
      if (excludeIds.includes(line.id)) continue;

      const p1 = getter(line.p1) as PointElement | undefined;
      const p2 = getter(line.p2) as PointElement | undefined;
      if (!p1 || !p2) continue;

      const constrainToSegment = line.subtype === 'segment';
      const intersections = getParabolaLineIntersections(parabolaParams, p1, p2, constrainToSegment);

      for (const inter of intersections) {
        const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: inter.x,
            y: inter.y,
            snapType: 'intersection',
            label: '交点',
            intersectionElements: [parabola.id, line.id]
          };
        }
      }
    }

    // Parabola-Axis intersections
    const xAxisInt = getParabolaLineIntersections(parabolaParams, { x: -10000, y: 0 }, { x: 10000, y: 0 }, false);
    for (const inter of xAxisInt) {
      const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        result = { x: inter.x, y: inter.y, snapType: 'intersection', label: 'X轴交点' };
      }
    }
    const yAxisInt = getParabolaLineIntersections(parabolaParams, { x: 0, y: -10000 }, { x: 0, y: 10000 }, false);
    for (const inter of yAxisInt) {
      const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        result = { x: inter.x, y: inter.y, snapType: 'intersection', label: 'Y轴交点' };
      }
    }
  }

  // Priority 1.67: Hyperbola-Line intersections
  const hyperbolasForInt = Object.values(elements).filter(
    el => el.type === 'hyperbola' && el.visible
  ) as HyperbolaElement[];

  for (const hyperbola of hyperbolasForInt) {
    if (excludeIds.includes(hyperbola.id)) continue;

    for (const line of lines) {
      if (excludeIds.includes(line.id)) continue;

      const p1 = getter(line.p1) as PointElement | undefined;
      const p2 = getter(line.p2) as PointElement | undefined;
      if (!p1 || !p2) continue;

      const constrainToSegment = line.subtype === 'segment';
      const intersections = getHyperbolaLineIntersections(hyperbola, p1, p2, constrainToSegment);

      for (const inter of intersections) {
        const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: inter.x,
            y: inter.y,
            snapType: 'intersection',
            label: '交点',
            intersectionElements: [hyperbola.id, line.id]
          };
        }
      }
    }

    // Hyperbola-Axis intersections
    const xAxisInt = getHyperbolaLineIntersections(hyperbola, { x: -10000, y: 0 }, { x: 10000, y: 0 }, false);
    for (const inter of xAxisInt) {
      const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        result = { x: inter.x, y: inter.y, snapType: 'intersection', label: 'X轴交点' };
      }
    }
    const yAxisInt = getHyperbolaLineIntersections(hyperbola, { x: 0, y: -10000 }, { x: 0, y: 10000 }, false);
    for (const inter of yAxisInt) {
      const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        result = { x: inter.x, y: inter.y, snapType: 'intersection', label: 'Y轴交点' };
      }
    }
  }

  // Priority 1.68: Function-Line intersections
  const funcGraphs = Object.values(elements).filter(
    el => el.type === 'function_graph' && el.visible
  ) as FunctionGraphElement[];

  for (const func of funcGraphs) {
    if (excludeIds.includes(func.id)) continue;

    for (const line of lines) {
      if (excludeIds.includes(line.id)) continue;

      const p1 = getter(line.p1) as PointElement | undefined;
      const p2 = getter(line.p2) as PointElement | undefined;
      if (!p1 || !p2) continue;

      const constrainToSegment = line.subtype === 'segment';
      const intersections = getFunctionLineIntersections(func.expression, p1, p2, constrainToSegment);

      for (const inter of intersections) {
        const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          result = {
            x: inter.x,
            y: inter.y,
            snapType: 'intersection',
            label: '交点',
            intersectionElements: [func.id, line.id]
          };
        }
      }
    }

    // Function-Axis intersections
    // X-axis: find zeros of f(x) in visible range
    const xAxisIntersections = getFunctionXAxisIntersections(func.expression, -1000, 1000);
    for (const inter of xAxisIntersections) {
      const dist = Math.sqrt((inter.x - x) ** 2 + (inter.y - y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        result = { x: inter.x, y: inter.y, snapType: 'intersection', label: 'X轴交点' };
      }
    }

    // Y-axis: f(0)
    const yAxisInter = getFunctionYAxisIntersection(func.expression);
    if (yAxisInter) {
      const dist = Math.sqrt((yAxisInter.x - x) ** 2 + (yAxisInter.y - y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        result = { x: yAxisInter.x, y: yAxisInter.y, snapType: 'intersection', label: 'Y轴交点' };
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
        const isSegment = line.subtype === 'segment';

        if (isSegment) {
          // For segments: use clamped projection
          const proj = projectPointOnLine(x, y, p1, p2);
          const dist = Math.sqrt((proj.x - x) ** 2 + (proj.y - y) ** 2);

          // Only snap within the segment (t between 0.01 and 0.99, excluding endpoints)
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
        } else {
          // For infinite lines: use unclamped projection
          const proj = projectPointOnLineUnclamped(x, y, p1, p2);

          // Snap anywhere along the infinite line
          if (proj.dist < closestDist) {
            closestDist = proj.dist;
            result = {
              x: proj.x,
              y: proj.y,
              snappedTo: line.id,
              snapType: 'on_line',
              label: '直线上'
            };
          }
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

  // Priority 4.5: Points on function graphs (slightly lower than circles)
  if (!result.snappedTo && result.snapType !== 'intersection') {
    const functionGraphs = Object.values(elements).filter(
      el => el.type === 'function_graph' && el.visible
    ) as FunctionGraphElement[];

    for (const funcGraph of functionGraphs) {
      if (excludeIds.includes(funcGraph.id)) continue;

      const nearestPoint = findNearestPointOnFunction(funcGraph.expression, x, y, threshold * 5);

      if (nearestPoint && nearestPoint.dist < closestDist) {
        closestDist = nearestPoint.dist;
        result = {
          x: nearestPoint.x,
          y: nearestPoint.y,
          snappedTo: funcGraph.id,
          snapType: 'on_function',
          label: '函数上'
        };
      }
    }
  }

  // Priority 4.6: Points on ellipses
  if (!result.snappedTo && result.snapType !== 'intersection') {
    const ellipses = Object.values(elements).filter(
      el => el.type === 'ellipse' && el.visible
    ) as EllipseElement[];

    for (const ellipse of ellipses) {
      if (excludeIds.includes(ellipse.id)) continue;

      const nearestPoint = findNearestPointOnEllipse(ellipse, x, y);

      if (nearestPoint.dist < closestDist) {
        closestDist = nearestPoint.dist;
        result = {
          x: nearestPoint.x,
          y: nearestPoint.y,
          snappedTo: ellipse.id,
          snapType: 'on_ellipse',
          label: '椭圆上'
        };
      }
    }
  }

  // Priority 4.7: Points on parabolas
  if (!result.snappedTo && result.snapType !== 'intersection') {
    const parabolas = Object.values(elements).filter(
      el => el.type === 'parabola' && el.visible
    ) as ParabolaElement[];

    for (const parabola of parabolas) {
      if (excludeIds.includes(parabola.id)) continue;

      const nearestPoint = findNearestPointOnParabola(parabola, x, y, threshold * 5, getter);

      if (nearestPoint && nearestPoint.dist < closestDist) {
        closestDist = nearestPoint.dist;
        result = {
          x: nearestPoint.x,
          y: nearestPoint.y,
          snappedTo: parabola.id,
          snapType: 'on_parabola',
          label: '抛物线上'
        };
      }
    }
  }

  // Priority 4.8: Points on hyperbolas
  if (!result.snappedTo && result.snapType !== 'intersection') {
    const hyperbolas = Object.values(elements).filter(
      el => el.type === 'hyperbola' && el.visible
    ) as HyperbolaElement[];

    for (const hyperbola of hyperbolas) {
      if (excludeIds.includes(hyperbola.id)) continue;

      const nearestPoint = findNearestPointOnHyperbola(hyperbola, x, y);

      if (nearestPoint && nearestPoint.dist < closestDist) {
        closestDist = nearestPoint.dist;
        result = {
          x: nearestPoint.x,
          y: nearestPoint.y,
          snappedTo: hyperbola.id,
          snapType: 'on_hyperbola',
          label: '双曲线上'
        };
      }
    }
  }

  return result;
}

