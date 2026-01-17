import React from 'react';
import { Layer, Line, Text } from 'react-konva';
import { useViewStore } from '../store/viewStore';
import { PIXELS_PER_UNIT } from '../constants/grid';

interface GridProps {
    width: number;
    height: number;
}

export const Grid: React.FC<GridProps> = ({ width, height }) => {
    const { scale, position, showGrid, showAxes, darkTheme } = useViewStore();

    const startX = -position.x / scale;
    const startY = -position.y / scale;
    const endX = (width - position.x) / scale;
    const endY = (height - position.y) / scale;

    const gridSize = PIXELS_PER_UNIT;

    // Expand bounds slightly
    const buffer = gridSize * 2;
    const firstX = Math.floor((startX - buffer) / gridSize) * gridSize;
    const firstY = Math.floor((startY - buffer) / gridSize) * gridSize;
    const lastX = Math.ceil((endX + buffer) / gridSize) * gridSize;
    const lastY = Math.ceil((endY + buffer) / gridSize) * gridSize;

    // Colors based on theme
    const axisColor = darkTheme ? '#555' : '#666';
    const gridColor = darkTheme ? '#2a2a2a' : '#e5e7eb';
    const labelColor = darkTheme ? '#666' : '#888';

    const lines = [];
    const labels = [];

    // Vertical lines & X-axis labels
    for (let x = firstX; x <= lastX; x += gridSize) {
        const isAxis = Math.abs(x) < 0.1; // Float safety

        if (showGrid || (showAxes && isAxis)) {
            lines.push(
                <Line
                    key={`v-${x}`}
                    points={[x, startY - buffer, x, endY + buffer]}
                    stroke={isAxis ? axisColor : gridColor}
                    strokeWidth={isAxis ? 2 / scale : 1 / scale}
                />
            );
        }

        if (showAxes && !isAxis) {
            labels.push(
                <Text
                    key={`lx-${x}`}
                    x={x + 2 / scale}
                    y={2 / scale}
                    text={(x / gridSize).toString()}
                    fontSize={10 / scale}
                    fill={labelColor}
                />
            );
        }
    }

    // Horizontal lines & Y-axis labels
    for (let y = firstY; y <= lastY; y += gridSize) {
        const isAxis = Math.abs(y) < 0.1;

        if (showGrid || (showAxes && isAxis)) {
            lines.push(
                <Line
                    key={`h-${y}`}
                    points={[startX - buffer, y, endX + buffer, y]}
                    stroke={isAxis ? axisColor : gridColor}
                    strokeWidth={isAxis ? 2 / scale : 1 / scale}
                />
            );
        }

        if (showAxes && !isAxis) {
            labels.push(
                <Text
                    key={`ly-${y}`}
                    x={2 / scale}
                    y={y + 2 / scale}
                    text={(-y / gridSize).toString()}
                    fontSize={10 / scale}
                    fill={labelColor}
                />
            );
        }
    }

    if (showAxes) {
        // Origin label
        labels.push(
            <Text
                key="origin"
                x={2 / scale}
                y={2 / scale}
                text="0"
                fontSize={10 / scale}
                fill={axisColor}
            />
        );
    }

    return <Layer listening={false}>{lines}{labels}</Layer>;
};
