import type { TextAnchor, DominantBaseline } from '../text/types'
import type { AnyPaint } from '../paint/types'
import type { PointShape } from '../config/types'

// -----------------------------------
// enums (never use hardcoded strings)
// -----------------------------------

export enum SceneNodeKind {
  GROUP = 'group',
  PATH = 'path',
  RECT = 'rect',
  CIRCLE = 'circle',
  TEXT = 'text',
  POINT = 'point',
}

export enum TooltipKind {
  POINT = 'point',
  X_AXIS = 'x-axis',
  Y_AXIS = 'y-axis',
  GLYPH = 'glyph',
}

// -----------------------------------
// scene graph node types
// -----------------------------------

export type SceneNode =
  | SceneGroupNode
  | ScenePathNode
  | SceneRectNode
  | SceneCircleNode
  | SceneTextNode
  | ScenePointNode

export type SceneStyle = {
  fill?: AnyPaint
  stroke?: AnyPaint
  strokeWidth?: number
  opacity?: number
  fillOpacity?: number
  strokeOpacity?: number
  fontFamily?: string
  fontSizePx?: number
  fontWeight?: number | string
}

export type TooltipPoint = {
  seriesId: string
  x: number
  y: number
}

export type TooltipDatum = {
  kind: TooltipKind
  seriesId?: string
  /** DERIVED: Legacy-compat shape. Derived from points: { [seriesId]: y, x: x } */
  values: Record<string, unknown>
  label?: string
  /**
   * CANONICAL: The actual data points being displayed (x, y coordinates per series).
   * All other fields (values, x, seriesId) are derived from this.
   *
   * Identity constraint: seriesId exists ONLY in points[0].seriesId (for single-series tooltips).
   * No other identity channel exists. Do not re-add seriesId elsewhere "for convenience".
   */
  points: TooltipPoint[]
  /** DERIVED: Convenience accessor for points[0]?.x */
  x: number
}

export type LegendEntry = {
  seriesId: string
  label: string
  paint: AnyPaint
  order: number
}

export type LegendMetadata = {
  entries: LegendEntry[]
}

export type SceneNodeRole =
  | 'background'
  | 'band'
  | 'region'
  | 'series'
  | 'axis'
  | 'annotation'

export type SceneBaseNode = {
  id: string
  style?: SceneStyle
  transform?: string // pull up into base so every node can have it
  metadata?: {
    role?: SceneNodeRole
    tooltip?: TooltipDatum
    legend?: LegendMetadata
    [key: string]: unknown
  }
}

export type SceneGroupNode = SceneBaseNode & {
  kind: SceneNodeKind.GROUP
  children: SceneNode[]
}

export type ScenePathNode = SceneBaseNode & {
  kind: SceneNodeKind.PATH
  d: string
}

export type SceneRectNode = SceneBaseNode & {
  kind: SceneNodeKind.RECT
  x: number
  y: number
  width: number
  height: number
  rx?: number
  ry?: number
}

export type SceneCircleNode = SceneBaseNode & {
  kind: SceneNodeKind.CIRCLE
  cx: number
  cy: number
  r: number
}

/** Point mark: domain position + shape intent only. Renderer realizes geometry. */
export type ScenePointNode = SceneBaseNode & {
  kind: SceneNodeKind.POINT
  /** Series this point belongs to (semantic; used for scale resolution in dual-scale). */
  seriesId: string
  /** Domain x (data space). */
  x: number
  /** Domain y (data space). */
  y: number
  /** Shape intent + size (circumradius). No geometry in core. */
  point: { shape: PointShape; size: number }
}

export type SceneTextNode = SceneBaseNode & {
  kind: SceneNodeKind.TEXT
  x: number
  y: number
  text: string
  textAnchor?: TextAnchor
  dominantBaseline?: DominantBaseline
}

// -----------------------------------
// helper for building tooltip metadata
// -----------------------------------

/**
 * Create tooltip datum from canonical point data.
 *
 * @param kind - Tooltip kind (discriminated enum, not string)
 * @param points - CANONICAL: Array of data points (one per series)
 * @param options - Optional label
 * @returns TooltipDatum with derived values and x fields
 */
export function createSceneTooltip(
  kind: TooltipKind,
  points: TooltipPoint[],
  options?: { label?: string }
): TooltipDatum {
  if (points.length === 0) {
    throw new Error('createSceneTooltip: points array cannot be empty')
  }

  const primaryPoint = points[0]!
  const x = primaryPoint.x

  // Strict derivation: only y values per series, x added once, no arbitrary keys
  const values: Record<string, unknown> = {}
  for (const point of points) {
    values[point.seriesId] = point.y
  }
  values.x = x

  return {
    kind,
    seriesId: primaryPoint.seriesId,
    values,
    ...options,
    points,
    x,
  }
}
