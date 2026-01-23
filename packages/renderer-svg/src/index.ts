import type {
  SceneNode,
  SceneStyle,
  TooltipDatum,
  HoverSeries,
} from '@owlplot/core'
export { renderSvgScene }
export type { TooltipDatum }

export interface TooltipRenderer {
  render(datum: TooltipDatum): HTMLElement
  destroy?(el: HTMLElement): void
}

export type HoverMode =
  | { kind: 'node' } // Default: hover individual points
  | { kind: 'x-axis' } // New: hover anywhere, show all series at x-value
  | { kind: 'y-axis' } // Future: hover anywhere, show all series at y-value

export type HoverIndicator =
  | { kind: 'none' } // Default: no visual indicator
  | {
      kind: 'x-line'
      style?: {
        stroke?: string
        strokeWidth?: number
        strokeDasharray?: string
      }
    }
  | {
      kind: 'y-line'
      style?: {
        stroke?: string
        strokeWidth?: number
        strokeDasharray?: string
      }
    }
  | {
      kind: 'point-emphasis'
      radius?: number // Default: 5
      animation?: {
        durationMs?: number // Default: 120
        easing?: 'linear' | 'ease-out' // Default: 'ease-out'
      }
    }

const SVG_NS = 'http://www.w3.org/2000/svg'

function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return String(value)
    }
    return value.toFixed(2)
  }
  return String(value)
}

// Contract: points must be sorted by x. Core guarantees this.
function findNearestPointByX(
  points: ReadonlyArray<{ x: number; y: number }>, // Already sorted, already filtered
  targetX: number
): { x: number; y: number } | null {
  if (points.length === 0) return null

  // Binary search for nearest (no sorting - input is guaranteed sorted)
  let left = 0
  let right = points.length - 1

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    const midPoint = points[mid]
    if (!midPoint) break
    if (midPoint.x < targetX) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  // Check which is closer: left or left-1
  if (left > 0 && left < points.length) {
    const distLeft = Math.abs(points[left]!.x - targetX)
    const distPrev = Math.abs(points[left - 1]!.x - targetX)
    if (distPrev < distLeft) {
      return points[left - 1]!
    }
  }

  return points[left]!
}

const defaultTooltipRenderer: TooltipRenderer = {
  render(datum) {
    const el = document.createElement('div')
    el.className = 'owlplot-tooltip'

    // Apply default styles
    el.style.background = '#ffffff'
    el.style.border = '1px solid #e0e0e0'
    el.style.borderRadius = '4px'
    el.style.padding = '8px'
    el.style.fontSize = '11px'
    el.style.color = '#333'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    el.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    el.style.lineHeight = '1.4'

    let html = ''

    if (datum.kind === 'x-axis') {
      // Special handling for x-axis hover
      html += `<div class="owlplot-tooltip-label" style="font-weight: 600; margin-bottom: 4px;">x: ${formatValue(datum.values.x)}</div>`
      // Show each series value (may be empty for charts without point geometry)
      for (const [key, value] of Object.entries(datum.values)) {
        if (key === 'x') continue
        html += `<div class="owlplot-tooltip-value" style="margin-bottom: 2px;">${key}: ${formatValue(value)}</div>`
      }
      // If no series data, tooltip still shows x value (data resolution, not geometry)
    } else {
      // Existing handling for other kinds
      // Label if present
      if (datum.label) {
        html += `<div class="owlplot-tooltip-label" style="font-weight: 600; margin-bottom: 4px;">${datum.label}</div>`
      }

      // Series ID if present
      if (datum.seriesId) {
        html += `<div class="owlplot-tooltip-series" style="margin-bottom: 2px;">series: ${datum.seriesId}</div>`
      }

      // Iterate over all values
      for (const [key, value] of Object.entries(datum.values)) {
        html += `<div class="owlplot-tooltip-value" style="margin-bottom: 2px;">${key}: ${formatValue(value)}</div>`
      }
    }

    el.innerHTML = html
    return el
  },
}

