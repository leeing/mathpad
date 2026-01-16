import { describe, expect, it } from 'vitest';
import { parabolaPointsByFocusDirectrix, parabolaPointsByVertexFocus } from './parabola';

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

describe('parabola', () => {
  it('vertex+focus satisfies focus/directrix property for axis-aligned case', () => {
    const p = 80;
    const vertex = { x: 0, y: 0 };
    const focus = { x: p, y: 0 };
    const pts = parabolaPointsByVertexFocus(vertex, focus, 120, 40);
    expect(pts.length).toBeGreaterThan(0);

    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i];
      const y = pts[i + 1];
      const dFocus = dist({ x, y }, focus);
      const dDirectrix = Math.abs(x + p);
      expect(Math.abs(dFocus - dDirectrix)).toBeLessThan(1e-6);
    }
  });

  it('focus+directrix satisfies focus/directrix property for axis-aligned case', () => {
    const p = 70;
    const focus = { x: p, y: 0 };
    const d1 = { x: -p, y: -100 };
    const d2 = { x: -p, y: 100 };
    const pts = parabolaPointsByFocusDirectrix(focus, d1, d2, 120, 40);
    expect(pts.length).toBeGreaterThan(0);

    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i];
      const y = pts[i + 1];
      const dFocus = dist({ x, y }, focus);
      const dDirectrix = Math.abs(x + p);
      expect(Math.abs(dFocus - dDirectrix)).toBeLessThan(1e-6);
    }
  });

  it('vertex+focus returns empty for degenerate input', () => {
    const pts = parabolaPointsByVertexFocus({ x: 0, y: 0 }, { x: 0, y: 0 }, 100, 20);
    expect(pts.length).toBe(0);
  });

  it('focus+directrix returns empty for degenerate directrix', () => {
    const pts = parabolaPointsByFocusDirectrix({ x: 10, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 100, 20);
    expect(pts.length).toBe(0);
  });

  it('focus+directrix returns empty when focus is on directrix', () => {
    const pts = parabolaPointsByFocusDirectrix({ x: 0, y: 0 }, { x: 0, y: -10 }, { x: 0, y: 10 }, 100, 20);
    expect(pts.length).toBe(0);
  });
});

