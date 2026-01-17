import { Arc as KonvaArc, Line, Group } from 'react-konva';
import type { ArcElement, PointElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';

interface ArcProps {
    element: ArcElement;
}

export const Arc: React.FC<ArcProps> = ({ element }) => {
    const { scale } = useViewStore();
    const getElementById = useGeoStore((state) => state.getElementById);

    const center = getElementById(element.center) as PointElement | undefined;
    const startPoint = getElementById(element.startPoint) as PointElement | undefined;
    const endPoint = getElementById(element.endPoint) as PointElement | undefined;

    if (!center || !startPoint || !endPoint) return null;
    if (center.type !== 'point' || startPoint.type !== 'point' || endPoint.type !== 'point') return null;

    // Calculate radius and angles
    const radius = Math.sqrt(
        (startPoint.x - center.x) ** 2 + (startPoint.y - center.y) ** 2
    );

    const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x) * 180 / Math.PI;
    const endAngle = Math.atan2(endPoint.y - center.y, endPoint.x - center.x) * 180 / Math.PI;

    // Calculate arc angle (going counter-clockwise from start to end)
    let arcAngle = endAngle - startAngle;
    if (arcAngle < 0) arcAngle += 360;

    const strokeWidth = (element.style.strokeWidth || 1.5) / scale;

    if (element.isSector) {
        // Sector: filled pie slice
        return (
            <Group>
                <KonvaArc
                    x={center.x}
                    y={center.y}
                    innerRadius={0}
                    outerRadius={radius}
                    angle={arcAngle}
                    rotation={startAngle}
                    fill={element.style.fill || 'rgba(59, 130, 246, 0.2)'}
                    stroke={element.style.stroke || '#000'}
                    strokeWidth={strokeWidth}
                    dash={element.style.dash?.map(d => d / scale)}
                    listening={false}
                />
                {/* Radii lines */}
                <Line
                    points={[center.x, center.y, startPoint.x, startPoint.y]}
                    stroke={element.style.stroke || '#000'}
                    strokeWidth={strokeWidth}
                    dash={element.style.dash?.map(d => d / scale)}
                    listening={false}
                />
                <Line
                    points={[center.x, center.y, endPoint.x, endPoint.y]}
                    stroke={element.style.stroke || '#000'}
                    strokeWidth={strokeWidth}
                    dash={element.style.dash?.map(d => d / scale)}
                    listening={false}
                />
            </Group>
        );
    }

    // Arc only (no fill)
    return (
        <KonvaArc
            x={center.x}
            y={center.y}
            innerRadius={radius}
            outerRadius={radius}
            angle={arcAngle}
            rotation={startAngle}
            stroke={element.style.stroke || '#000'}
            strokeWidth={strokeWidth}
            dash={element.style.dash?.map(d => d / scale)}
            listening={false}
        />
    );
};
