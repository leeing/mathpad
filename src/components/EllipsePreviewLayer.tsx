import React from 'react';
import { Layer, Line, Ellipse as KonvaEllipse, Circle } from 'react-konva';
import { useToolStore } from '../store/toolStore';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';

interface EllipsePreviewLayerProps {
    mousePosition: { x: number; y: number } | null;
}

export const EllipsePreviewLayer: React.FC<EllipsePreviewLayerProps> = ({ mousePosition }) => {
    const { scale } = useViewStore();
    const activeTool = useToolStore((state) => state.activeTool);
    const ellipseMode = useToolStore((state) => state.ellipseMode);
    const constructionStep = useToolStore((state) => state.constructionStep);
    const tempIds = useToolStore((state) => state.tempIds);
    const getElementById = useGeoStore((state) => state.getElementById);

    // Only show for ellipse tool in center mode
    if (activeTool !== 'ellipse' || ellipseMode !== 'center') {
        return null;
    }

    // Get the temp points
    const centerPoint = tempIds[0] ? getElementById(tempIds[0]) : null;
    const majorPoint = tempIds[1] ? getElementById(tempIds[1]) : null;

    // After clicking center, show center marker
    if (constructionStep === 1 && centerPoint && centerPoint.type === 'point') {
        return (
            <Layer>
                {/* Center cross marker */}
                <Line
                    points={[centerPoint.x - 15 / scale, centerPoint.y, centerPoint.x + 15 / scale, centerPoint.y]}
                    stroke="#f97316"
                    strokeWidth={2 / scale}
                    dash={[4 / scale, 4 / scale]}
                />
                <Line
                    points={[centerPoint.x, centerPoint.y - 15 / scale, centerPoint.x, centerPoint.y + 15 / scale]}
                    stroke="#f97316"
                    strokeWidth={2 / scale}
                    dash={[4 / scale, 4 / scale]}
                />
            </Layer>
        );
    }

    // After clicking center and major axis endpoint, show guides and preview
    if (constructionStep === 2 && centerPoint && majorPoint &&
        centerPoint.type === 'point' && majorPoint.type === 'point' && mousePosition) {

        const cx = centerPoint.x;
        const cy = centerPoint.y;
        const mx = majorPoint.x;
        const my = majorPoint.y;

        // Major axis vector
        const dx = mx - cx;
        const dy = my - cy;
        const majorLength = Math.sqrt(dx * dx + dy * dy);

        if (majorLength < 1) return null;

        // Unit vectors
        const ux = dx / majorLength;  // Major axis direction
        const uy = dy / majorLength;
        const vx = -uy;  // Perpendicular (minor axis direction)
        const vy = ux;

        // Extend major axis line beyond endpoints
        const majorLineLength = majorLength * 1.5;
        const majorLine = [
            cx - ux * majorLineLength, cy - uy * majorLineLength,
            cx + ux * majorLineLength, cy + uy * majorLineLength
        ];

        // Minor axis line (perpendicular through center)
        const minorAxisLength = 300 / scale;  // Long enough to be visible
        const minorLine = [
            cx - vx * minorAxisLength, cy - vy * minorAxisLength,
            cx + vx * minorAxisLength, cy + vy * minorAxisLength
        ];

        // Calculate b from mouse position (project onto minor axis)
        const mouseToCenter = {
            x: mousePosition.x - cx,
            y: mousePosition.y - cy
        };
        // Project onto minor axis vector
        const bPixels = Math.abs(mouseToCenter.x * vx + mouseToCenter.y * vy);

        // Convert for ellipse
        const aPixels = majorLength;
        const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
            <Layer>
                {/* Major axis line (solid) */}
                <Line
                    points={majorLine}
                    stroke="#3b82f6"
                    strokeWidth={2 / scale}
                />

                {/* Minor axis line (dashed, perpendicular) */}
                <Line
                    points={minorLine}
                    stroke="#f97316"
                    strokeWidth={2 / scale}
                    dash={[8 / scale, 8 / scale]}
                />

                {/* Preview ellipse */}
                {bPixels > 5 && (
                    <KonvaEllipse
                        x={cx}
                        y={cy}
                        radiusX={aPixels}
                        radiusY={bPixels}
                        rotation={rotation}
                        stroke="#3b82f6"
                        strokeWidth={2 / scale}
                        dash={[6 / scale, 4 / scale]}
                        fill="transparent"
                    />
                )}

                {/* Projected point indicator on minor axis */}
                <Circle
                    x={cx + vx * (mouseToCenter.x * vx + mouseToCenter.y * vy)}
                    y={cy + vy * (mouseToCenter.x * vx + mouseToCenter.y * vy)}
                    radius={6 / scale}
                    fill="#f97316"
                    stroke="#fff"
                    strokeWidth={2 / scale}
                />
            </Layer>
        );
    }

    return null;
};
