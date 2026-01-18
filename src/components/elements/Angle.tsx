import { Arc, Text, Group, Line } from 'react-konva';
import type { AngleElement, PointElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';

interface AngleProps {
  element: AngleElement;
}

// Check if angle is approximately 90 degrees
const isRightAngle = (angleDegrees: number, tolerance: number = 1.5): boolean => {
  const normalized = Math.abs(angleDegrees % 360);
  return Math.abs(normalized - 90) < tolerance || Math.abs(normalized - 270) < tolerance;
};

export const Angle: React.FC<AngleProps> = ({ element }) => {
  const { scale } = useViewStore();
  const examMode = useViewStore((state) => state.examMode);
  const darkTheme = useViewStore((state) => state.darkTheme);
  const getElementById = useGeoStore((state) => state.getElementById);

  const p1 = getElementById(element.p1) as PointElement;
  const vertex = getElementById(element.vertex) as PointElement;
  const p2 = getElementById(element.p2) as PointElement;

  if (!p1 || !vertex || !p2) return null;

  const radius = 25 / scale;
  const angle1Rad = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  const angle2Rad = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
  const angle1 = angle1Rad * 180 / Math.PI;

  const angleValue = element.angleValue || 0;

  // Text position: mid-angle
  const midAngleRad = (angle1 + angleValue / 2) * Math.PI / 180;
  const textRadius = radius + 15 / scale;
  const textX = vertex.x + textRadius * Math.cos(midAngleRad);
  const textY = vertex.y + textRadius * Math.sin(midAngleRad);

  // Check if this is a right angle
  if (isRightAngle(angleValue)) {
    // Render square mark for right angle (⊾)
    const size = 15 / scale;

    // Unit vectors along the two rays
    const ux1 = Math.cos(angle1Rad);
    const uy1 = Math.sin(angle1Rad);
    const ux2 = Math.cos(angle2Rad);
    const uy2 = Math.sin(angle2Rad);

    // Corner points of the square mark
    const p1x = vertex.x + ux1 * size;
    const p1y = vertex.y + uy1 * size;
    const p2x = vertex.x + ux1 * size + ux2 * size;
    const p2y = vertex.y + uy1 * size + uy2 * size;
    const p3x = vertex.x + ux2 * size;
    const p3y = vertex.y + uy2 * size;

    return (
      <Group>
        <Line
          points={[p1x, p1y, p2x, p2y, p3x, p3y]}
          stroke={(examMode && !darkTheme) ? '#111827' : (darkTheme ? '#e5e7eb' : (element.style.stroke || '#000'))}
          strokeWidth={(element.style.strokeWidth || 1.5) / scale}
          listening={false}
        />
      </Group>
    );
  }

  // Regular angle arc
  return (
    <Group>
      <Arc
        x={vertex.x}
        y={vertex.y}
        innerRadius={0}
        outerRadius={radius}
        angle={angleValue}
        rotation={angle1}
        fill={(examMode && !darkTheme) ? 'rgba(17, 24, 39, 0.08)' : (darkTheme ? 'rgba(229, 231, 235, 0.15)' : (element.style.fill || 'rgba(255, 165, 0, 0.2)'))}
        stroke={(examMode && !darkTheme) ? '#111827' : (darkTheme ? '#e5e7eb' : (element.style.stroke || 'orange'))}
        strokeWidth={element.style.strokeWidth ? element.style.strokeWidth / scale : 1.5 / scale}
        listening={false}
      />
      <Text
        text={`${angleValue.toFixed(1)}°`}
        x={textX}
        y={textY}
        fontSize={12 / scale}
        fill={(examMode && !darkTheme) ? '#111827' : (darkTheme ? '#e5e7eb' : '#4b5563')}
        align="center"
        verticalAlign="middle"
        offsetX={10}
        offsetY={5}
        listening={false}
      />
    </Group>
  );
};
