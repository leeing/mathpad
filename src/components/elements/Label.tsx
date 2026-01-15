import React from 'react';
import { Text } from 'react-konva';
import type { LabelElement } from '../../types/geoElements';
import { useViewStore } from '../../store/viewStore';

interface LabelProps {
  element: LabelElement;
}

export const Label: React.FC<LabelProps> = ({ element }) => {
  const { scale } = useViewStore();

  return (
    <Text
      text={element.text}
      x={element.x}
      y={element.y}
      fontSize={16 / scale}
      fill="#4b5563"
      align="center"
      verticalAlign="middle"
      listening={false}
    />
  );
};
