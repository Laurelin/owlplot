import type { TooltipDatum, NumberFormat } from '@owlplot/core'

/**
 * Reserved escape-hatch shape (do not implement prematurely; renderer-only, never in TooltipDatum):
 * tooltip: { showX?: boolean, formatX?: (x: number | string) => string, seriesLabel?: (seriesId: string) => string }
 * All optional; no defaults that reintroduce noise.
 */

/** Renderer-provided context for x presentation (formatter, unit, scale type) and tooltip number format. Not part of TooltipDatum. */
export type TooltipContext = {
  xFormatter?: (x: number | string) => string
  xUnit?: string
  xScaleType?: 'linear' | 'time' | 'log'
  /** Tooltip number formatting. Default { mode: 'raw' }. Only apply if user configures. */
  tooltipFormat?: NumberFormat
}

/** Derived from scene node style (stroke resolved to color for swatch). Not in TooltipDatum. */
export type HoverSeriesStyle = {
  stroke?: string // resolved color for swatch (solid or first stop of gradient)
  strokeDasharray?: string // optional line-style hint, off by default
}

/** Optional bag passed to render(); carries context and seriesStyles. */
export type TooltipRenderOptions = {
  context?: TooltipContext
  seriesStyles?: Map<string, HoverSeriesStyle>
}

export interface TooltipRenderer {
  render(datum: TooltipDatum, options?: TooltipRenderOptions): HTMLElement
  destroy?(el: HTMLElement): void
}
