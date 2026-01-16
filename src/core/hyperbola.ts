export type HyperbolaOrientation = 'horizontal' | 'vertical';

export type HyperbolaParams = {
  centerX: number;
  centerY: number;
  a: number;
  b: number;
  orientation: HyperbolaOrientation;
};

export function hyperbolaPoints(params: HyperbolaParams, tMax: number, samples: number): { branch1: number[]; branch2: number[] } {
  const { centerX, centerY, a, b, orientation } = params;

  if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(a) || !Number.isFinite(b)) {
    return { branch1: [], branch2: [] };
  }
  if (a <= 0 || b <= 0) {
    return { branch1: [], branch2: [] };
  }
  if (!Number.isFinite(tMax) || tMax <= 0) {
    return { branch1: [], branch2: [] };
  }

  const n = Math.max(16, Math.floor(samples));
  const branch1: number[] = [];
  const branch2: number[] = [];

  for (let i = -n; i <= n; i++) {
    const t = (i / n) * tMax;
    const cosh = Math.cosh(t);
    const sinh = Math.sinh(t);

    if (orientation === 'horizontal') {
      const x = a * cosh;
      const y = b * sinh;
      branch1.push(centerX + x, centerY + y);
      branch2.push(centerX - x, centerY + y);
    } else {
      const x = b * sinh;
      const y = a * cosh;
      branch1.push(centerX + x, centerY + y);
      branch2.push(centerX + x, centerY - y);
    }
  }

  return { branch1, branch2 };
}

export function solveTMaxForViewport(a: number, b: number, xRange: number, yRange: number, orientation: HyperbolaOrientation): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return 0;
  if (!Number.isFinite(xRange) || !Number.isFinite(yRange) || xRange <= 0 || yRange <= 0) return 0;

  const clamp = (v: number) => Math.max(0, v);

  if (orientation === 'horizontal') {
    const tX = clamp(Math.acosh(Math.max(1, xRange / a)));
    const tY = clamp(Math.asinh(yRange / b));
    return Math.min(tX, tY);
  }

  const tX = clamp(Math.asinh(xRange / b));
  const tY = clamp(Math.acosh(Math.max(1, yRange / a)));
  return Math.min(tX, tY);
}

