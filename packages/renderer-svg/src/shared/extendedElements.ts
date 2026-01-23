import type { TooltipDatum } from '@owlplot/core'
import type { TooltipRenderer } from '../tooltip/types'

// Type definitions to avoid circular dependencies
export type HoverPointRef = {
  element: SVGCircleElement
  seriesId: string
  x: number
  y: number
}

export type NodeHoverListenerRef = {
  element: SVGElement
  handlers: {
    mouseenter: (event: MouseEvent) => void
    mousemove: (event: MouseEvent) => void
    mouseleave: () => void
  }
}

export type XAxisHoverListenerRef = {
  mousemove: (event: MouseEvent) => void
  mouseleave: () => void
}

import {
  TOOLTIP_CONTAINER_SYMBOL,
  TOOLTIP_ELEMENT_SYMBOL,
  TOOLTIP_RENDERER_SYMBOL,
  TOOLTIP_DATUM_SYMBOL,
  POINT_INDEX_SYMBOL,
  HOVER_LINE_SYMBOL,
  X_AXIS_HOVER_LISTENERS_SYMBOL,
  NODE_HOVER_LISTENERS_SYMBOL,
} from './symbols'

export interface ExtendedSVGElement extends SVGElement {
  [TOOLTIP_DATUM_SYMBOL]?: TooltipDatum
}

export interface ExtendedSVGSVGElement extends SVGSVGElement {
  [TOOLTIP_CONTAINER_SYMBOL]?: HTMLElement
  [TOOLTIP_ELEMENT_SYMBOL]?: HTMLElement
  [TOOLTIP_RENDERER_SYMBOL]?: TooltipRenderer

  [POINT_INDEX_SYMBOL]?: Map<string, HoverPointRef[]>
  [HOVER_LINE_SYMBOL]?: SVGLineElement

  [X_AXIS_HOVER_LISTENERS_SYMBOL]?: XAxisHoverListenerRef
  [NODE_HOVER_LISTENERS_SYMBOL]?: NodeHoverListenerRef[]
}