function setStyle(el: Element, style: SceneStyle | undefined) {
  if (!style) return
  for (const [key, val] of Object.entries(style)) {
    if (val == null) continue

    // Special handling for fontSizePx: convert to font-size with "px" unit
    if (key === 'fontSizePx') {
      el.setAttribute('font-size', `${val}px`)
      continue
    }

    const attr = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    el.setAttribute(attr, String(val))
  }
}

function createElement(tag: string): SVGElement {
  return document.createElementNS(SVG_NS, tag)
}

function appendNode(node: SceneNode, parent: SVGElement) {
  let el: SVGElement | null = null

  switch (node.kind) {
    case 'group':
      el = createElement('g')
      if (node.transform) el.setAttribute('transform', node.transform)
      node.children.forEach((child: SceneNode) => appendNode(child, el!))
      break
    case 'path':
      el = createElement('path')
      el.setAttribute('d', node.d)
      break
    case 'rect':
      el = createElement('rect')
      el.setAttribute('x', String(node.x))
      el.setAttribute('y', String(node.y))
      el.setAttribute('width', String(node.width))
      el.setAttribute('height', String(node.height))
      break
    case 'circle':
      el = createElement('circle')
      el.setAttribute('cx', String(node.cx))
      el.setAttribute('cy', String(node.cy))
      el.setAttribute('r', String(node.r))

      // Stamp domain coordinates as data attributes (future-proof for non-linear scales)
      if (node.metadata?.tooltip) {
        const datum = node.metadata.tooltip
        if (datum.kind === 'point' && datum.seriesId) {
          el.dataset.owlplotSeriesId = datum.seriesId
          if (typeof datum.values.x === 'number') {
            el.dataset.owlplotX = String(datum.values.x)
          }
          if (typeof datum.values.y === 'number') {
            el.dataset.owlplotY = String(datum.values.y)
          }
        }
      }
      break
    case 'text':
      el = createElement('text')
      el.setAttribute('x', String(node.x))
      el.setAttribute('y', String(node.y))
      el.textContent = node.text
      if (node.textAnchor) el.setAttribute('text-anchor', node.textAnchor)
      if (node.dominantBaseline)
        el.setAttribute('dominant-baseline', node.dominantBaseline)
      break
  }

  if (!el) return
  el.setAttribute('id', node.id)
  setStyle(el, node.style)

  // Store tooltip datum on element if present
  if (node.metadata?.tooltip) {
    ;(el as any)[TOOLTIP_DATUM_SYMBOL] = node.metadata.tooltip
  }

  parent.appendChild(el)
}

function clearSvg(svg: SVGSVGElement) {
  while (svg.firstChild) svg.removeChild(svg.firstChild)
}

// Tooltip container cache per SVG
const TOOLTIP_CONTAINER_SYMBOL = Symbol('owlplot-tooltip-container')
const TOOLTIP_ELEMENT_SYMBOL = Symbol('owlplot-tooltip-element')
const TOOLTIP_RENDERER_SYMBOL = Symbol('owlplot-tooltip-renderer')
const TOOLTIP_DATUM_SYMBOL = Symbol('owlplot-tooltip-datum')
const POINT_INDEX_SYMBOL = Symbol('owlplot-point-index')
const HOVER_LINE_SYMBOL = Symbol('owlplot-hover-line')
const X_AXIS_HOVER_LISTENERS_SYMBOL = Symbol('owlplot-x-axis-hover-listeners')
const NODE_HOVER_LISTENERS_SYMBOL = Symbol('owlplot-node-hover-listeners')

type HoverPointRef = {
  element: SVGCircleElement
  seriesId: string
  x: number // Domain x coordinate (from data attribute)
  y: number // Domain y coordinate (from data attribute)
}

function getOrCreateTooltipContainer(svg: SVGSVGElement): HTMLElement {
  const existing = (svg as any)[TOOLTIP_CONTAINER_SYMBOL] as
    | HTMLElement
    | undefined
  if (existing && document.body.contains(existing)) {
    return existing
  }

  const container = document.createElement('div')
  container.id = 'owlplot-tooltip'
  container.style.position = 'absolute'
  container.style.pointerEvents = 'none'
  container.style.zIndex = '1000'
  container.style.display = 'none'
  document.body.appendChild(container)
  ;(svg as any)[TOOLTIP_CONTAINER_SYMBOL] = container
  return container
}

