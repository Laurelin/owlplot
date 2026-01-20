import { Position } from "../../../config/types";
import { DominantBaseline, TextAnchor } from "../../../text/types";

export interface AxisTick {
  value: number;
  position: number;
  label: string;
}

export interface AxisLabelLayout {
  x: number;
  y: number;
  text: string;
  textAnchor: TextAnchor;
  dominantBaseline: DominantBaseline;
}

export interface AxisLayout {
  orientation: Position;
  line: { x1: number; y1: number; x2: number; y2: number };
  ticks: AxisTick[];
  tickSize: number;
  labelLayouts: AxisLabelLayout[];
  axisLabelLayout: AxisLabelLayout | undefined;
}
