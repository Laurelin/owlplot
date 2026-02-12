import {
  SceneNodeKind,
  type AnyPaint,
  type LegendMetadata,
  type SceneNode,
} from '@owlplot/core'
import { createSvgElement } from './svgDom'
import {
  DATA_SERIES_ID,
  DATA_LEGEND_ITEM_SERIES_ID,
} from '../shared/dataAttributes'
import { SceneMetadataKey, SvgAttributeName } from '../shared/enums'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  BASE_SVG_HEIGHT_SYMBOL,
  BASE_SVG_WIDTH_SYMBOL,
  EXTERNAL_LEGEND_ELEMENT_SYMBOL,
} from '../shared/symbols'
import {
  computeLegendLayout,
  type LegendAnchor,
  type LegendDirection,
  type LegendOverlapPolicy,
  type LegendPlacement,
} from './computeLegendLayout'

export type LegendOptions = {
  placement?: LegendPlacement
  anchor?: LegendAnchor
  direction?: LegendDirection
  collision?: 'avoid-frame' | 'auto-anchor'
  overlapPolicy?: LegendOverlapPolicy
  offsetX?: number
  offsetY?: number
  padding?: number
  axisToLegendGap?: number
  legendRowHeightPx?: number
  textOpticalOffsetPx?: number
  background?:
    | boolean
    | {
        paddingPx?: number
        borderRadiusPx?: number
        opacity?: number
      }
  typography?: {
    fontSizePx?: number
    lineHeightPx?: number
    fontFamily?: string
    fontWeight?: string | number
    letterSpacingPx?: number
  }
}

const DEFAULT_OPTIONS: Required<LegendOptions> = {
  placement: 'outside',
  anchor: 'bottom-center',
  direction: 'row',
  collision: 'avoid-frame',
  overlapPolicy: 'avoid-frame',
  offsetX: 0,
  offsetY: 0,
  padding: 10,
  axisToLegendGap: 8,
  legendRowHeightPx: 18,
  textOpticalOffsetPx: -0.5,
  background: false,
  typography: {
    fontSizePx: 14,
    lineHeightPx: 17,
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 400,
    letterSpacingPx: 0,
  },
}

const SWATCH_EM = 0.85
const SWATCH_MIN_PX = 8
const SWATCH_MAX_PX = 16
const SWATCH_TO_LABEL_GAP = 8
const ITEM_GAP = 28
const DEFAULT_AXIS_TO_LEGEND_GAP_WITH_AXIS = 14
const DEFAULT_AXIS_TO_LEGEND_GAP_NO_AXIS = 8
let hasWarnedOutsideLegendNoHost = false

type Rect = { x: number; y: number; width: number; height: number }

function paintToSwatchColor(paint: AnyPaint): string {
  if (paint.type === 'solid') return paint.color
  if ((paint.type === 'linear' || paint.type === 'radial') && paint.stops[0]) {
    return paint.stops[0].color
  }
  return 'currentColor'
}

function getLegendMetadata(scene: SceneNode): LegendMetadata | undefined {
  const metadata = scene.metadata?.[SceneMetadataKey.LEGEND] as
    | LegendMetadata
    | undefined
  if (
    !metadata ||
    !Array.isArray(metadata.entries) ||
    metadata.entries.length === 0
  ) {
    return undefined
  }
  return metadata
}

function collectSeriesElements(
  svg: SVGSVGElement,
  seriesId: string
): SVGElement[] {
  const elements: SVGElement[] = []

  const linePath = svg.querySelector(
    `[${SvgAttributeName.ID}="series:${seriesId}"]`
  ) as SVGElement | null
  if (linePath) elements.push(linePath)

  const bySeries = Array.from(
    svg.querySelectorAll(`[${DATA_SERIES_ID}]`)
  ).filter(el => el.getAttribute(DATA_SERIES_ID) === seriesId) as SVGElement[]
  elements.push(...bySeries)

  return elements
}

