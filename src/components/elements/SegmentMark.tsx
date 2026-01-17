import { Line, Group } from 'react-konva';
import type { SegmentMarkElement, LineElement, PointElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';
import { useGeoStore } from '../../store/geoStore';
import type { ReactNode } from 'react';

interface SegmentMarkProps {
    element: SegmentMarkElement;
}

export const SegmentMark: React.FC<SegmentMarkProps> = ({ element }) => {
    const { scale } = useViewStore();
    const examMode = useViewStore((state) => state.examMode);
    const getElementById = useGeoStore((state) => state.getElementById);

    const line = getElementById(element.lineId) as LineElement | undefined;
    if (!line || line.type !== 'line') return null;

    const p1 = getElementById(line.p1) as PointElement | undefined;
    const p2 = getElementById(line.p2) as PointElement | undefined;
    if (!p1 || !p2) return null;

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-6) return null;

    const perpX = -dy / len;
    const perpY = dx / len;
    const parX = dx / len;
    const parY = dy / len;

    const markSize = 8 / scale;
    const spacing = 4 / scale;
    const strokeWidth = (element.style.strokeWidth || 1.5) / scale;
    const stroke = examMode ? '#111827' : (element.style.stroke || '#000');

    const renderEqualMarks = (count: number): ReactNode[] => {
        const marks: ReactNode[] = [];
        const offset = -((count - 1) * spacing) / 2;

        for (let i = 0; i < count; i++) {
            const centerOffset = offset + i * spacing;
            const cx = midX + parX * centerOffset;
            const cy = midY + parY * centerOffset;

            marks.push(
                <Line
                    key={i}
                    points={[
                        cx + perpX * markSize / 2, cy + perpY * markSize / 2,
                        cx - perpX * markSize / 2, cy - perpY * markSize / 2
                    ]}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    listening={false}
                />
            );
        }
        return marks;
    };

    const renderArrowMarks = (count: number): ReactNode[] => {
        const marks: ReactNode[] = [];
        const offset = -((count - 1) * spacing) / 2;
        const arrowSize = markSize * 0.6;

        for (let i = 0; i < count; i++) {
            const centerOffset = offset + i * spacing;
            const cx = midX + parX * centerOffset;
            const cy = midY + parY * centerOffset;

            marks.push(
                <Line
                    key={i}
                    points={[
                        cx - parX * arrowSize - perpX * arrowSize / 2, cy - parY * arrowSize - perpY * arrowSize / 2,
                        cx, cy,
                        cx - parX * arrowSize + perpX * arrowSize / 2, cy - parY * arrowSize + perpY * arrowSize / 2
                    ]}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    listening={false}
                />
            );
        }
        return marks;
    };

    let markContent: ReactNode[] = [];

    switch (element.markType) {
        case 'equal_1':
            markContent = renderEqualMarks(1);
            break;
        case 'equal_2':
            markContent = renderEqualMarks(2);
            break;
        case 'equal_3':
            markContent = renderEqualMarks(3);
            break;
        case 'parallel_1':
            markContent = renderArrowMarks(1);
            break;
        case 'parallel_2':
            markContent = renderArrowMarks(2);
            break;
    }

    return <Group>{markContent}</Group>;
};
