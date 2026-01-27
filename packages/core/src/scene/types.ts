import type { TextAnchor, DominantBaseline } from '../text/types'
import type { AnyPaint } from '../paint/types'

// -----------------------------------
// enums (never use hardcoded strings)
// -----------------------------------

export enum SceneNodeKind {
  GROUP = 'group',
  PATH = 'path',
  RECT = 'rect',
  CIRCLE = 'circle',
  TEXT = 'text',
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

export type SceneStyle = {
  fill?: AnyPaint
  stroke?: AnyPaint
  strokeWidth?: number
  opacity?: number
  fontFamily?: string
  fontSizePx?: number
  fontWeight?: number | string
}

export type TooltipDatum = {
  kind: string
  seriesId?: string
  values: Record<string, unknown>
  label?: string
}

export type SceneBaseNode = {
  id: string
  style?: SceneStyle
  transform?: string // pull up into base so every node can have it
  metadata?: {
    tooltip?: TooltipDatum
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

export function createSceneTooltip(
  kind: string,
  values: Record<string, unknown>,
  options?: { seriesId?: string; label?: string }
): TooltipDatum {
  return {
    kind,
    values,
    ...options,
  }
}
