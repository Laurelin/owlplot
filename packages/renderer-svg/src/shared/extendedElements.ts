import type { TooltipDatum } from '@owlplot/core'
import type {
  TooltipRenderer,
  TooltipContext,
  HoverSeriesStyle,
} from '../tooltip/types'

// Type definitions to avoid circular dependencies
/** Semantic only: which element represents which data point (domain x, y). */
export type HoverPointRef = {
  element: SVGElement
  seriesId: string
  x: number
  y: number
}

export type GlyphHoverListenerRef = {
  pointermove: (event: PointerEvent) => void
  pointerleave: () => void
}

export type DataHoverListenerRef = {
  pointermove: (event: PointerEvent) => void
  pointerleave: () => void
}

import type { PointShape } from '@owlplot/core'
import {
  TOOLTIP_CONTAINER_SYMBOL,
  TOOLTIP_ELEMENT_SYMBOL,
  TOOLTIP_RENDERER_SYMBOL,
  TOOLTIP_DATUM_SYMBOL,
  TOOLTIP_CONTEXT_SYMBOL,
  SERIES_STYLES_SYMBOL,
  SERIES_POINT_SHAPES_SYMBOL,
  POINT_INDEX_SYMBOL,
  X_HOVER_LINE_SYMBOL,
  Y_HOVER_LINE_SYMBOL,
  GLYPH_HOVER_LISTENERS_SYMBOL,
  DATA_HOVER_LISTENERS_SYMBOL,
} from './symbols'

export interface ExtendedSVGElement extends SVGElement {
  [TOOLTIP_DATUM_SYMBOL]?: TooltipDatum
}

export interface ExtendedSVGSVGElement extends SVGSVGElement {
  [TOOLTIP_CONTAINER_SYMBOL]?: HTMLElement
  [TOOLTIP_ELEMENT_SYMBOL]?: HTMLElement
  [TOOLTIP_RENDERER_SYMBOL]?: TooltipRenderer
  [TOOLTIP_CONTEXT_SYMBOL]?: TooltipContext
  [SERIES_STYLES_SYMBOL]?: Map<string, HoverSeriesStyle>
  [SERIES_POINT_SHAPES_SYMBOL]?: Map<string, PointShape>

  [POINT_INDEX_SYMBOL]?: Map<string, HoverPointRef[]>
  [X_HOVER_LINE_SYMBOL]?: SVGLineElement
  [Y_HOVER_LINE_SYMBOL]?: SVGLineElement

  [GLYPH_HOVER_LISTENERS_SYMBOL]?: GlyphHoverListenerRef
  [DATA_HOVER_LISTENERS_SYMBOL]?: DataHoverListenerRef
}
