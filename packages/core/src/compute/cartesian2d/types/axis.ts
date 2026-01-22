import { Position } from '../../../config/types'
import { DominantBaseline, TextAnchor } from '../../../text/types'

export enum LabelOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  ANGLED = 'angled',
}

export interface LabelOrientationConfig {
  orientation?: LabelOrientation
  angle?: number // for angled labels, in degrees
}

export interface AxisTick {
  value: number
  position: number
  label: string
}

export interface AxisLabelLayout {
  x: number
  y: number
  text: string
  textAnchor: TextAnchor
  dominantBaseline: DominantBaseline
  rotation?: number // rotation angle in degrees
}

export interface AxisLayout {
  orientation: Position
  line: { x1: number; y1: number; x2: number; y2: number }
  ticks: AxisTick[]
  tickSize: number
  labelLayouts: AxisLabelLayout[]
  axisLabelLayout: AxisLabelLayout | undefined
}
