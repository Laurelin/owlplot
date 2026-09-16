import type {
  HoverResolver,
  HoverResolutionResult,
  RuntimeHoverMetadata,
} from './types'
import type {
  HoverIndicator,
  IndicatorHandle,
  HoverIndicatorContext,
} from './indicators/types'
import type { TooltipRenderer } from '../tooltip/types'
import { getMouseSvgCoordinates } from '../shared/svgCoordinates'
import { hideTooltip, showTooltipFromResult } from '../tooltip/tooltipDom'
import { resolveGlyphFromElement } from './resolvers/glyphResolver'
import {
  findGlyphAtPoint,
  buildPointIndexFromRenderedElements,
} from './pointIndex'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  GLYPH_HOVER_LISTENERS_SYMBOL,
  DATA_HOVER_LISTENERS_SYMBOL,
  POINT_INDEX_SYMBOL,
  SERIES_STYLES_SYMBOL,
  SERIES_POINT_SHAPES_SYMBOL,
} from '../shared/symbols'

type HoverEffects = {
  indicators: HoverIndicator[]
  context: HoverIndicatorContext
  svg: SVGSVGElement
  tooltipRenderer: TooltipRenderer | null
  handles: Map<string, IndicatorHandle>
  keys: Map<string, string>
}

function restoreIndicators(effects: HoverEffects): void {
  const indicatorsById = new Map(
    effects.indicators.map(indicator => [indicator.id, indicator])
  )
  for (const [id, handle] of effects.handles) {
    indicatorsById.get(id)?.restore(handle)
  }
  effects.handles.clear()
  effects.keys.clear()
}

function clearIndicator(
  indicator: HoverIndicator,
  effects: HoverEffects
): void {
  const previous = effects.handles.get(indicator.id)
  if (previous) indicator.restore(previous)
  effects.handles.delete(indicator.id)
  effects.keys.delete(indicator.id)
}

function indicatorKey(
  indicator: HoverIndicator,
  result: Extract<HoverResolutionResult, { kind: 'points' }>,
  context: HoverIndicatorContext
): string | null {
  if (!indicator.getKey) return null
  return indicator.getKey(result, context)
}

function storeIndicatorHandle(
  indicator: HoverIndicator,
  handle: IndicatorHandle | null,
  key: string | null,
  effects: HoverEffects
): void {
  if (handle == null) return
  effects.handles.set(indicator.id, handle)
  effects.keys.set(indicator.id, key ?? '')
}

function renderIndicator(
  indicator: HoverIndicator,
  result: Extract<HoverResolutionResult, { kind: 'points' }>,
  effects: HoverEffects
): void {
  const nextKey = indicatorKey(indicator, result, effects.context)
  if (nextKey != null && nextKey === effects.keys.get(indicator.id)) return
  clearIndicator(indicator, effects)
  const handle = indicator.render(result, effects.context)
  storeIndicatorHandle(indicator, handle, nextKey, effects)
}

function applyNoneResult(effects: HoverEffects): void {
  restoreIndicators(effects)
  hideTooltip(effects.svg)
}

function applyPointsResult(
  result: Extract<HoverResolutionResult, { kind: 'points' }>,
  event: PointerEvent,
  effects: HoverEffects
): void {
  for (const indicator of effects.indicators) {
    renderIndicator(indicator, result, effects)
  }
  if (!effects.tooltipRenderer) return
  showTooltipFromResult(result, event, effects.svg, effects.tooltipRenderer)
}

/**
 * Apply hover result: renders indicators and shows tooltip.
 * Owns lifecycle - prevents indicator leaks with O(1) lookup.
 * When an indicator has getKey and nextKey === previousKey, skips restore + re-render
 * so equivalent hover results (e.g. same x-slice) don't thrash animations.
 */
function applyHoverResult(
  result: HoverResolutionResult,
  event: PointerEvent,
  effects: HoverEffects
): void {
  if (result.kind === 'none') {
    applyNoneResult(effects)
    return
  }
  applyPointsResult(result, event, effects)
}

/**
 * Check if coordinates are within plot rect
 */
function isWithinPlotRect(
  coords: { x: number; y: number } | null,
  plotRect: { x: number; y: number; width: number; height: number }
): boolean {
  if (!coords) return false
  return (
    coords.x >= plotRect.x &&
    coords.x <= plotRect.x + plotRect.width &&
    coords.y >= plotRect.y &&
    coords.y <= plotRect.y + plotRect.height
  )
}

function buildIndicatorContext(
  svg: SVGSVGElement,
  metadata: RuntimeHoverMetadata
): HoverIndicatorContext {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const seriesYAxis = Object.fromEntries(
    metadata.series.map(series => [series.id, series.yAxis])
  ) as Record<string, 'left' | 'right'>
  return {
    svg,
    scales: metadata.scales,
    plotRect: metadata.plotRect,
    seriesStyles: extendedSvg[SERIES_STYLES_SYMBOL],
    seriesPointShapes: extendedSvg[SERIES_POINT_SHAPES_SYMBOL],
    seriesYAxis,
  }
}

