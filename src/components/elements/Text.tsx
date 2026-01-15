import { Text as KonvaText } from 'react-konva';
import type { TextElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';

interface TextProps {
    element: TextElement;
}

export const Text: React.FC<TextProps> = ({ element }) => {
    const { scale } = useViewStore();

    if (!element.visible) return null;

    return (
        <KonvaText
            x={element.x}
            y={element.y}
            text={element.content}
            fontSize={(element.fontSize || 14) / scale}
            fill={element.style.stroke || '#000'}
            listening={false}
        />
    );
};