function calculateTooltipPosition(
  event: MouseEvent,
  tooltipEl: HTMLElement,
  svg: SVGSVGElement
): { x: number; y: number } {
  const offset = 8
  const margin = 8
  const tooltipWidth = tooltipEl.offsetWidth
  const tooltipHeight = tooltipEl.offsetHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let x = event.clientX + offset
  let y = event.clientY - tooltipHeight - offset

  // Flip to below if too close to top
  if (y < margin) {
    y = event.clientY + offset
  }

  // Flip to left if too close to right edge
  if (x + tooltipWidth > viewportWidth - margin) {
    x = event.clientX - tooltipWidth - offset
  }

  // Ensure minimum margin from left edge
  if (x < margin) {
    x = margin
  }

  // Ensure minimum margin from bottom edge
  if (y + tooltipHeight > viewportHeight - margin) {
    y = viewportHeight - tooltipHeight - margin
  }

  return { x, y }
}

function hideTooltip(svg: SVGSVGElement) {
  const container = (svg as any)[TOOLTIP_CONTAINER_SYMBOL] as
    | HTMLElement
    | undefined
  const tooltipEl = (svg as any)[TOOLTIP_ELEMENT_SYMBOL] as
    | HTMLElement
    | undefined
  const renderer = (svg as any)[TOOLTIP_RENDERER_SYMBOL] as
    | TooltipRenderer
    | undefined

  if (container) {
    container.style.display = 'none'
  }

  if (tooltipEl && renderer?.destroy) {
    renderer.destroy(tooltipEl)
  }

  ;(svg as any)[TOOLTIP_ELEMENT_SYMBOL] = undefined
}

function showTooltip(
  datum: TooltipDatum,
  event: MouseEvent,
  svg: SVGSVGElement,
  renderer: TooltipRenderer
) {
  // Guard against empty datum
  if (!Object.keys(datum.values).length && !datum.label && !datum.seriesId) {
    return
  }

  // Destroy previous tooltip (invariant: at most one mounted tooltip per SVG)
  hideTooltip(svg)

  const container = getOrCreateTooltipContainer(svg)
  const tooltipEl = renderer.render(datum)

  container.innerHTML = ''
  container.appendChild(tooltipEl)
  ;(svg as any)[TOOLTIP_ELEMENT_SYMBOL] = tooltipEl
  ;(svg as any)[TOOLTIP_RENDERER_SYMBOL] = renderer

  // Position tooltip
  const { x, y } = calculateTooltipPosition(event, tooltipEl, svg)
  container.style.left = `${x}px`
  container.style.top = `${y}px`
  container.style.display = 'block'
}

function updateTooltipPosition(event: MouseEvent, svg: SVGSVGElement) {
  const container = (svg as any)[TOOLTIP_CONTAINER_SYMBOL] as
    | HTMLElement
    | undefined
  const tooltipEl = (svg as any)[TOOLTIP_ELEMENT_SYMBOL] as
    | HTMLElement
    | undefined

  if (!container || !tooltipEl || container.style.display === 'none') {
    return
  }

  const { x, y } = calculateTooltipPosition(event, tooltipEl, svg)
  container.style.left = `${x}px`
  container.style.top = `${y}px`
}

// Build point index after rendering completes
// Reads domain coords from data attributes (stamped during render)
function buildPointIndexFromRenderedElements(
  svg: SVGSVGElement
): Map<string, HoverPointRef[]> {
  const index = new Map<string, HoverPointRef[]>()

  // Find all circle elements with point data attributes
  const circles = svg.querySelectorAll('circle[data-owlplot-series-id]')
  circles.forEach(circle => {
    const el = circle as SVGCircleElement
    const seriesId = el.dataset.owlplotSeriesId
    const domainX = parseFloat(el.dataset.owlplotX || '')
    const domainY = parseFloat(el.dataset.owlplotY || '')

    if (!seriesId || isNaN(domainX) || isNaN(domainY)) return

    if (!index.has(seriesId)) {
      index.set(seriesId, [])
    }
    index.get(seriesId)!.push({
      element: el,
      seriesId,
      x: domainX,
      y: domainY,
    })
  })

  // Sort each series by x for efficient binary search (one-time cost)
  for (const refs of index.values()) {
    refs.sort((a, b) => a.x - b.x)
  }

  return index
}