export function applySeriesVisibility(
  svg: SVGSVGElement,
  seriesId: string,
  hiddenSeriesIds: ReadonlySet<string>
): void {
  const hidden = hiddenSeriesIds.has(seriesId)
  const elements = collectSeriesElements(svg, seriesId)
  for (const element of elements) {
    element.style.display = hidden ? 'none' : ''
  }
}

function readSvgDimension(
  svg: SVGSVGElement,
  key: 'width' | 'height',
  viewBoxIndex: number
): number {
  const attrValue = Number.parseFloat(svg.getAttribute(key) ?? '')
  if (Number.isFinite(attrValue)) return attrValue

  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox.trim().split(/\s+/)
    const parsed = Number.parseFloat(parts[viewBoxIndex] ?? '')
    if (Number.isFinite(parsed)) return parsed
  }

  return 0
}

function ensureBaseSvgSize(svg: SVGSVGElement): {
  width: number
  height: number
} {
  const extended = svg as ExtendedSVGSVGElement

  if (extended[BASE_SVG_WIDTH_SYMBOL] == null) {
    extended[BASE_SVG_WIDTH_SYMBOL] = readSvgDimension(svg, 'width', 2)
  }
  if (extended[BASE_SVG_HEIGHT_SYMBOL] == null) {
    extended[BASE_SVG_HEIGHT_SYMBOL] = readSvgDimension(svg, 'height', 3)
  }

  return {
    width: extended[BASE_SVG_WIDTH_SYMBOL]!,
    height: extended[BASE_SVG_HEIGHT_SYMBOL]!,
  }
}

function setSvgSize(svg: SVGSVGElement, width: number, height: number): void {
  if (Number.isFinite(width) && width > 0) {
    svg.setAttribute('width', String(width))
  }
  if (Number.isFinite(height) && height > 0) {
    svg.setAttribute('height', String(height))
  }
}

export function restoreLegendLayout(svg: SVGSVGElement): void {
  const base = ensureBaseSvgSize(svg)
  setSvgSize(svg, base.width, base.height)
}

function clearExternalLegend(svg: SVGSVGElement): void {
  const extended = svg as ExtendedSVGSVGElement
  const external = extended[EXTERNAL_LEGEND_ELEMENT_SYMBOL]
  if (external) {
    const host = external.parentElement as HTMLElement | null
    if (host && external.dataset.owlplotHostStylesSaved === 'true') {
      host.style.display = external.dataset.owlplotHostDisplay ?? ''
      host.style.alignItems = external.dataset.owlplotHostAlignItems ?? ''
      host.style.justifyContent =
        external.dataset.owlplotHostJustifyContent ?? ''
      host.style.columnGap = external.dataset.owlplotHostColumnGap ?? ''
      host.style.rowGap = external.dataset.owlplotHostRowGap ?? ''
      host.style.flexDirection = external.dataset.owlplotHostFlexDirection ?? ''
    }
    external.remove()
    delete extended[EXTERNAL_LEGEND_ELEMENT_SYMBOL]
  }
}

export function clearLegendArtifacts(svg: SVGSVGElement): void {
  clearExternalLegend(svg)
  restoreLegendLayout(svg)
}

function estimateLabelWidthPx(label: string): number {
  return Math.max(12, Math.round(label.length * 8))
}

