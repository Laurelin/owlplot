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

export type LineSeries = {
  id: string
  points: DataPoint[]
}

export type Padding = {
  top: number
  right: number
  bottom: number
  left: number
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
