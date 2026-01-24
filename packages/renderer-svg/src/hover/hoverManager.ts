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
import { DataAttributeName } from '../shared/enums'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import { GLYPH_HOVER_LISTENERS_SYMBOL } from '../shared/symbols'

/**
 * Apply hover result: renders indicators and shows tooltip.
 * Owns lifecycle - prevents indicator leaks with O(1) lookup.
 */
function applyHoverResult(
  result: HoverResolutionResult,
  indicators: HoverIndicator[],
  context: HoverIndicatorContext,
  event: PointerEvent,
  svg: SVGSVGElement,
  tooltipRenderer: TooltipRenderer | null,
  metadata: HoverMetadata,
  previousHandles: Map<string, IndicatorHandle>
): void {
  // Build O(1) lookup map (prevents O(n²) find() calls)
  const indicatorsById = new Map(indicators.map(i => [i.id, i]))

  // Always restore previous indicators (O(1) lookup)
  for (const [id, handle] of previousHandles) {
    indicatorsById.get(id)?.restore(handle)
  }
  previousHandles.clear()

  if (result.kind === 'none') {
    hideTooltip(svg)
    return
  }

  // Render new indicators (if any)
  if (result.kind === 'points') {
    for (const indicator of indicators) {
      const handle = indicator.render(result, context)
      previousHandles.set(indicator.id, handle) // id is required, no collision
    }
  }

  // Show tooltip via adapter (only if tooltipRenderer is provided)
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

  const context: HoverIndicatorContext = {
    svg,
    scales: metadata.scales,
    plotRect: metadata.plotRect,
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
        previousHandles
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
        previousHandles
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
      previousHandles
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
      previousHandles
    )
  }

  svg.addEventListener('pointermove', handlePointerMove)
  svg.addEventListener('pointerleave', handlePointerLeave)
}

/**
 * Attach glyph-based hover (GLYPH mode).
 * Uses event delegation with pointer events.
 * Returns true if glyph elements with tooltip data were found.
 */
export function attachGlyphHover(
  svg: SVGSVGElement,
  tooltipRenderer: TooltipRenderer | null,
  metadata: HoverMetadata,
  indicators: HoverIndicator[]
): boolean {
  const previousHandles = new Map<string, IndicatorHandle>()

  const context: HoverIndicatorContext = {
    svg,
    scales: metadata.scales,
    plotRect: metadata.plotRect,
  }

  // Build selector from enum-backed attribute name
  const selector = `[data-${DataAttributeName.OWLPLOT_SERIES_ID}]`

  // Check if any glyph elements exist
  const hasGlyphElements = svg.querySelectorAll(selector).length > 0

  if (!hasGlyphElements) {
    return false
  }

  const handlePointerMove = (event: PointerEvent) => {
    // Guard against nested SVGs
    const glyph = (event.target as Element | null)?.closest(selector)
    if (!glyph || !svg.contains(glyph)) {
      applyHoverResult(
        { kind: 'none' },
        indicators,
        context,
        event,
        svg,
        tooltipRenderer,
        metadata,
        previousHandles
      )
      return
    }

    // Resolve glyph hover
    const result = resolveGlyphFromElement(glyph, metadata)

    // Apply result
    applyHoverResult(
      result,
      indicators,
      context,
      event,
      svg,
      tooltipRenderer,
      metadata,
      previousHandles
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
      previousHandles
    )
  }

  svg.addEventListener('pointermove', handlePointerMove)
  svg.addEventListener('pointerleave', handlePointerLeave)

  // Store handlers if requested (for cleanup)
  const extendedSvg = svg as ExtendedSVGSVGElement
  extendedSvg[GLYPH_HOVER_LISTENERS_SYMBOL] = {
    pointermove: handlePointerMove,
    pointerleave: handlePointerLeave,
  }

  return true
}