function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function readDataBounds(svg: SVGSVGElement): Rect | undefined {
  const candidates = Array.from(
    svg.querySelectorAll(
      `[${SvgAttributeName.ID}^="series:"], [${DATA_SERIES_ID}]`
    )
  )

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const element of candidates) {
    if (typeof (element as SVGGraphicsElement).getBBox !== 'function') continue
    try {
      const box = (element as SVGGraphicsElement).getBBox()
      if (!Number.isFinite(box.width) || !Number.isFinite(box.height)) continue
      minX = Math.min(minX, box.x)
      minY = Math.min(minY, box.y)
      maxX = Math.max(maxX, box.x + box.width)
      maxY = Math.max(maxY, box.y + box.height)
    } catch {
      // Some non-rendered elements may throw during bbox read.
    }
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return undefined
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function hasBottomAxisContent(scene: SceneNode): boolean {
  let found = false
  const walk = (node: SceneNode) => {
    if (found) return
    const id = node.id
    if (
      id.startsWith('axis-tick:bottom:') ||
      id.startsWith('axis-tick-label:bottom:') ||
      id === 'axis-label:bottom'
    ) {
      found = true
      return
    }
    if (node.kind === SceneNodeKind.GROUP) {
      node.children.forEach(walk)
    }
  }
  walk(scene)
  return found
}

function resolveTypography(
  svg: SVGSVGElement,
  options?: LegendOptions['typography']
): {
  fontSizePx: number
  lineHeightPx: number
  fontFamily: string
  fontWeight: string | number
  letterSpacingPx: number
} {
  const fallbackFontSize = DEFAULT_OPTIONS.typography.fontSizePx!
  const computedStyle =
    typeof window !== 'undefined' ? window.getComputedStyle(svg) : null
  const computedFontSize =
    Number.parseFloat(computedStyle?.fontSize ?? '') || fallbackFontSize
  const fontSizePx = options?.fontSizePx ?? computedFontSize
  const lineHeightPx = options?.lineHeightPx ?? Math.round(fontSizePx * 1.2)
  const fontFamily =
    options?.fontFamily ?? DEFAULT_OPTIONS.typography.fontFamily!
  const fontWeight =
    options?.fontWeight ?? DEFAULT_OPTIONS.typography.fontWeight!
  const letterSpacingPx =
    options?.letterSpacingPx ?? DEFAULT_OPTIONS.typography.letterSpacingPx!

  return {
    fontSizePx,
    lineHeightPx,
    fontFamily,
    fontWeight,
    letterSpacingPx,
  }
}

function roundToHalfPx(value: number): number {
  return Math.round(value * 2) / 2
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

type LabelMetrics = {
  width: number
}

function measureLabelMetrics(
  svg: SVGSVGElement,
  label: string,
  typography: {
    fontSizePx: number
    lineHeightPx: number
    fontFamily: string
    fontWeight: string | number
    letterSpacingPx: number
  },
  cache: Map<string, LabelMetrics>
): LabelMetrics {
  const cacheKey = `${typography.fontFamily}|${typography.fontWeight}|${typography.fontSizePx}|${typography.letterSpacingPx}|${label}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const text = createSvgElement('text') as SVGTextElement
  text.setAttribute('font-size', String(typography.fontSizePx))
  text.setAttribute('font-family', typography.fontFamily)
  text.setAttribute('font-weight', String(typography.fontWeight))
  if (typography.letterSpacingPx !== 0) {
    text.setAttribute('letter-spacing', String(typography.letterSpacingPx))
  }
  text.textContent = label
  text.setAttribute('visibility', 'hidden')
  svg.appendChild(text)

  const measuredWidth =
    typeof text.getComputedTextLength === 'function'
      ? text.getComputedTextLength()
      : 0
  text.remove()

  const width =
    Number.isFinite(measuredWidth) && measuredWidth > 0
      ? measuredWidth
      : estimateLabelWidthPx(label)
  const metrics = { width }
  cache.set(cacheKey, metrics)
  return metrics
}

type ResolvedLegendOptions = {
  placement: LegendPlacement
  anchor: LegendAnchor
  direction: LegendDirection
  collision: 'avoid-frame' | 'auto-anchor'
  overlapPolicy: LegendOverlapPolicy
  offsetX: number
  offsetY: number
  padding: number
  axisToLegendGap?: number
  legendRowHeightPx: number
  textOpticalOffsetPx: number
  background:
    | boolean
    | {
        paddingPx?: number
        borderRadiusPx?: number
        opacity?: number
      }
  typography: {
    fontSizePx?: number
    lineHeightPx?: number
    fontFamily?: string
    fontWeight?: string | number
    letterSpacingPx?: number
  }
}

function resolveOptions(options?: LegendOptions): ResolvedLegendOptions {
  return {
    placement: options?.placement ?? DEFAULT_OPTIONS.placement,
    anchor: options?.anchor ?? DEFAULT_OPTIONS.anchor,
    direction: options?.direction ?? DEFAULT_OPTIONS.direction,
    collision: options?.collision ?? DEFAULT_OPTIONS.collision,
    overlapPolicy: options?.overlapPolicy ?? DEFAULT_OPTIONS.overlapPolicy,
    offsetX: options?.offsetX ?? DEFAULT_OPTIONS.offsetX,
    offsetY: options?.offsetY ?? DEFAULT_OPTIONS.offsetY,
    padding: options?.padding ?? DEFAULT_OPTIONS.padding,
    axisToLegendGap: options?.axisToLegendGap,
    legendRowHeightPx:
      options?.legendRowHeightPx ?? DEFAULT_OPTIONS.legendRowHeightPx,
    textOpticalOffsetPx:
      options?.textOpticalOffsetPx ?? DEFAULT_OPTIONS.textOpticalOffsetPx,
    background: options?.background ?? DEFAULT_OPTIONS.background,
    typography: {
      fontSizePx:
        options?.typography?.fontSizePx ??
        DEFAULT_OPTIONS.typography.fontSizePx,
      lineHeightPx:
        options?.typography?.lineHeightPx ??
        DEFAULT_OPTIONS.typography.lineHeightPx,
      fontFamily:
        options?.typography?.fontFamily ??
        DEFAULT_OPTIONS.typography.fontFamily,
      fontWeight:
        options?.typography?.fontWeight ??
        DEFAULT_OPTIONS.typography.fontWeight,
      letterSpacingPx:
        options?.typography?.letterSpacingPx ??
        DEFAULT_OPTIONS.typography.letterSpacingPx,
    },
  }
}

function renderExternalLegend(
  scene: SceneNode,
  svg: SVGSVGElement,
  legendHost: HTMLElement,
  entries: LegendMetadata['entries'],
  hiddenSeriesIds: Set<string>,
  options: ResolvedLegendOptions,
  typography: {
    fontSizePx: number
    lineHeightPx: number
    fontFamily: string
    fontWeight: string | number
    letterSpacingPx: number
  }
): boolean {
  const axisToLegendGap =
    options.axisToLegendGap ??
    (hasBottomAxisContent(scene)
      ? DEFAULT_AXIS_TO_LEGEND_GAP_WITH_AXIS
      : DEFAULT_AXIS_TO_LEGEND_GAP_NO_AXIS)

  const root = document.createElement('div')
  root.setAttribute('data-owlplot-legend-root', 'true')
  root.style.display = 'flex'
  root.style.flexWrap = 'wrap'
  root.style.gap = options.direction === 'column' ? '8px' : '16px'
  root.style.alignItems = 'center'
  root.style.width = '100%'
  root.style.boxSizing = 'border-box'
  root.style.fontFamily = typography.fontFamily
  root.style.fontSize = `${typography.fontSizePx}px`
  root.style.fontWeight = String(typography.fontWeight)
  root.style.lineHeight = `${typography.lineHeightPx}px`
  if (typography.letterSpacingPx !== 0) {
    root.style.letterSpacing = `${typography.letterSpacingPx}px`
  }

  const align = (() => {
    if (options.anchor.endsWith('left')) return 'flex-start'
    if (options.anchor.endsWith('right')) return 'flex-end'
    return 'center'
  })()
  const isSideAnchor =
    options.anchor === 'left-center' || options.anchor === 'right-center'
  root.style.justifyContent = isSideAnchor ? 'flex-start' : align
  if (options.direction === 'column') {
    root.style.flexDirection = 'column'
    root.style.alignItems = isSideAnchor
      ? 'flex-start'
      : align === 'center'
        ? 'center'
        : align
    root.style.flexWrap = 'nowrap'
    root.style.width = 'auto'
    if (isSideAnchor) {
      root.style.textAlign = 'left'
    }
  }

  if (options.anchor.startsWith('top')) {
    root.style.marginBottom = `${axisToLegendGap}px`
  } else if (!isSideAnchor) {
    root.style.marginTop = `${axisToLegendGap}px`
  }

  const swatchSize = clamp(
    Math.round(typography.fontSizePx * SWATCH_EM),
    SWATCH_MIN_PX,
    SWATCH_MAX_PX
  )

  for (const entry of entries) {
    const item = document.createElement('button')
    item.type = 'button'
    item.setAttribute(DATA_LEGEND_ITEM_SERIES_ID, entry.seriesId)
    item.style.display = 'inline-flex'
    item.style.alignItems = 'center'
    item.style.gap = `${SWATCH_TO_LABEL_GAP}px`
    item.style.border = 'none'
    item.style.background = 'transparent'
    item.style.padding = '0'
    item.style.margin = '0'
    item.style.cursor = 'pointer'
    item.style.color = 'inherit'
    item.style.font = 'inherit'

    const swatch = document.createElement('span')
    swatch.style.display = 'inline-block'
    swatch.style.width = `${swatchSize}px`
    swatch.style.height = `${swatchSize}px`
    swatch.style.borderRadius = '3px'
    swatch.style.background = paintToSwatchColor(entry.paint)

    const label = document.createElement('span')
    label.textContent = entry.label

    const syncItemVisualState = () => {
      const hidden = hiddenSeriesIds.has(entry.seriesId)
      swatch.style.opacity = hidden ? '0.35' : '1'
    }

    item.addEventListener('click', () => {
      if (hiddenSeriesIds.has(entry.seriesId)) {
        hiddenSeriesIds.delete(entry.seriesId)
      } else {
        hiddenSeriesIds.add(entry.seriesId)
      }
      applySeriesVisibility(svg, entry.seriesId, hiddenSeriesIds)
      syncItemVisualState()
    })

    syncItemVisualState()
    item.appendChild(swatch)
    item.appendChild(label)
    root.appendChild(item)
  }

  const extended = svg as ExtendedSVGSVGElement
  if (isSideAnchor) {
    root.dataset.owlplotHostStylesSaved = 'true'
    root.dataset.owlplotHostDisplay = legendHost.style.display
    root.dataset.owlplotHostAlignItems = legendHost.style.alignItems
    root.dataset.owlplotHostJustifyContent = legendHost.style.justifyContent
    root.dataset.owlplotHostColumnGap = legendHost.style.columnGap
    root.dataset.owlplotHostRowGap = legendHost.style.rowGap
    root.dataset.owlplotHostFlexDirection = legendHost.style.flexDirection

    legendHost.style.display = 'flex'
    legendHost.style.alignItems = 'center'
    legendHost.style.justifyContent = 'flex-start'
    legendHost.style.columnGap = `${axisToLegendGap}px`
    legendHost.style.rowGap = '0'
    legendHost.style.flexDirection = 'row'

    root.style.flex = '0 0 auto'
    if (options.anchor === 'left-center') {
      legendHost.insertBefore(root, svg)
    } else {
      legendHost.insertBefore(root, svg.nextSibling)
    }
  } else if (options.anchor.startsWith('top')) {
    legendHost.insertBefore(root, svg)
  } else {
    legendHost.insertBefore(root, svg.nextSibling)
  }
  extended[EXTERNAL_LEGEND_ELEMENT_SYMBOL] = root
  return true
}

function renderInsideSvgLegend(
  svg: SVGSVGElement,
  entries: LegendMetadata['entries'],
  hiddenSeriesIds: Set<string>,
  options: ResolvedLegendOptions,
  typography: {
    fontSizePx: number
    lineHeightPx: number
    fontFamily: string
    fontWeight: string | number
    letterSpacingPx: number
  },
  plotRect?: { x: number; y: number; width: number; height: number }
): void {
  const swatchSize = clamp(
    Math.round(typography.fontSizePx * SWATCH_EM),
    SWATCH_MIN_PX,
    SWATCH_MAX_PX
  )
  const rowHeight = Math.max(options.legendRowHeightPx, swatchSize)
  const textOffsetX = swatchSize + SWATCH_TO_LABEL_GAP

  const baseSize = ensureBaseSvgSize(svg)
  const chartRect = {
    x: 0,
    y: 0,
    width: baseSize.width,
    height: baseSize.height,
  }
  const labelMetricsCache = new Map<string, LabelMetrics>()
  const labelMetrics = entries.map(entry =>
    measureLabelMetrics(svg, entry.label, typography, labelMetricsCache)
  )

  const itemSizes = entries.map((_, index) => ({
    width: textOffsetX + labelMetrics[index]!.width,
    height: rowHeight,
  }))
  const effectiveOverlapPolicy: LegendOverlapPolicy =
    options.collision === 'avoid-frame' || options.collision === 'auto-anchor'
      ? 'avoid-frame'
      : options.overlapPolicy

  const computeLayout = (anchor: LegendAnchor) =>
    computeLegendLayout({
      placement: 'inside',
      anchor,
      direction: options.direction,
      overlapPolicy: effectiveOverlapPolicy,
      padding: options.padding,
      axisToLegendGap: 0,
      offsetX: options.offsetX,
      offsetY: options.offsetY,
      gap: ITEM_GAP,
      chartRect,
      plotRect: plotRect ?? chartRect,
      itemSizes,
    })

  let layout = computeLayout(options.anchor)
  if (options.collision === 'auto-anchor') {
    const anchors: LegendAnchor[] = [
      'top-right',
      'top-left',
      'bottom-right',
      'bottom-left',
    ]
    if (!anchors.includes(options.anchor)) {
      anchors.unshift(options.anchor)
    }
    const dataBounds = readDataBounds(svg)
    if (dataBounds) {
      const candidate = anchors
        .map(anchor => computeLayout(anchor))
        .find(candidateLayout => !intersects(candidateLayout.box, dataBounds))
      if (candidate) {
        layout = candidate
      }
    }
  }

  const root = createSvgElement('g')
  root.setAttribute(SvgAttributeName.ID, 'legend-root')
  if (options.background) {
    const backgroundOptions =
      typeof options.background === 'object' ? options.background : {}
    const backgroundPadding = backgroundOptions.paddingPx ?? 8
    const backgroundRadius = backgroundOptions.borderRadiusPx ?? 6
    const backgroundOpacity = backgroundOptions.opacity ?? 0.62

    const panel = createSvgElement('rect')
    panel.setAttribute(
      'x',
      String(roundToHalfPx(layout.box.x - backgroundPadding))
    )
    panel.setAttribute(
      'y',
      String(roundToHalfPx(layout.box.y - backgroundPadding))
    )
    panel.setAttribute(
      'width',
      String(roundToHalfPx(layout.box.width + backgroundPadding * 2))
    )
    panel.setAttribute(
      'height',
      String(roundToHalfPx(layout.box.height + backgroundPadding * 2))
    )
    panel.setAttribute('rx', String(backgroundRadius))
    panel.setAttribute('ry', String(backgroundRadius))
    panel.setAttribute('fill', '#ffffff')
    panel.setAttribute('opacity', String(backgroundOpacity))
    root.appendChild(panel)
  }

  entries.forEach((entry, index) => {
    const itemOrigin = layout.itemOrigins[index]
    if (!itemOrigin) return

    const item = createSvgElement('g')
    item.setAttribute(SvgAttributeName.ID, `legend-item:${entry.seriesId}`)
    item.setAttribute(DATA_LEGEND_ITEM_SERIES_ID, entry.seriesId)
    item.setAttribute('transform', `translate(${itemOrigin.x},${itemOrigin.y})`)
    item.style.cursor = 'pointer'

    const swatch = createSvgElement('rect')
    const rowCenterY = rowHeight / 2
    const swatchY = rowCenterY - swatchSize / 2
    swatch.setAttribute('x', '0')
    swatch.setAttribute('y', String(roundToHalfPx(swatchY)))
    swatch.setAttribute('width', String(swatchSize))
    swatch.setAttribute('height', String(swatchSize))
    swatch.setAttribute('rx', '3')
    swatch.setAttribute('ry', '3')
    swatch.setAttribute('fill', paintToSwatchColor(entry.paint))

    const label = createSvgElement('text') as SVGTextElement
    label.setAttribute('x', String(textOffsetX))
    label.setAttribute(
      'y',
      String(roundToHalfPx(rowHeight / 2 + options.textOpticalOffsetPx))
    )
    label.setAttribute('dominant-baseline', 'middle')
    label.setAttribute('font-size', String(typography.fontSizePx))
    label.setAttribute('font-family', typography.fontFamily)
    label.setAttribute('font-weight', String(typography.fontWeight))
    if (typography.letterSpacingPx !== 0) {
      label.setAttribute('letter-spacing', String(typography.letterSpacingPx))
    }
    label.textContent = entry.label

    const syncItemVisualState = () => {
      const hidden = hiddenSeriesIds.has(entry.seriesId)
      swatch.setAttribute('opacity', hidden ? '0.35' : '1')
    }

    item.addEventListener('click', () => {
      if (hiddenSeriesIds.has(entry.seriesId)) {
        hiddenSeriesIds.delete(entry.seriesId)
      } else {
        hiddenSeriesIds.add(entry.seriesId)
      }
      applySeriesVisibility(svg, entry.seriesId, hiddenSeriesIds)
      syncItemVisualState()
    })

    syncItemVisualState()
    item.appendChild(swatch)
    item.appendChild(label)
    root.appendChild(item)
  })

  root.setAttribute('aria-label', 'legend')
  root.setAttribute('data-owlplot-legend', 'true')
  svg.appendChild(root)
}

export function renderLegend(
  scene: SceneNode,
  svg: SVGSVGElement,
  hiddenSeriesIds: Set<string>,
  options?: LegendOptions,
  plotRect?: { x: number; y: number; width: number; height: number },
  legendHost?: HTMLElement
): void {
  clearExternalLegend(svg)

  const legendMetadata = getLegendMetadata(scene)
  const resolvedOptions = resolveOptions(options)
  if (resolvedOptions.placement === 'none' || !legendMetadata) {
    restoreLegendLayout(svg)
    return
  }

  const entries = [...legendMetadata.entries].sort((a, b) => a.order - b.order)
  const allowedSeriesIds = new Set(entries.map(entry => entry.seriesId))

  for (const hiddenId of Array.from(hiddenSeriesIds)) {
    if (!allowedSeriesIds.has(hiddenId)) hiddenSeriesIds.delete(hiddenId)
  }

  for (const entry of entries) {
    applySeriesVisibility(svg, entry.seriesId, hiddenSeriesIds)
  }

  const typography = resolveTypography(svg, resolvedOptions.typography)

  if (resolvedOptions.placement === 'outside') {
    restoreLegendLayout(svg)
    const host = legendHost ?? (svg.parentElement as HTMLElement | null)
    if (host == null) {
      if (
        process.env.NODE_ENV !== 'production' &&
        !hasWarnedOutsideLegendNoHost
      ) {
        console.warn('[owlplot] outside legend skipped: no host')
        hasWarnedOutsideLegendNoHost = true
      }
      return
    }
    renderExternalLegend(
      scene,
      svg,
      host,
      entries,
      hiddenSeriesIds,
      resolvedOptions,
      typography
    )
    return
  }

  renderInsideSvgLegend(
    svg,
    entries,
    hiddenSeriesIds,
    resolvedOptions,
    typography,
    plotRect
  )
}
