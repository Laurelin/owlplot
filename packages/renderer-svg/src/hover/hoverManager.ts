import type {
  HoverResolver,
  HoverResolutionResult,
  HoverMetadata,
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

/**
 * Apply hover result: renders indicators and shows tooltip.
 * Owns lifecycle - prevents indicator leaks with O(1) lookup.
 * When an indicator has getKey and nextKey === previousKey, skips restore + re-render
 * so equivalent hover results (e.g. same x-slice) don't thrash animations.
 */
function applyHoverResult(
  result: HoverResolutionResult,
  indicators: HoverIndicator[],
  context: HoverIndicatorContext,
  event: PointerEvent,
  svg: SVGSVGElement,
  tooltipRenderer: TooltipRenderer | null,
  metadata: HoverMetadata,
  previousHandles: Map<string, IndicatorHandle>,
  previousKeys: Map<string, string>
): void {
  if (result.kind === 'none') {
    const indicatorsById = new Map(indicators.map(i => [i.id, i]))
    for (const [id, handle] of previousHandles) {
      indicatorsById.get(id)?.restore(handle)
    }
    previousHandles.clear()
    previousKeys.clear()
    hideTooltip(svg)
    return
  }

  if (result.kind === 'points') {
    for (const indicator of indicators) {
      const nextKey = indicator.getKey?.(result, context) ?? null
      const prevKey = previousKeys.get(indicator.id)
      if (nextKey != null && nextKey === prevKey) {
        continue
      }
      const prevHandle = previousHandles.get(indicator.id)
      if (prevHandle) {
        indicator.restore(prevHandle)
        previousHandles.delete(indicator.id)
        previousKeys.delete(indicator.id)
      }
      const handle = indicator.render(result, context)
      if (handle != null) {
        previousHandles.set(indicator.id, handle)
        previousKeys.set(indicator.id, nextKey ?? '')
      }
    }
  }

  if (tooltipRenderer) {
    showTooltipFromResult(result, event, svg, tooltipRenderer)
  }
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

/**
 * Attach data-driven hover (POINT, X_AXIS, Y_AXIS modes).
 * Uses pointer events with rAF gating for performance.
 */
export function attachDataHover(
  svg: SVGSVGElement,
  resolver: HoverResolver,
  indicators: HoverIndicator[],
  tooltipRenderer: TooltipRenderer | null,
  metadata: HoverMetadata
): void {
  let framePending = false
  const previousHandles = new Map<string, IndicatorHandle>()
  const previousKeys = new Map<string, string>()

  const extendedSvg = svg as ExtendedSVGSVGElement
  const seriesYAxis = Object.fromEntries(
    metadata.series.map(s => [s.id, s.yAxis])
  ) as Record<string, 'left' | 'right'>
  const context: HoverIndicatorContext = {
    svg,
    scales: metadata.scales,
    plotRect: metadata.plotRect,
    seriesStyles: extendedSvg[SERIES_STYLES_SYMBOL],
    seriesPointShapes: extendedSvg[SERIES_POINT_SHAPES_SYMBOL],
    seriesYAxis,
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (framePending) return
    framePending = true
    requestAnimationFrame(() => {
      framePending = false
      handleMove(event)
    })
  }

  const handleMove = (event: PointerEvent) => {
    // Get mouse coords via SVG coordinate transformation
    const coords = getMouseSvgCoordinates(svg, event)
    if (!coords) {
      applyHoverResult(
        { kind: 'none' },
        indicators,
        context,
        event,
        svg,
        tooltipRenderer,
        metadata,
        previousHandles,
        previousKeys
      )
      return
    }

    // Early clamp to plotRect
    if (!isWithinPlotRect(coords, metadata.plotRect)) {
      applyHoverResult(
        { kind: 'none' },
        indicators,
        context,
        event,
        svg,
        tooltipRenderer,
        metadata,
        previousHandles,
        previousKeys
      )
      return
    }

    // Resolve hover
    const result = resolver.resolve({
      mouseSvgX: coords.x,
      mouseSvgY: coords.y,
      metadata,
    })

    // Apply result (renders indicators and tooltip)
    applyHoverResult(
      result,
      indicators,
      context,
      event,
      svg,
      tooltipRenderer,
      metadata,
      previousHandles,
      previousKeys
    )
  }

  const handlePointerLeave = () => {
    applyHoverResult(
      { kind: 'none' },
      indicators,
      context,
      {} as PointerEvent,
      svg,
      tooltipRenderer,
      metadata,
      previousHandles,
      previousKeys
    )
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
  metadata: HoverMetadata,
  indicators: HoverIndicator[]
): boolean {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const pointIndex =
    extendedSvg[POINT_INDEX_SYMBOL] ?? buildPointIndexFromRenderedElements(svg)
  if (pointIndex.size === 0) return false
  extendedSvg[POINT_INDEX_SYMBOL] = pointIndex

  const previousHandles = new Map<string, IndicatorHandle>()
  const previousKeys = new Map<string, string>()

  const seriesYAxis = Object.fromEntries(
    metadata.series.map(s => [s.id, s.yAxis])
  ) as Record<string, 'left' | 'right'>
  const context: HoverIndicatorContext = {
    svg,
    scales: metadata.scales,
    plotRect: metadata.plotRect,
    seriesStyles: extendedSvg[SERIES_STYLES_SYMBOL],
    seriesPointShapes: extendedSvg[SERIES_POINT_SHAPES_SYMBOL],
    seriesYAxis,
  }

  const handlePointerMove = (event: PointerEvent) => {
    const coords = getMouseSvgCoordinates(svg, event)
    if (!coords) {
      applyHoverResult(
        { kind: 'none' },
        indicators,
        context,
        event,
        svg,
        tooltipRenderer,
        metadata,
        previousHandles,
        previousKeys
      )
      return
    }

    const hit = findGlyphAtPoint(pointIndex, coords.x, coords.y)
    if (!hit) {
      applyHoverResult(
        { kind: 'none' },
        indicators,
        context,
        event,
        svg,
        tooltipRenderer,
        metadata,
        previousHandles,
        previousKeys
      )
      return
    }

    const result = resolveGlyphFromElement(hit.element, metadata)
    applyHoverResult(
      result,
      indicators,
      context,
      event,
      svg,
      tooltipRenderer,
      metadata,
      previousHandles,
      previousKeys
    )
  }

  const handlePointerLeave = () => {
    applyHoverResult(
      { kind: 'none' },
      indicators,
      context,
      {} as PointerEvent,
      svg,
      tooltipRenderer,
      metadata,
      previousHandles,
      previousKeys
    )
  }

  svg.addEventListener('pointermove', handlePointerMove)
  svg.addEventListener('pointerleave', handlePointerLeave)

  extendedSvg[GLYPH_HOVER_LISTENERS_SYMBOL] = {
    pointermove: handlePointerMove,
    pointerleave: handlePointerLeave,
  }

  return true
}