type NodeHoverListenerRef = {
  element: SVGElement
  handlers: {
    mouseenter: (event: MouseEvent) => void
    mousemove: (event: MouseEvent) => void
    mouseleave: () => void
  }
}

function removeNodeHoverListeners(svg: SVGSVGElement) {
  const listeners = (svg as any)[NODE_HOVER_LISTENERS_SYMBOL] as
    | NodeHoverListenerRef[]
    | undefined

  if (!listeners) return

  for (const { element, handlers } of listeners) {
    element.removeEventListener('mouseenter', handlers.mouseenter)
    element.removeEventListener('mousemove', handlers.mousemove)
    element.removeEventListener('mouseleave', handlers.mouseleave)
  }

  ;(svg as any)[NODE_HOVER_LISTENERS_SYMBOL] = undefined
}

function attachTooltipListeners(svg: SVGSVGElement, renderer: TooltipRenderer) {
  // Remove any existing listeners first
  removeNodeHoverListeners(svg)

  // Find all nodes with tooltip datum stored on them
  const allNodes = svg.querySelectorAll('*')
  const listenerRefs: NodeHoverListenerRef[] = []

  allNodes.forEach(node => {
    const svgNode = node as SVGElement
    const datum = (svgNode as any)[TOOLTIP_DATUM_SYMBOL] as
      | TooltipDatum
      | undefined

    if (!datum) return

    const handleMouseEnter = (event: MouseEvent) => {
      showTooltip(datum, event, svg, renderer)
    }

    const handleMouseMove = (event: MouseEvent) => {
      updateTooltipPosition(event, svg)
    }

    const handleMouseLeave = () => {
      hideTooltip(svg)
    }

    svgNode.addEventListener('mouseenter', handleMouseEnter)
    svgNode.addEventListener('mousemove', handleMouseMove)
    svgNode.addEventListener('mouseleave', handleMouseLeave)

    listenerRefs.push({
      element: svgNode,
      handlers: {
        mouseenter: handleMouseEnter,
        mousemove: handleMouseMove,
        mouseleave: handleMouseLeave,
      },
    })
  })

  // Store listener references for cleanup
  ;(svg as any)[NODE_HOVER_LISTENERS_SYMBOL] = listenerRefs
}

type XAxisHoverResult = {
  domainX: number
  clampedSvgX: number // Clamped SVG x position (reuse for indicator positioning)
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>
  tooltipDatum: TooltipDatum
} | null

function resolveXAxisHover(
  event: MouseEvent,
  svg: SVGSVGElement,
  svgRect: DOMRect,
  hoverMetadata: {
    xInvert: (px: number) => number
    plotRect: { x: number; y: number; width: number; height: number }
    xDomain: [number, number]
    series: HoverSeries[] // Type-safe: uses HoverSeries from core
  }
): XAxisHoverResult | null {
  // Convert mouse position to SVG coordinates
  const svgX = event.clientX - svgRect.left
  const svgY = event.clientY - svgRect.top

  // Check if mouse is within plot rect
  if (
    svgX < hoverMetadata.plotRect.x ||
    svgX > hoverMetadata.plotRect.x + hoverMetadata.plotRect.width ||
    svgY < hoverMetadata.plotRect.y ||
    svgY > hoverMetadata.plotRect.y + hoverMetadata.plotRect.height
  ) {
    return null
  }

  // Clamp svgX to plot rect bounds once (reuse everywhere)
  const clampedSvgX = Math.max(
    hoverMetadata.plotRect.x,
    Math.min(hoverMetadata.plotRect.x + hoverMetadata.plotRect.width, svgX)
  )

  // Invert scale to get domain x (using clamped position)
  const domainX = hoverMetadata.xInvert(clampedSvgX)

  // Clamp to domain bounds
  const [xMin, xMax] = hoverMetadata.xDomain
  const clampedX = Math.max(xMin, Math.min(xMax, domainX))

  // Find nearest point for each series
  const seriesData: Record<string, number> = {}
  const nearestPoints: Array<{
    seriesId: string
    point: { x: number; y: number }
  }> = []

  // Use pre-sorted points from hoverMetadata (NO per-hover sorting/filtering)
  // Core provides sortedPoints array that is already filtered and sorted by x
  // Note: x-axis hover resolves *data*, not geometry. Tooltip can exist even if
  // no points exist (e.g., future bar/area charts without point geometry).
  for (const series of hoverMetadata.series) {
    // Type-safe: series is HoverSeries with sortedPoints
    if (!series.sortedPoints || series.sortedPoints.length === 0) continue

    const nearest = findNearestPointByX(series.sortedPoints, clampedX)
    if (nearest) {
      seriesData[series.id] = nearest.y
      nearestPoints.push({ seriesId: series.id, point: nearest })
    }
  }

  // Build synthetic tooltip datum
  // CRITICAL: Allow tooltip even if no points found (just show x value)
  // This maintains the invariant: x-axis hover resolves *data*, not geometry
  // Future bar/area charts without point geometry will thank you
  return {
    domainX: clampedX,
    clampedSvgX, // Return clamped position for reuse in indicator
    nearestPoints,
    tooltipDatum: {
      kind: 'x-axis',
      values: {
        x: clampedX,
        ...seriesData, // May be empty - tooltip still shows x value
      },
    },
  }
}

