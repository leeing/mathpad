import React from 'react';
import { Layer, Circle, Text, Group } from 'react-konva';
import { useGeoStore } from '../store/geoStore';
import { useViewStore } from '../store/viewStore';
import { useToolStore } from '../store/toolStore';
import { getSnapPosition, type SnapResult } from '../core/snapping';

interface SnapPreviewLayerProps {
    mousePosition: { x: number; y: number } | null;
}

export const SnapPreviewLayer: React.FC<SnapPreviewLayerProps> = ({ mousePosition }) => {
    const elements = useGeoStore(state => state.elements);
    const scale = useViewStore(state => state.scale);
    const activeTool = useToolStore(state => state.activeTool);

    // Only show preview for tools that create/use points
    const pointCreationTools = [
        'point', 'line', 'straight_line', 'vector', 'auxiliary', 'circle',
        'triangle', 'rectangle', 'ellipse', 'parabola',
        'perpendicular', 'parallel', 'midpoint',
        'incenter', 'circumcenter', 'measure_length', 'measure_angle'
    ];

    if (!mousePosition || !pointCreationTools.includes(activeTool)) {
        return null;
    }

    const snapResult: SnapResult = getSnapPosition(
        mousePosition.x,
        mousePosition.y,
        elements,
        15 / scale
    );

    // Only show preview for intersection and midpoint snap types
    // (existing points already have their own visual)
    if (snapResult.snapType !== 'intersection' && snapResult.snapType !== 'midpoint') {
        return null;
    }

    const getSnapColor = () => {
        switch (snapResult.snapType) {
            case 'intersection':
                return '#f59e0b'; // Orange/amber for intersections
            case 'midpoint':
                return '#10b981'; // Green for midpoints
            default:
                return '#3b82f6'; // Blue default
        }
    };

    const color = getSnapColor();
    const radius = 6 / scale;
    const labelOffset = 15 / scale;

    return (
        <Layer listening={false}>
            <Group x={snapResult.x} y={snapResult.y} listening={false}>
                {/* Outer glow ring */}
                <Circle
                    radius={radius + 4 / scale}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={2 / scale}
                    opacity={0.5}
                    listening={false}
                />
                {/* Inner filled circle */}
                <Circle
                    radius={radius}
                    fill={color}
                    opacity={0.8}
                    listening={false}
                />
                {/* Label */}
                {snapResult.label && (
                    <Text
                        x={labelOffset}
                        y={-radius}
                        text={snapResult.label}
                        fontSize={12 / scale}
                        fill={color}
                        fontStyle="bold"
                        listening={false}
                    />
                )}
            </Group>
        </Layer>
    );
};
