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
  xTickCount?: number
  yTickCount?: number
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