// X-line indicator
function getOrCreateHoverLine(svg: SVGSVGElement): SVGLineElement {
  const existing = (svg as any)[HOVER_LINE_SYMBOL] as SVGLineElement | undefined
  if (existing && svg.contains(existing)) {
    return existing
  }

  const line = document.createElementNS(SVG_NS, 'line')
  line.style.stroke = '#999'
  line.style.strokeWidth = '1'
  line.style.strokeDasharray = '4,4'
  line.style.pointerEvents = 'none'
  line.style.display = 'none'
  svg.appendChild(line)
  ;(svg as any)[HOVER_LINE_SYMBOL] = line
  return line
}

function updateXLine(
  svg: SVGSVGElement,
  svgX: number,
  plotRect: { x: number; y: number; width: number; height: number },
  style?: { stroke?: string; strokeWidth?: number; strokeDasharray?: string }
) {
  const line = getOrCreateHoverLine(svg)

  // Apply custom style if provided
  if (style) {
    if (style.stroke) line.style.stroke = style.stroke
    if (style.strokeWidth) line.style.strokeWidth = String(style.strokeWidth)
    if (style.strokeDasharray)
      line.style.strokeDasharray = style.strokeDasharray
  }

  // Clamp x to plot rect (should already be clamped, but defensive)
  const clampedX = Math.max(
    plotRect.x,
    Math.min(plotRect.x + plotRect.width, svgX)
  )

  line.setAttribute('x1', String(clampedX))
  line.setAttribute('y1', String(plotRect.y))
  line.setAttribute('x2', String(clampedX))
  line.setAttribute('y2', String(plotRect.y + plotRect.height))
  line.style.display = 'block'
}

function findNearestRefByX(
  refs: HoverPointRef[],
  targetX: number
): HoverPointRef | null {
  if (refs.length === 0) return null

  // Binary search for nearest
  let left = 0
  let right = refs.length - 1

  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    const midRef = refs[mid]
    if (!midRef) break
    if (midRef.x < targetX) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  // Check which is closer: left or left-1
  if (left > 0 && left < refs.length) {
    const distLeft = Math.abs(refs[left]!.x - targetX)
    const distPrev = Math.abs(refs[left - 1]!.x - targetX)
    if (distPrev < distLeft) {
      return refs[left - 1]!
    }
  }

  return refs[left]!
}