function createHoverEffects(
  svg: SVGSVGElement,
  metadata: RuntimeHoverMetadata,
  indicators: HoverIndicator[],
  tooltipRenderer: TooltipRenderer | null
): HoverEffects {
  return {
    indicators,
    context: buildIndicatorContext(svg, metadata),
    svg,
    tooltipRenderer,
    handles: new Map(),
    keys: new Map(),
  }
}

function resolveDataHover(
  event: PointerEvent,
  svg: SVGSVGElement,
  metadata: RuntimeHoverMetadata,
  resolver: HoverResolver
): HoverResolutionResult {
  const coordinates = getMouseSvgCoordinates(svg, event)
  if (!isWithinPlotRect(coordinates, metadata.plotRect)) return { kind: 'none' }
  return resolver.resolve({
    mouseSvgX: coordinates!.x,
    mouseSvgY: coordinates!.y,
    metadata,
  })
}

/**
 * Attach data-driven hover (POINT, X_AXIS, Y_AXIS modes).
 * Uses pointer events with rAF gating for performance.
 */
export function attachDataHover(
  svg: SVGSVGElement,
  resolver: HoverResolver,
  indicators: HoverIndicator[],
  tooltipRenderer: TooltipRenderer | null,
  metadata: RuntimeHoverMetadata
): void {
  let framePending = false
  const effects = createHoverEffects(svg, metadata, indicators, tooltipRenderer)
  const extendedSvg = svg as ExtendedSVGSVGElement

  const handlePointerMove = (event: PointerEvent) => {
    if (framePending) return
    framePending = true
    requestAnimationFrame(() => {
      framePending = false
      handleMove(event)
    })
  }

  const handleMove = (event: PointerEvent) => {
    const result = resolveDataHover(event, svg, metadata, resolver)
    applyHoverResult(result, event, effects)
  }

  const handlePointerLeave = () => {
    applyHoverResult({ kind: 'none' }, {} as PointerEvent, effects)
  }

  svg.addEventListener('pointermove', handlePointerMove)
  svg.addEventListener('pointerleave', handlePointerLeave)

  extendedSvg[DATA_HOVER_LISTENERS_SYMBOL] = {
    pointermove: handlePointerMove,
    pointerleave: handlePointerLeave,
  }
}

/**
 * Remove all hover listeners (glyph and data-driven) from the SVG.
 * Call before attaching new hover so only one set of listeners is active.
 */
export function detachAllHoverListeners(svg: SVGSVGElement): void {
  const extendedSvg = svg as ExtendedSVGSVGElement

  const glyphRefs = extendedSvg[GLYPH_HOVER_LISTENERS_SYMBOL]
  if (glyphRefs) {
    svg.removeEventListener('pointermove', glyphRefs.pointermove)
    svg.removeEventListener('pointerleave', glyphRefs.pointerleave)
    delete extendedSvg[GLYPH_HOVER_LISTENERS_SYMBOL]
  }

  const dataRefs = extendedSvg[DATA_HOVER_LISTENERS_SYMBOL]
  if (dataRefs) {
    svg.removeEventListener('pointermove', dataRefs.pointermove)
    svg.removeEventListener('pointerleave', dataRefs.pointerleave)
    delete extendedSvg[DATA_HOVER_LISTENERS_SYMBOL]
  }
}

/**
 * Attach glyph-based hover (GLYPH mode).
 * Uses data-driven spatial hit testing: pointer coords + findGlyphAtPoint.
 * Returns true if a point index with glyphs was found or built.
 */
export function attachGlyphHover(
  svg: SVGSVGElement,
  tooltipRenderer: TooltipRenderer | null,
  metadata: RuntimeHoverMetadata,
  indicators: HoverIndicator[]
): boolean {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const pointIndex =
    extendedSvg[POINT_INDEX_SYMBOL] ?? buildPointIndexFromRenderedElements(svg)
  if (pointIndex.size === 0) return false
  extendedSvg[POINT_INDEX_SYMBOL] = pointIndex

  const effects = createHoverEffects(svg, metadata, indicators, tooltipRenderer)

  const handlePointerMove = (event: PointerEvent) => {
    const coords = getMouseSvgCoordinates(svg, event)
    if (!coords) {
      applyHoverResult({ kind: 'none' }, event, effects)
      return
    }

    const hit = findGlyphAtPoint(pointIndex, coords.x, coords.y)
    if (!hit) {
      applyHoverResult({ kind: 'none' }, event, effects)
      return
    }

    const result = resolveGlyphFromElement(hit.element, metadata)
    applyHoverResult(result, event, effects)
  }

  const handlePointerLeave = () => {
    applyHoverResult({ kind: 'none' }, {} as PointerEvent, effects)
  }

  svg.addEventListener('pointermove', handlePointerMove)
  svg.addEventListener('pointerleave', handlePointerLeave)

  extendedSvg[GLYPH_HOVER_LISTENERS_SYMBOL] = {
    pointermove: handlePointerMove,
    pointerleave: handlePointerLeave,
  }

  return true
}
