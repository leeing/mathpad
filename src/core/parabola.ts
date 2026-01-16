export type Vec2 = { x: number; y: number };

export function hypot2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function signedDistancePointToLine(p: Vec2, a: Vec2, b: Vec2): number | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = hypot2(dx, dy);
  if (len < 1e-9) return null;
  const nx = -dy / len;
  const ny = dx / len;
  return (p.x - a.x) * nx + (p.y - a.y) * ny;
}

export function parabolaPointsByVertexFocus(vertex: Vec2, focus: Vec2, tMax: number, samples: number): number[] {
  const dx = focus.x - vertex.x;
  const dy = focus.y - vertex.y;
  const p = hypot2(dx, dy);
  if (p < 1e-6) return [];

  const ux = dx / p;
  const uy = dy / p;
  const vx = -uy;
  const vy = ux;

  const pts: number[] = [];
  const n = Math.max(4, Math.floor(samples));
  for (let i = -n; i <= n; i++) {
    const t = (i / n) * tMax;
    const x0 = (t * t) / (4 * p);
    const px = vertex.x + ux * x0 + vx * t;
    const py = vertex.y + uy * x0 + vy * t;
    pts.push(px, py);
  }
  return pts;
}

export function parabolaPointsByFocusDirectrix(
  focus: Vec2,
  directrixP1: Vec2,
  directrixP2: Vec2,
  tMax: number,
  samples: number
): number[] {
  const dSigned = signedDistancePointToLine(focus, directrixP1, directrixP2);
  if (dSigned === null) return [];
  const d = Math.abs(dSigned);
  if (d < 1e-6) return [];

  const dx = directrixP2.x - directrixP1.x;
  const dy = directrixP2.y - directrixP1.y;
  const len = hypot2(dx, dy);
  if (len < 1e-9) return [];

  const nx = -dy / len;
  const ny = dx / len;
  const sign = Math.sign(dSigned) || 1;
  const ux = nx * sign;
  const uy = ny * sign;
  const vx = -uy;
  const vy = ux;

  const vx0 = focus.x - (d / 2) * ux;
  const vy0 = focus.y - (d / 2) * uy;

  const pts: number[] = [];
  const n = Math.max(4, Math.floor(samples));
  for (let i = -n; i <= n; i++) {
    const t = (i / n) * tMax;
    const x0 = (t * t) / (2 * d);
    const px = vx0 + ux * x0 + vx * t;
    const py = vy0 + uy * x0 + vy * t;
    pts.push(px, py);
  }
  return pts;
}