// Point emphasis indicator - uses point index, no DOM queries
function emphasizePoints(
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>,
  pointIndex: Map<string, HoverPointRef[]>,
  radius: number = 5,
  animation?: { durationMs?: number; easing?: 'linear' | 'ease-out' }
): Array<{ element: SVGElement; originalRadius: number }> {
  const emphasized: Array<{ element: SVGElement; originalRadius: number }> = []

  for (const { seriesId, point } of nearestPoints) {
    const refs = pointIndex.get(seriesId)
    if (!refs) continue

    // Find nearest ref by x coordinate (binary search)
    const nearestRef = findNearestRefByX(refs, point.x)
    if (!nearestRef) continue

    const circle = nearestRef.element
    const originalRadius = parseFloat(circle.getAttribute('r') || '2.5')
    emphasized.push({ element: circle, originalRadius })

    // Update radius (with optional animation)
    if (animation?.durationMs) {
      // Clean up any existing animate elements to avoid accumulation
      circle
        .querySelectorAll('animate[attributeName="r"]')
        .forEach(n => n.remove())

      // Use SVG animate element for declarative animation
      const animate = document.createElementNS(SVG_NS, 'animate')
      animate.setAttribute('attributeName', 'r')
      animate.setAttribute('from', String(originalRadius))
      animate.setAttribute('to', String(radius))
      animate.setAttribute('dur', `${animation.durationMs}ms`)
      animate.setAttribute('fill', 'freeze')
      circle.appendChild(animate)
      animate.beginElement()
    } else {
      circle.setAttribute('r', String(radius))
    }
  }

  return emphasized
}

function restorePointEmphasis(
  emphasized: Array<{ element: SVGElement; originalRadius: number }>
) {
  for (const { element, originalRadius } of emphasized) {
    const circle = element as SVGCircleElement

    // Clean up any animate elements for idempotence
    circle
      .querySelectorAll('animate[attributeName="r"]')
      .forEach(n => n.remove())

    circle.setAttribute('r', String(originalRadius))
  }
}

function hideHoverIndicator(svg: SVGSVGElement, indicator: HoverIndicator) {
  if (indicator.kind === 'x-line' || indicator.kind === 'y-line') {
    const line = (svg as any)[HOVER_LINE_SYMBOL] as SVGLineElement | undefined
    if (line) {
      line.style.display = 'none'
    }
  }
  // Point emphasis is restored separately via restorePointEmphasis
}

function applyHoverIndicator(
  svg: SVGSVGElement,
  indicator: HoverIndicator,
  hoverResult: XAxisHoverResult,
  clampedSvgX: number, // Use clamped position (passed from resolveXAxisHover)
  hoverMetadata: {
    plotRect: { x: number; y: number; width: number; height: number }
  },
  pointIndex: Map<string, HoverPointRef[]>
): Array<{ element: SVGElement; originalRadius: number }> {
  if (indicator.kind === 'none' || !hoverResult) {
    return []
  }

  if (indicator.kind === 'x-line') {
    updateXLine(svg, clampedSvgX, hoverMetadata.plotRect, indicator.style)
    return []
  }

  if (indicator.kind === 'point-emphasis') {
    return emphasizePoints(
      hoverResult.nearestPoints,
      pointIndex,
      indicator.radius ?? 5,
      indicator.animation
    )
  }

  return []
}

function cleanupHover(
  svg: SVGSVGElement,
  indicator: HoverIndicator,
  emphasizedPoints: Array<{ element: SVGElement; originalRadius: number }>
) {
  hideTooltip(svg)
  hideHoverIndicator(svg, indicator)
  restorePointEmphasis(emphasizedPoints)
}

type XAxisHoverListenerRef = {
  mousemove: (event: MouseEvent) => void
  mouseleave: () => void
}

function removeXAxisHoverListeners(svg: SVGSVGElement) {
  const listeners = (svg as any)[X_AXIS_HOVER_LISTENERS_SYMBOL] as
    | XAxisHoverListenerRef
    | undefined

  if (!listeners) return

  svg.removeEventListener('mousemove', listeners.mousemove)
  svg.removeEventListener('mouseleave', listeners.mouseleave)
  ;(svg as any)[X_AXIS_HOVER_LISTENERS_SYMBOL] = undefined
}

