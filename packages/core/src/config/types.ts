export enum ChartKind {
  LINE = 'line',
}

export enum Position {
  BOTTOM = 'bottom',
  LEFT = 'left',
  TOP = 'top',
  RIGHT = 'right',
}

export type DataPoint = { x: number; y: number | null }

import type { PaintStyles } from '../paint/types'

export type LineSeries = {
  id: string
  points: DataPoint[]
  color?: string // Simple: base color string
  paint?: PaintStyles // Advanced: full paint control
}

export type Padding = {
  top: number
  right: number
  bottom: number
  left: number
}

export type AxisVisibility = {
  ticks?: boolean // default: true
  tickLabels?: boolean // default: true
  axisLine?: boolean // default: true
}

export type Cartesian2DOptions = {
  xLabel?: string
  yLabel?: string
  showGrid?: boolean
  showPoints?: boolean
  padding?: Partial<Padding>

  /** optional tick count */
  xTickCount?: number
  yTickCount?: number

  /** fonts for axes text */
  axisTickFont?: string // e.g. "12px sans-serif"
  axisLabelFont?: string // e.g. "14px sans-serif"

  /** enable adaptive padding based on label extents (default: true) */
  enableAdaptivePadding?: boolean

  /** right Y-axis configuration */
  yAxisRight?: {
    tickCount?: number
    axisLabel?: string
    labelOrientation?: {
      orientation?: 'horizontal' | 'vertical' | 'angled'
      angle?: number // for angled labels, in degrees
    }
    axisVisibility?: Partial<AxisVisibility>
  }

  /** label orientation for X-axis */
  xLabelOrientation?: {
    orientation?: 'horizontal' | 'vertical' | 'angled'
    angle?: number // for angled labels, in degrees
  }

  /** label orientation for Y-axis */
  yLabelOrientation?: {
    orientation?: 'horizontal' | 'vertical' | 'angled'
    angle?: number // for angled labels, in degrees
  }

  /** axis title orientation for X-axis (separate from tick label orientation) */
  xAxisLabelOrientation?: {
    orientation?: 'horizontal' | 'vertical' | 'angled'
    angle?: number // for angled labels, in degrees
  }

  /** axis title orientation for Y-axis (separate from tick label orientation)
   * 
   * Note: Axis label orientation is absolute, not auto-derived from axis side.
   * Users must explicitly configure vertical orientation; it is not implicit based on axis position.
   */
  yAxisLabelOrientation?: {
    orientation?: 'horizontal' | 'vertical' | 'angled'
    angle?: number // for angled labels, in degrees
  }

  /** Axis visibility configuration
   * 
   * Global defaults apply to all axes unless overridden by per-axis config.
   * Right Y-axis uses yAxisRight.axisVisibility (does NOT fall back to global y config).
   */
  axisVisibility?: {
    /** Global defaults for all axes */
    ticks?: boolean
    tickLabels?: boolean
    axisLine?: boolean
    /** Per-axis overrides */
    x?: Partial<AxisVisibility>
    y?: Partial<AxisVisibility>
  }
}

export type LineChartOptions = Cartesian2DOptions & {
  curve?: 'linear' // expand later
}

export type LineChartConfig = {
  kind: ChartKind.LINE
  series: LineSeries[]
  options?: LineChartOptions
}

export type ChartConfig = LineChartConfig
