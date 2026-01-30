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

// -----------------------------------
// Point shape (define once; config, scene, renderer use same type)
// Circumradius rule: size = distance from center to farthest vertex/point.
// -----------------------------------

/** Built-in point shapes (circumradius = size). */
export type BuiltInPointShape =
  | { kind: 'circle' }
  | { kind: 'square' }
  | { kind: 'triangle' }
  | { kind: 'diamond' }

/** Registry-based custom shape (SSR-friendly; renderer resolves name). Not yet supported: requires a future symbol registry; currently falls back to circle. */
export type SymbolPointShape = { kind: 'symbol'; name: string }

/** Emoji as text mark (font-size / metrics; not path geometry). Supported when passed via series/options; string shorthands are normalized to built-in shapes only. */
export type EmojiPointShape = { kind: 'emoji'; value: string }

/** Point shape union. Only string shorthands (circle, square, triangle, diamond) are normalized from config; symbol and emoji are supported at render time when provided. */
export type PointShape = BuiltInPointShape | SymbolPointShape | EmojiPointShape

/** String shorthand for built-in shapes (normalized at config→scene boundary). */
export type PointShapeShorthand = 'circle' | 'square' | 'triangle' | 'diamond'

/** Point config: shape intent + size (circumradius). Default size 2.5. */
export type PointConfig = {
  shape?: PointShape | PointShapeShorthand
  size?: number
}

export type LineSeries = {
  id: string
  points: DataPoint[]
  color?: string // Simple: base color string
  paint?: PaintStyles // Advanced: full paint control
  /** Point mark shape and size (circumradius). Default shape circle, size 2.5. */
  point?: PointConfig
  /** Which Y axis (scale) this series uses. Default 'left'. Used for dual-scale (e.g. °C left, °F right). */
  yAxis?: 'left' | 'right'
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

import type { NumberFormat } from '../format/number'

export type Cartesian2DOptions = {
  xLabel?: string
  yLabel?: string
  /** Primary Y-axis position. When 'right' and yAxisRight is set, only the right axis is shown (one scale). Default 'left'. */
  yAxis?: { position?: 'left' | 'right' }
  showGrid?: boolean
  showPoints?: boolean
  /** Global default for point shape/size; series can override. */
  point?: PointConfig
  padding?: Partial<Padding>

  /** optional tick count */
  xTickCount?: number
  yTickCount?: number

  /**
   * Axis tick label formatting. undefined = AUTO (decimals from tick step); null = raw; otherwise explicit mode.
   */
  axisTickFormat?: NumberFormat | null

  /**
   * Tooltip number formatting. Default { mode: 'raw' }. Only apply formatting if user configures it.
   */
  tooltipFormat?: NumberFormat

  /** fonts for axes text */
  axisTickFont?: string // e.g. "12px sans-serif"
  axisLabelFont?: string // e.g. "14px sans-serif"

  /** enable adaptive padding based on label extents (default: true) */
  enableAdaptivePadding?: boolean

  /**
   * Y-axis domain policy. Default: { mode: 'include-zero' }.
   * include-zero: clamp computed extents so domain includes 0.
   * data: use computed extents as-is.
   * fixed: use explicit min/max (min and max required when mode is 'fixed').
   */
  yDomain?: {
    mode: 'include-zero' | 'data' | 'fixed'
    min?: number
    max?: number
  }

  /**
   * When both x and y domains include zero, show tick mark and label at origin.
   * Default false (hide at origin to avoid double zero and clutter).
   */
  showOriginTicks?: boolean

  /** right Y-axis configuration (secondary/mirror or dual-scale) */
  yAxisRight?: {
    tickCount?: number
    axisLabel?: string
    /** Explicit domain for right scale (dual-scale). If absent, derived from series with yAxis: 'right'. */
    domain?: [number, number]
    /** Override global axisTickFormat for this axis. */
    axisTickFormat?: NumberFormat | null
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
