import { describe, expect, it } from 'vitest';
import { hyperbolaPoints, solveTMaxForViewport } from './hyperbola';

describe('hyperbola', () => {
  it('solveTMaxForViewport returns positive value for valid ranges', () => {
    const t = solveTMaxForViewport(3, 2, 50, 50, 'horizontal');
    expect(t).toBeGreaterThan(0);
  });

  it('horizontal hyperbola points satisfy x^2/a^2 - y^2/b^2 = 1', () => {
    const a = 3;
    const b = 2;
    const tMax = 1.3;
    const { branch1, branch2 } = hyperbolaPoints({ centerX: 0, centerY: 0, a, b, orientation: 'horizontal' }, tMax, 80);
    expect(branch1.length).toBeGreaterThan(0);
    expect(branch2.length).toBeGreaterThan(0);

    const check = (pts: number[]) => {
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i];
        const y = pts[i + 1];
        const v = (x * x) / (a * a) - (y * y) / (b * b);
        expect(Math.abs(v - 1)).toBeLessThan(1e-10);
      }
    };

    check(branch1);
    check(branch2);
  });

  it('vertical hyperbola points satisfy y^2/a^2 - x^2/b^2 = 1', () => {
    const a = 4;
    const b = 1.5;
    const tMax = 1.2;
    const { branch1, branch2 } = hyperbolaPoints({ centerX: 0, centerY: 0, a, b, orientation: 'vertical' }, tMax, 80);
    expect(branch1.length).toBeGreaterThan(0);
    expect(branch2.length).toBeGreaterThan(0);

    const check = (pts: number[]) => {
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i];
        const y = pts[i + 1];
        const v = (y * y) / (a * a) - (x * x) / (b * b);
        expect(Math.abs(v - 1)).toBeLessThan(1e-10);
      }
    };

    check(branch1);
    check(branch2);
  });

  it('returns empty branches for invalid params', () => {
    const { branch1, branch2 } = hyperbolaPoints({ centerX: 0, centerY: 0, a: 0, b: 2, orientation: 'horizontal' }, 1, 20);
    expect(branch1.length).toBe(0);
    expect(branch2.length).toBe(0);
  });
});

