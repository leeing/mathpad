import { Layer } from 'react-konva';
import { useGeoStore } from '../store/geoStore';
import { Point } from './elements/Point';
import { Line } from './elements/Line';
import { Circle } from './elements/Circle';
import { Label } from './elements/Label';
import { Angle } from './elements/Angle';
import { FunctionGraph } from './elements/FunctionGraph';
import { SegmentMark } from './elements/SegmentMark';
import { Arc } from './elements/Arc';
import { Text } from './elements/Text';
import { Ellipse } from './elements/Ellipse';
import { Parabola } from './elements/Parabola';
import { Hyperbola } from './elements/Hyperbola';
import type { PointElement, LineElement, CircleElement, LabelElement, AngleElement, FunctionGraphElement, SegmentMarkElement, ArcElement, TextElement, EllipseElement, ParabolaElement, HyperbolaElement } from '../types/geoElements';

export const GeoLayer: React.FC = () => {
  const elements = useGeoStore((state) => state.elements);

  const lines = Object.values(elements).filter(e => e.type === 'line') as LineElement[];
  const points = Object.values(elements).filter(e => e.type === 'point') as PointElement[];
  const circles = Object.values(elements).filter(e => e.type === 'circle') as CircleElement[];
  const labels = Object.values(elements).filter(e => e.type === 'label') as LabelElement[];
  const angles = Object.values(elements).filter(e => e.type === 'angle') as AngleElement[];
  const functions = Object.values(elements).filter(e => e.type === 'function_graph') as FunctionGraphElement[];
  const segmentMarks = Object.values(elements).filter(e => e.type === 'segment_mark') as SegmentMarkElement[];
  const arcs = Object.values(elements).filter(e => e.type === 'arc') as ArcElement[];
  const texts = Object.values(elements).filter(e => e.type === 'text') as TextElement[];
  const ellipses = Object.values(elements).filter(e => e.type === 'ellipse') as EllipseElement[];
  const parabolas = Object.values(elements).filter(e => e.type === 'parabola') as ParabolaElement[];
  const hyperbolas = Object.values(elements).filter(e => e.type === 'hyperbola') as HyperbolaElement[];

  return (
    <Layer id="geo-layer">
      {functions.map(el => <FunctionGraph key={el.id} element={el} />)}
      {ellipses.map(el => <Ellipse key={el.id} element={el} />)}
      {parabolas.map(el => <Parabola key={el.id} element={el} />)}
      {hyperbolas.map(el => <Hyperbola key={el.id} element={el} />)}
      {angles.map(el => <Angle key={el.id} element={el} />)}
      {circles.map(el => <Circle key={el.id} element={el} />)}
      {arcs.map(el => <Arc key={el.id} element={el} />)}
      {lines.map(el => <Line key={el.id} element={el} />)}
      {segmentMarks.map(el => <SegmentMark key={el.id} element={el} />)}
      {points.map(el => <Point key={el.id} element={el} />)}
      {labels.map(el => <Label key={el.id} element={el} />)}
      {texts.map(el => <Text key={el.id} element={el} />)}
    </Layer>
  );
};