// Main function - x-axis hover listeners
function attachXAxisHoverListeners(
  svg: SVGSVGElement,
  renderer: TooltipRenderer,
  hoverMetadata: {
    xInvert: (px: number) => number
    scales: { x: (v: number) => number; y: (v: number) => number }
    plotRect: { x: number; y: number; width: number; height: number }
    xDomain: [number, number]
    series: HoverSeries[] // Type-safe: uses HoverSeries from core
  },
  indicator: HoverIndicator
) {
  // Remove any existing listeners first
  removeXAxisHoverListeners(svg)

  const pointIndex = (svg as any)[POINT_INDEX_SYMBOL] as
    | Map<string, HoverPointRef[]>
    | undefined
  if (!pointIndex) {
    console.warn('Point index not found - point emphasis will not work')
  }

  let emphasizedPoints: Array<{ element: SVGElement; originalRadius: number }> =
    []

  const handleMouseMove = (event: MouseEvent) => {
    // Get fresh svgRect on each mousemove to handle scrolling/resizing/repositioning
    const svgRect = svg.getBoundingClientRect()
    const hoverResult = resolveXAxisHover(event, svg, svgRect, hoverMetadata)

    if (!hoverResult) {
      cleanupHover(svg, indicator, emphasizedPoints)
      emphasizedPoints = []
      return
    }

    // Restore previous point emphasis
    restorePointEmphasis(emphasizedPoints)

    // Show tooltip (even if no series data - tooltip shows x value)
    showTooltip(hoverResult.tooltipDatum, event, svg, renderer)

    // Apply indicator (using clamped position from resolveXAxisHover)
    emphasizedPoints = applyHoverIndicator(
      svg,
      indicator,
      hoverResult,
      hoverResult.clampedSvgX, // Reuse clamped position from resolution
      hoverMetadata,
      pointIndex ?? new Map()
    )
  }

  const handleMouseLeave = () => {
    cleanupHover(svg, indicator, emphasizedPoints)
    emphasizedPoints = []
  }

  svg.addEventListener('mousemove', handleMouseMove)
  svg.addEventListener('mouseleave', handleMouseLeave)

  // Store listener references for cleanup
  ;(svg as any)[X_AXIS_HOVER_LISTENERS_SYMBOL] = {
    mousemove: handleMouseMove,
    mouseleave: handleMouseLeave,
  }
}

function renderSvgScene(
  scene: SceneNode,
  svg: SVGSVGElement,
  options?: {
    tooltip?: TooltipRenderer
    hoverMode?: HoverMode
    hoverIndicator?: HoverIndicator
  }
): void {
  // 1. Cleanup previous state - remove all event listeners
  removeXAxisHoverListeners(svg)
  removeNodeHoverListeners(svg)
  hideTooltip(svg)
  hideHoverIndicator(svg, options?.hoverIndicator ?? { kind: 'none' })

  // 2. Clear and render scene
  clearSvg(svg)
  appendNode(scene, svg)

  // 3. Resolve hover mode and indicator (with explicit defaults)
  const hoverMode = options?.hoverMode ?? { kind: 'node' }
  const resolvedHoverIndicator =
    options?.hoverIndicator ??
    (hoverMode.kind === 'x-axis' ? { kind: 'x-line' } : { kind: 'none' })

  // 4. Build point index if needed (only for point-emphasis indicator)
  if (
    hoverMode.kind === 'x-axis' &&
    resolvedHoverIndicator.kind === 'point-emphasis'
  ) {
    const pointIndex = buildPointIndexFromRenderedElements(svg)
    ;(svg as any)[POINT_INDEX_SYMBOL] = pointIndex
  }

  // 5. Attach hover listeners
  const tooltipRenderer = options?.tooltip ?? defaultTooltipRenderer

  if (hoverMode.kind === 'node') {
    // Existing node hover mode
    attachTooltipListeners(svg, tooltipRenderer)
  } else if (hoverMode.kind === 'x-axis') {
    // New x-axis hover mode
    // IMPORTANT INVARIANT: Node-hover tooltips are disabled in x-axis mode.
    // There is exactly one hover authority at a time.
    // This prevents conflicting tooltips and ensures clean UX.
    const hoverMetadata = scene.metadata?.hover
    if (
      hoverMetadata &&
      hoverMetadata !== null &&
      typeof hoverMetadata === 'object' &&
      'xInvert' in hoverMetadata
    ) {
      attachXAxisHoverListeners(
        svg,
        tooltipRenderer,
        hoverMetadata as any,
        resolvedHoverIndicator
      )
    }
  }
}
