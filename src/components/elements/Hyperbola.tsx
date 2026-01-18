import React, { useMemo } from 'react';
import { Line } from 'react-konva';
import type { HyperbolaElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useToolStore } from '../../store/toolStore';
import { PIXELS_PER_UNIT } from '../../constants/grid';
import { hyperbolaPoints, solveTMaxForViewport } from '../../core/hyperbola';

interface HyperbolaProps {
  element: HyperbolaElement;
}

export const Hyperbola: React.FC<HyperbolaProps> = ({ element }) => {
  const { scale, size } = useViewStore();
  const examMode = useViewStore((state) => state.examMode);
  const showHiddenElements = useViewStore((state) => state.showHiddenElements);
  const selectedId = useToolStore((state) => state.selectedId);

  // Handle visibility
  if (!element.visible && !showHiddenElements) return null;

  const { branch1, branch2 } = useMemo(() => {
    const xRange = (size.width / 2) / PIXELS_PER_UNIT;
    const yRange = (size.height / 2) / PIXELS_PER_UNIT;
    const tMax = solveTMaxForViewport(element.a, element.b, xRange * 1.3, yRange * 1.3, element.orientation);

    const { branch1, branch2 } = hyperbolaPoints(
      {
        centerX: element.centerX,
        centerY: element.centerY,
        a: element.a,
        b: element.b,
        orientation: element.orientation,
      },
      Math.max(0.1, tMax),
      140
    );

    const toPixels = (pts: number[]) => {
      const out: number[] = [];
      for (let i = 0; i < pts.length; i += 2) {
        out.push(pts[i] * PIXELS_PER_UNIT, -pts[i + 1] * PIXELS_PER_UNIT);
      }
      return out;
    };

    return { branch1: toPixels(branch1), branch2: toPixels(branch2) };
  }, [element.a, element.b, element.centerX, element.centerY, element.orientation, size.height, size.width]);

  if (branch1.length === 0 && branch2.length === 0) return null;

  const darkTheme = useViewStore.getState().darkTheme;
  const isSelected = selectedId === element.id;
  // In dark mode, skip examMode colors to keep elements visible
  const stroke = element.style.stroke || ((examMode && !darkTheme) ? '#111827' : (isSelected ? '#dc2626' : (darkTheme ? '#e5e7eb' : '#000')));
  const strokeWidth = element.style.strokeWidth / scale;
  const dash = element.style.dash ? element.style.dash.map((d) => d / scale) : undefined;

  return (
    <>
      {branch1.length > 0 && (
        <Line
          points={branch1}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={dash}
          hitStrokeWidth={10 / scale}
          onClick={() => useToolStore.getState().setSelectedId(element.id)}
          onContextMenu={(e) => {
            e.evt.preventDefault();
            const stage = e.target.getStage();
            const pointer = stage?.getPointerPosition();
            if (!pointer) return;
            useViewStore.getState().openContextMenu(element.id, pointer.x, pointer.y);
          }}
        />
      )}
      {branch2.length > 0 && (
        <Line
          points={branch2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={dash}
          hitStrokeWidth={10 / scale}
          onClick={() => useToolStore.getState().setSelectedId(element.id)}
          onContextMenu={(e) => {
            e.evt.preventDefault();
            const stage = e.target.getStage();
            const pointer = stage?.getPointerPosition();
            if (!pointer) return;
            useViewStore.getState().openContextMenu(element.id, pointer.x, pointer.y);
          }}
        />
      )}
    </>
  );
};
