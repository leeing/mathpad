export type GeoType = 'point' | 'line' | 'circle' | 'label' | 'angle' | 'function_graph' | 'segment_mark' | 'arc' | 'text' | 'ellipse' | 'parabola' | 'hyperbola';

export interface GeoStyle {
  stroke: string;
  strokeWidth: number;
  fill?: string;
  opacity?: number;
  dash?: number[]; // Array of numbers for dash pattern [dashLength, gapLength]
  pointRadius?: number; // Radius for point elements
}

export type SegmentMarkType = 'equal_1' | 'equal_2' | 'equal_3' | 'parallel_1' | 'parallel_2';

export type GeoDefinition =
  | { type: 'free' }
  | { type: 'midpoint'; p1: string; p2: string }
  | { type: 'intersection'; el1: string; el2: string }
  | { type: 'line_from_points'; p1: string; p2: string }
  | { type: 'perpendicular_point'; lineId: string; pointId: string }
  | { type: 'circle_by_points'; center: string; edge: string }
  | { type: 'distance'; el1: string; el2: string; type2: 'point' | 'line' }
  | { type: 'angle_3points'; p1: string; vertex: string; p2: string }
  | { type: 'function_expression'; expression: string }
  | { type: 'segment_mark'; lineId: string; markType: SegmentMarkType }
  | { type: 'ellipse_by_foci'; f1: string; f2: string; pointOn: string }
  | { type: 'ellipse_by_center_axes'; center: string; majorEnd: string; minorEnd: string }
  | { type: 'ellipse_by_center'; center: string; a: number; b: number }
  | { type: 'ellipse_by_equation'; a: number; b: number; centerX: number; centerY: number; rotation: number }
  | { type: 'parabola_by_focus_directrix'; focus: string; directrix: string }
  | { type: 'parabola_by_vertex_focus'; vertex: string; focus: string }
  | { type: 'parabola_by_equation'; p: number; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'parabola_general'; a: number; b: number; c: number; axis: 'x' | 'y' }
  | { type: 'hyperbola_by_equation'; a: number; b: number; centerX: number; centerY: number; orientation: 'horizontal' | 'vertical' };

export interface BaseElement {
  id: string;
  type: GeoType;
  name: string;
  visible: boolean;
  style: GeoStyle;
  dependencies: string[]; // IDs of elements this depends on (parents)
}

export interface PointElement extends BaseElement {
  type: 'point';
  x: number;
  y: number;
  definition: GeoDefinition;
}

export interface LineElement extends BaseElement {
  type: 'line';
  subtype: 'segment' | 'ray' | 'line' | 'vector';
  p1: string;
  p2: string;
  definition: GeoDefinition;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  center: string; // Point ID
  edge: string; // Point ID on the circumference
  definition: GeoDefinition;
}

export interface LabelElement extends BaseElement {
  type: 'label';
  text: string;
  x: number;
  y: number;
  definition: GeoDefinition;
}

export interface AngleElement extends BaseElement {
  type: 'angle';
  p1: string;
  vertex: string;
  p2: string;
  angleValue: number; // in degrees
  definition: GeoDefinition;
}

export interface FunctionGraphElement extends BaseElement {
  type: 'function_graph';
  expression: string;
  definition: GeoDefinition;
}

export interface SegmentMarkElement extends BaseElement {
  type: 'segment_mark';
  lineId: string;
  markType: SegmentMarkType;
  definition: GeoDefinition;
}

export interface ArcElement extends BaseElement {
  type: 'arc';
  center: string;      // Circle center point ID
  startPoint: string;  // Arc start point ID
  endPoint: string;    // Arc end point ID
  isSector: boolean;   // true = sector (fills area), false = arc only
  definition: GeoDefinition;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
  definition: GeoDefinition;
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
  centerX: number;     // Center X coordinate
  centerY: number;     // Center Y coordinate
  a: number;           // Semi-major axis
  b: number;           // Semi-minor axis
  rotation: number;    // Rotation angle in radians
  definition: GeoDefinition;
}

export interface ParabolaElement extends BaseElement {
  type: 'parabola';
  // Optional standard form properties (might not apply to general/geometric)
  vertexX?: number;     
  vertexY?: number;     
  p?: number;           
  direction?: 'up' | 'down' | 'left' | 'right';
  // General form coefficients: y = ax^2 + bx + c (if axis='y') or x = ay^2 + by + c (if axis='x')
  a?: number;
  b?: number;
  c?: number;
  axis?: 'x' | 'y'; // The axis of symmetry is parallel to this axis? No, usually y=... means symmetry axis is parallel to Y. 
                    // Let's define: axis='y' means y = ax^2... (vertical symmetry axis), axis='x' means x = ay^2...
  definition: GeoDefinition;
}

export interface HyperbolaElement extends BaseElement {
  type: 'hyperbola';
  centerX: number;
  centerY: number;
  a: number;
  b: number;
  orientation: 'horizontal' | 'vertical';
  definition: GeoDefinition;
}

export type GeoElement = PointElement | LineElement | CircleElement | LabelElement | AngleElement | FunctionGraphElement | SegmentMarkElement | ArcElement | TextElement | EllipseElement | ParabolaElement | HyperbolaElement;
