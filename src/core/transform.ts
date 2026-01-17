import { PIXELS_PER_UNIT } from '../constants/grid';

export type Vec2 = { x: number; y: number };

export function toMathFromPixels(p: Vec2): Vec2 {
  return { x: p.x / PIXELS_PER_UNIT, y: -p.y / PIXELS_PER_UNIT };
}

export function toPixelsFromMath(p: Vec2): Vec2 {
  return { x: p.x * PIXELS_PER_UNIT, y: -p.y * PIXELS_PER_UNIT };
}

export function rotateAround(p: Vec2, center: Vec2, rad: number): Vec2 {
  const x = p.x - center.x;
  const y = p.y - center.y;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: center.x + x * c - y * s, y: center.y + x * s + y * c };
}

export function scaleAround(p: Vec2, center: Vec2, k: number): Vec2 {
  return { x: center.x + (p.x - center.x) * k, y: center.y + (p.y - center.y) * k };
}

export function translate(p: Vec2, d: Vec2): Vec2 {
  return { x: p.x + d.x, y: p.y + d.y };
}

export function reflectAcrossLine(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) return p;

  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return { x: 2 * proj.x - p.x, y: 2 * proj.y - p.y };
}

