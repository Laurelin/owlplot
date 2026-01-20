export type AxisOrientation = "bottom" | "left" | "top" | "right";

export interface AxisTick {
  value: number;
  position: number;
  label: string;
}

export interface AxisLabelLayout {
  x: number;
  y: number;
  text: string;
  textAnchor: string;
  dominantBaseline: string;
}

export interface AxisLayout {
  orientation: AxisOrientation;
  line: { x1: number; y1: number; x2: number; y2: number };
  ticks: AxisTick[];
  tickLabelLayouts: AxisLabelLayout[];
  axisLabelLayout?: AxisLabelLayout;
}
