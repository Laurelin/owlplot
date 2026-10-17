import {
  Position,
  SceneNodeKind,
  type AnyPaint,
  type LegendMetadata,
  type SceneAxisRole,
  type SceneNode,
} from '@owlplot/core'
import { createSvgElement } from './svgDom'
import {
  DATA_SERIES_ID,
  DATA_LEGEND_ITEM_SERIES_ID,
} from '../shared/dataAttributes'
import { SvgAttributeName } from '../shared/enums'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import { EXTERNAL_LEGEND_ELEMENT_SYMBOL } from '../shared/symbols'
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
  /** Current hidden ids (legend dimming only). */
  hiddenSeriesIds?: ReadonlySet<string> | readonly string[]
  /** App must recompute scene when this fires. */
  onToggleSeries?: (seriesId: string) => void
}

const DEFAULT_OPTIONS: Required<
  Omit<LegendOptions, 'hiddenSeriesIds' | 'onToggleSeries'>
> = {
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
  const firstStop = paint.stops[0]
  return firstStop ? firstStop.color : 'currentColor'
}

function getLegendMetadata(scene: SceneNode): LegendMetadata | undefined {
  const metadata = scene.metadata?.legend
  if (
    !metadata ||
    !Array.isArray(metadata.entries) ||
    metadata.entries.length === 0
  ) {
    return undefined
  }
  return metadata
}

function readSvgDimension(
  svg: SVGSVGElement,
  key: 'width' | 'height',
  viewBoxIndex: number
): number {
  const attrValue = finiteNumber(svg.getAttribute(key))
  if (attrValue != null) return attrValue
  const viewBox = svg.getAttribute('viewBox')
  if (!viewBox) return 0
  return finiteNumber(viewBox.trim().split(/\s+/)[viewBoxIndex]) ?? 0
}

function finiteNumber(value: string | null | undefined): number | undefined {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : undefined
}

function savedStyle(value: string | undefined): string {
  return value ?? ''
}

function restoreLegendHostStyles(external: HTMLElement): void {
  if (external.dataset.owlplotHostStylesSaved !== 'true') return
  const host = external.parentElement as HTMLElement | null
  if (!host) return
  host.style.display = savedStyle(external.dataset.owlplotHostDisplay)
  host.style.alignItems = savedStyle(external.dataset.owlplotHostAlignItems)
  host.style.justifyContent = savedStyle(
    external.dataset.owlplotHostJustifyContent
  )
  host.style.columnGap = savedStyle(external.dataset.owlplotHostColumnGap)
  host.style.rowGap = savedStyle(external.dataset.owlplotHostRowGap)
  host.style.flexDirection = savedStyle(
    external.dataset.owlplotHostFlexDirection
  )
}

function clearExternalLegend(svg: SVGSVGElement): void {
  const extended = svg as ExtendedSVGSVGElement
  const external = extended[EXTERNAL_LEGEND_ELEMENT_SYMBOL]
  if (!external) return
  restoreLegendHostStyles(external)
  external.remove()
  delete extended[EXTERNAL_LEGEND_ELEMENT_SYMBOL]
}

export function clearLegendArtifacts(svg: SVGSVGElement): void {
  clearExternalLegend(svg)
}

function estimateLabelWidthPx(label: string): number {
  return Math.max(12, Math.round(label.length * 8))
}

function intersects(a: Rect, b: Rect): boolean {
  return (
    overlapsAxis(a.x, a.width, b.x, b.width) &&
    overlapsAxis(a.y, a.height, b.y, b.height)
  )
}

function overlapsAxis(
  firstStart: number,
  firstLength: number,
  secondStart: number,
  secondLength: number
): boolean {
  return (
    firstStart < secondStart + secondLength &&
    firstStart + firstLength > secondStart
  )
}

function readDataBounds(svg: SVGSVGElement): Rect | undefined {
  const candidates = Array.from(svg.querySelectorAll(`[${DATA_SERIES_ID}]`))

  const bounds = createEmptyBounds()
  for (const element of candidates) {
    const box = readBoundingBox(element)
    if (box) includeRect(bounds, box)
  }
  return boundsToRect(bounds)
}

type MutableBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function createEmptyBounds(): MutableBounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  }
}

function readBoundingBox(element: Element): DOMRect | SVGRect | undefined {
  const graphics = element as SVGGraphicsElement
  if (typeof graphics.getBBox !== 'function') return undefined
  try {
    const box = graphics.getBBox()
    return Number.isFinite(box.width) && Number.isFinite(box.height)
      ? box
      : undefined
  } catch {
    return undefined
  }
}

function includeRect(bounds: MutableBounds, box: DOMRect | SVGRect): void {
  bounds.minX = Math.min(bounds.minX, box.x)
  bounds.minY = Math.min(bounds.minY, box.y)
  bounds.maxX = Math.max(bounds.maxX, box.x + box.width)
  bounds.maxY = Math.max(bounds.maxY, box.y + box.height)
}

function boundsToRect(bounds: MutableBounds): Rect | undefined {
  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
    return undefined
  }
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  }
}

const BOTTOM_AXIS_ROLES: ReadonlySet<SceneAxisRole> = new Set([
  'tick',
  'tick-label',
  'label',
])

function isBottomAxisNode(node: SceneNode): boolean {
  const axis = node.axis
  return (
    axis !== undefined &&
    axis.orientation === Position.BOTTOM &&
    BOTTOM_AXIS_ROLES.has(axis.role)
  )
}

function hasBottomAxisContent(scene: SceneNode): boolean {
  let found = false
  const walk = (node: SceneNode) => {
    if (found) return
    if (isBottomAxisNode(node)) {
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

function readComputedFontSize(svg: SVGSVGElement, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  return Number.parseFloat(window.getComputedStyle(svg).fontSize) || fallback
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
  const computedFontSize = readComputedFontSize(svg, fallbackFontSize)
  const resolved = {
    ...DEFAULT_OPTIONS.typography,
    ...definedProperties(options),
  }
  const fontSizePx = resolved.fontSizePx ?? computedFontSize
  const lineHeightPx = resolved.lineHeightPx ?? Math.round(fontSizePx * 1.2)

  return {
    fontSizePx,
    lineHeightPx,
    fontFamily: resolved.fontFamily!,
    fontWeight: resolved.fontWeight!,
    letterSpacingPx: resolved.letterSpacingPx!,
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

function createMeasurementText(
  label: string,
  typography: {
    fontSizePx: number
    fontFamily: string
    fontWeight: string | number
    letterSpacingPx: number
  }
): SVGTextElement {
  const text = createSvgElement('text') as SVGTextElement
  text.setAttribute('font-size', String(typography.fontSizePx))
  text.setAttribute('font-family', typography.fontFamily)
  text.setAttribute('font-weight', String(typography.fontWeight))
  if (typography.letterSpacingPx !== 0) {
    text.setAttribute('letter-spacing', String(typography.letterSpacingPx))
  }
  text.textContent = label
  text.setAttribute('visibility', 'hidden')
  return text
}

function resolveMeasuredWidth(text: SVGTextElement, label: string): number {
  const measured =
    typeof text.getComputedTextLength === 'function'
      ? text.getComputedTextLength()
      : 0
  return Number.isFinite(measured) && measured > 0
    ? measured
    : estimateLabelWidthPx(label)
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

  const text = createMeasurementText(label, typography)
  svg.appendChild(text)
  const width = resolveMeasuredWidth(text, label)
  text.remove()
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

function definedProperties<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>
}

function resolveOptions(options?: LegendOptions): ResolvedLegendOptions {
  const resolved = {
    ...DEFAULT_OPTIONS,
    ...definedProperties(options),
  }
  return {
    placement: resolved.placement,
    anchor: resolved.anchor,
    direction: resolved.direction,
    collision: resolved.collision,
    overlapPolicy: resolved.overlapPolicy,
    offsetX: resolved.offsetX,
    offsetY: resolved.offsetY,
    padding: resolved.padding,
    axisToLegendGap: options?.axisToLegendGap,
    legendRowHeightPx: resolved.legendRowHeightPx,
    textOpticalOffsetPx: resolved.textOpticalOffsetPx,
    background: resolved.background,
    typography: {
      ...DEFAULT_OPTIONS.typography,
      ...definedProperties(options?.typography),
    },
  }
}

type ResolvedTypography = ReturnType<typeof resolveTypography>

function resolveAxisToLegendGap(
  scene: SceneNode,
  options: ResolvedLegendOptions
): number {
  if (options.axisToLegendGap != null) return options.axisToLegendGap
  return hasBottomAxisContent(scene)
    ? DEFAULT_AXIS_TO_LEGEND_GAP_WITH_AXIS
    : DEFAULT_AXIS_TO_LEGEND_GAP_NO_AXIS
}

function resolveExternalAlignment(anchor: LegendAnchor): string {
  if (anchor.endsWith('left')) return 'flex-start'
  if (anchor.endsWith('right')) return 'flex-end'
  return 'center'
}

function isSideAnchor(anchor: LegendAnchor): boolean {
  return anchor === 'left-center' || anchor === 'right-center'
}

function styleExternalRootBase(
  root: HTMLDivElement,
  options: ResolvedLegendOptions,
  typography: ResolvedTypography
): void {
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
}

function styleExternalRootAlignment(
  root: HTMLDivElement,
  options: ResolvedLegendOptions
): void {
  const align = resolveExternalAlignment(options.anchor)
  const sideAnchor = isSideAnchor(options.anchor)
  root.style.justifyContent = sideAnchor ? 'flex-start' : align
  if (options.direction !== 'column') return
  styleExternalColumn(root, align, sideAnchor)
}

function styleExternalColumn(
  root: HTMLDivElement,
  align: string,
  sideAnchor: boolean
): void {
  root.style.flexDirection = 'column'
  root.style.alignItems = sideAnchor ? 'flex-start' : align
  root.style.flexWrap = 'nowrap'
  root.style.width = 'auto'
  if (sideAnchor) root.style.textAlign = 'left'
}

function styleExternalRootMargin(
  root: HTMLDivElement,
  anchor: LegendAnchor,
  axisToLegendGap: number
): void {
  if (anchor.startsWith('top')) {
    root.style.marginBottom = `${axisToLegendGap}px`
    return
  }
  if (!isSideAnchor(anchor)) {
    root.style.marginTop = `${axisToLegendGap}px`
  }
}

function createExternalLegendItem(
  entry: LegendMetadata['entries'][number],
  hiddenSeriesIds: ReadonlySet<string>,
  swatchSize: number,
  onToggleSeries?: (seriesId: string) => void
): HTMLButtonElement {
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
  swatch.style.opacity = hiddenSeriesIds.has(entry.seriesId) ? '0.35' : '1'

  const label = document.createElement('span')
  label.textContent = entry.label
  item.addEventListener('click', () => onToggleSeries?.(entry.seriesId))
  item.appendChild(swatch)
  item.appendChild(label)
  return item
}

function appendExternalLegendItems(
  root: HTMLDivElement,
  entries: LegendMetadata['entries'],
  hiddenSeriesIds: ReadonlySet<string>,
  swatchSize: number,
  onToggleSeries?: (seriesId: string) => void
): void {
  for (const entry of entries) {
    root.appendChild(
      createExternalLegendItem(
        entry,
        hiddenSeriesIds,
        swatchSize,
        onToggleSeries
      )
    )
  }
}

function activateSideLegendHost(
  root: HTMLDivElement,
  host: HTMLElement,
  axisToLegendGap: number
): void {
  root.dataset.owlplotHostStylesSaved = 'true'
  root.dataset.owlplotHostDisplay = host.style.display
  root.dataset.owlplotHostAlignItems = host.style.alignItems
  root.dataset.owlplotHostJustifyContent = host.style.justifyContent
  root.dataset.owlplotHostColumnGap = host.style.columnGap
  root.dataset.owlplotHostRowGap = host.style.rowGap
  root.dataset.owlplotHostFlexDirection = host.style.flexDirection
  host.style.display = 'flex'
  host.style.alignItems = 'center'
  host.style.justifyContent = 'flex-start'
  host.style.columnGap = `${axisToLegendGap}px`
  host.style.rowGap = '0'
  host.style.flexDirection = 'row'
  root.style.flex = '0 0 auto'
}

function insertExternalLegend(
  root: HTMLDivElement,
  svg: SVGSVGElement,
  host: HTMLElement,
  anchor: LegendAnchor,
  axisToLegendGap: number
): void {
  if (isSideAnchor(anchor)) {
    activateSideLegendHost(root, host, axisToLegendGap)
    host.insertBefore(root, anchor === 'left-center' ? svg : svg.nextSibling)
    return
  }
  const reference = anchor.startsWith('top') ? svg : svg.nextSibling
  host.insertBefore(root, reference)
}

function renderExternalLegend(
  scene: SceneNode,
  svg: SVGSVGElement,
  legendHost: HTMLElement,
  entries: LegendMetadata['entries'],
  hiddenSeriesIds: ReadonlySet<string>,
  options: ResolvedLegendOptions,
  typography: ResolvedTypography,
  onToggleSeries?: (seriesId: string) => void
): boolean {
  const axisToLegendGap = resolveAxisToLegendGap(scene, options)
  const root = document.createElement('div')
  root.setAttribute('data-owlplot-legend-root', 'true')
  styleExternalRootBase(root, options, typography)
  styleExternalRootAlignment(root, options)
  styleExternalRootMargin(root, options.anchor, axisToLegendGap)
  const swatchSize = clamp(
    Math.round(typography.fontSizePx * SWATCH_EM),
    SWATCH_MIN_PX,
    SWATCH_MAX_PX
  )
  appendExternalLegendItems(
    root,
    entries,
    hiddenSeriesIds,
    swatchSize,
    onToggleSeries
  )
  insertExternalLegend(root, svg, legendHost, options.anchor, axisToLegendGap)
  const extended = svg as ExtendedSVGSVGElement
  extended[EXTERNAL_LEGEND_ELEMENT_SYMBOL] = root
  return true
}

function renderInsideSvgLegend(
  svg: SVGSVGElement,
  entries: LegendMetadata['entries'],
  hiddenSeriesIds: ReadonlySet<string>,
  options: ResolvedLegendOptions,
  typography: ResolvedTypography,
  plotRect?: { x: number; y: number; width: number; height: number },
  onToggleSeries?: (seriesId: string) => void
): void {
  const geometry = resolveInsideGeometry(svg, entries, options, typography)
  const layout = resolveInsideLayout(
    svg,
    options,
    geometry.chartRect,
    plotRect,
    geometry.itemSizes
  )
  const root = createSvgElement('g')
  root.setAttribute(SvgAttributeName.ID, 'legend-root')
  appendLegendBackground(root, layout.box, options.background)
  appendInsideLegendItems(
    root,
    entries,
    layout.itemOrigins,
    geometry,
    hiddenSeriesIds,
    options,
    typography,
    onToggleSeries
  )
  root.setAttribute('aria-label', 'legend')
  root.setAttribute('data-owlplot-legend', 'true')
  svg.appendChild(root)
}

type InsideLegendGeometry = {
  swatchSize: number
  rowHeight: number
  textOffsetX: number
  chartRect: Rect
  itemSizes: { width: number; height: number }[]
}

function resolveInsideGeometry(
  svg: SVGSVGElement,
  entries: LegendMetadata['entries'],
  options: ResolvedLegendOptions,
  typography: ResolvedTypography
): InsideLegendGeometry {
  const swatchSize = clamp(
    Math.round(typography.fontSizePx * SWATCH_EM),
    SWATCH_MIN_PX,
    SWATCH_MAX_PX
  )
  const rowHeight = Math.max(options.legendRowHeightPx, swatchSize)
  const textOffsetX = swatchSize + SWATCH_TO_LABEL_GAP
  const chartRect = {
    x: 0,
    y: 0,
    width: readSvgDimension(svg, 'width', 2),
    height: readSvgDimension(svg, 'height', 3),
  }
  const labelMetricsCache = new Map<string, LabelMetrics>()
  const labelMetrics = entries.map(entry =>
    measureLabelMetrics(svg, entry.label, typography, labelMetricsCache)
  )
  const itemSizes = entries.map((_, index) => ({
    width: textOffsetX + labelMetrics[index]!.width,
    height: rowHeight,
  }))
  return { swatchSize, rowHeight, textOffsetX, chartRect, itemSizes }
}

function effectiveOverlapPolicy(
  options: ResolvedLegendOptions
): LegendOverlapPolicy {
  return options.collision === 'avoid-frame' ||
    options.collision === 'auto-anchor'
    ? 'avoid-frame'
    : options.overlapPolicy
}

function computeInsideLayout(
  anchor: LegendAnchor,
  options: ResolvedLegendOptions,
  chartRect: Rect,
  plotRect: Rect | undefined,
  itemSizes: { width: number; height: number }[]
) {
  return computeLegendLayout({
    placement: 'inside',
    anchor,
    direction: options.direction,
    overlapPolicy: effectiveOverlapPolicy(options),
    padding: options.padding,
    axisToLegendGap: 0,
    offsetX: options.offsetX,
    offsetY: options.offsetY,
    gap: ITEM_GAP,
    chartRect,
    plotRect: plotRect ?? chartRect,
    itemSizes,
  })
}

function autoAnchorCandidates(preferred: LegendAnchor): LegendAnchor[] {
  const anchors: LegendAnchor[] = [
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
  ]
  if (!anchors.includes(preferred)) anchors.unshift(preferred)
  return anchors
}

function resolveAutoAnchoredLayout(
  svg: SVGSVGElement,
  options: ResolvedLegendOptions,
  chartRect: Rect,
  plotRect: Rect | undefined,
  itemSizes: { width: number; height: number }[],
  fallback: ReturnType<typeof computeLegendLayout>
): ReturnType<typeof computeLegendLayout> {
  const dataBounds = readDataBounds(svg)
  if (!dataBounds) return fallback
  const candidate = autoAnchorCandidates(options.anchor)
    .map(anchor =>
      computeInsideLayout(anchor, options, chartRect, plotRect, itemSizes)
    )
    .find(layout => !intersects(layout.box, dataBounds))
  return candidate ?? fallback
}

function resolveInsideLayout(
  svg: SVGSVGElement,
  options: ResolvedLegendOptions,
  chartRect: Rect,
  plotRect: Rect | undefined,
  itemSizes: { width: number; height: number }[]
): ReturnType<typeof computeLegendLayout> {
  const fallback = computeInsideLayout(
    options.anchor,
    options,
    chartRect,
    plotRect,
    itemSizes
  )
  if (options.collision !== 'auto-anchor') return fallback
  return resolveAutoAnchoredLayout(
    svg,
    options,
    chartRect,
    plotRect,
    itemSizes,
    fallback
  )
}

function appendLegendBackground(
  root: SVGElement,
  box: Rect,
  background: ResolvedLegendOptions['background']
): void {
  if (!background) return
  const backgroundOptions = resolveBackgroundOptions(background)
  const padding = valueOrDefault(backgroundOptions.paddingPx, 8)
  const radius = valueOrDefault(backgroundOptions.borderRadiusPx, 6)
  const panel = createSvgElement('rect')
  setSvgAttributes(panel, {
    x: roundToHalfPx(box.x - padding),
    y: roundToHalfPx(box.y - padding),
    width: roundToHalfPx(box.width + padding * 2),
    height: roundToHalfPx(box.height + padding * 2),
    rx: radius,
    ry: radius,
    fill: '#ffffff',
    opacity: valueOrDefault(backgroundOptions.opacity, 0.62),
  })
  root.appendChild(panel)
}

function resolveBackgroundOptions(
  background: Exclude<ResolvedLegendOptions['background'], false>
): Exclude<ResolvedLegendOptions['background'], boolean> {
  return typeof background === 'object' ? background : {}
}

function valueOrDefault(value: number | undefined, fallback: number): number {
  return value ?? fallback
}

function setSvgAttributes(
  element: SVGElement,
  attributes: Readonly<Record<string, string | number>>
): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value))
  }
}

function createInsideLegendItem(
  entry: LegendMetadata['entries'][number],
  origin: { x: number; y: number },
  geometry: InsideLegendGeometry,
  hidden: boolean,
  options: ResolvedLegendOptions,
  typography: ResolvedTypography,
  onToggleSeries?: (seriesId: string) => void
): SVGElement {
  const item = createSvgElement('g')
  item.setAttribute(SvgAttributeName.ID, `legend-item:${entry.seriesId}`)
  item.setAttribute(DATA_LEGEND_ITEM_SERIES_ID, entry.seriesId)
  item.setAttribute('transform', `translate(${origin.x},${origin.y})`)
  item.style.cursor = 'pointer'

  const swatch = createSvgElement('rect')
  const swatchY = geometry.rowHeight / 2 - geometry.swatchSize / 2
  setSvgAttributes(swatch, {
    x: 0,
    y: roundToHalfPx(swatchY),
    width: geometry.swatchSize,
    height: geometry.swatchSize,
    rx: 3,
    ry: 3,
    fill: paintToSwatchColor(entry.paint),
    opacity: hidden ? '0.35' : '1',
  })

  const label = createSvgElement('text') as SVGTextElement
  setSvgAttributes(label, {
    x: geometry.textOffsetX,
    y: roundToHalfPx(geometry.rowHeight / 2 + options.textOpticalOffsetPx),
    'dominant-baseline': 'middle',
    'font-size': typography.fontSizePx,
    'font-family': typography.fontFamily,
    'font-weight': typography.fontWeight,
  })
  if (typography.letterSpacingPx !== 0) {
    label.setAttribute('letter-spacing', String(typography.letterSpacingPx))
  }
  label.textContent = entry.label
  item.addEventListener('click', () => onToggleSeries?.(entry.seriesId))
  item.appendChild(swatch)
  item.appendChild(label)
  return item
}

function appendInsideLegendItems(
  root: SVGElement,
  entries: LegendMetadata['entries'],
  origins: { x: number; y: number }[],
  geometry: InsideLegendGeometry,
  hiddenSeriesIds: ReadonlySet<string>,
  options: ResolvedLegendOptions,
  typography: ResolvedTypography,
  onToggleSeries?: (seriesId: string) => void
): void {
  entries.forEach((entry, index) => {
    const origin = origins[index]
    if (!origin) return
    root.appendChild(
      createInsideLegendItem(
        entry,
        origin,
        geometry,
        hiddenSeriesIds.has(entry.seriesId),
        options,
        typography,
        onToggleSeries
      )
    )
  })
}

/*
 * Layout, node creation, and DOM insertion intentionally remain separate:
 * callers can reason about geometry without relying on rendered DOM state.
 */

function toHiddenSet(
  hidden?: ReadonlySet<string> | readonly string[]
): ReadonlySet<string> {
  if (hidden == null) return new Set()
  if (hidden instanceof Set) return hidden
  return new Set(hidden)
}

function warnOutsideLegendWithoutHost(): void {
  if (process.env.NODE_ENV === 'production' || hasWarnedOutsideLegendNoHost) {
    return
  }
  console.warn('[owlplot] outside legend skipped: no host')
  hasWarnedOutsideLegendNoHost = true
}

function renderResolvedOutsideLegend(
  scene: SceneNode,
  svg: SVGSVGElement,
  entries: LegendMetadata['entries'],
  hiddenSeriesIds: ReadonlySet<string>,
  options: ResolvedLegendOptions,
  typography: ResolvedTypography,
  legendHost: HTMLElement | undefined,
  onToggleSeries?: (seriesId: string) => void
): void {
  const host = legendHost ?? (svg.parentElement as HTMLElement | null)
  if (!host) {
    warnOutsideLegendWithoutHost()
    return
  }
  renderExternalLegend(
    scene,
    svg,
    host,
    entries,
    hiddenSeriesIds,
    options,
    typography,
    onToggleSeries
  )
}

export function renderLegend(
  scene: SceneNode,
  svg: SVGSVGElement,
  options?: LegendOptions,
  plotRect?: { x: number; y: number; width: number; height: number },
  legendHost?: HTMLElement
): void {
  clearExternalLegend(svg)

  const legendMetadata = getLegendMetadata(scene)
  const resolvedOptions = resolveOptions(options)
  if (resolvedOptions.placement === 'none' || !legendMetadata) {
    return
  }
  const entries = [...legendMetadata.entries].sort((a, b) => a.order - b.order)
  const hiddenSeriesIds = toHiddenSet(options?.hiddenSeriesIds)
  const onToggleSeries = options?.onToggleSeries
  const typography = resolveTypography(svg, resolvedOptions.typography)
  if (resolvedOptions.placement === 'outside') {
    renderResolvedOutsideLegend(
      scene,
      svg,
      entries,
      hiddenSeriesIds,
      resolvedOptions,
      typography,
      legendHost,
      onToggleSeries
    )
    return
  }
  renderInsideSvgLegend(
    svg,
    entries,
    hiddenSeriesIds,
    resolvedOptions,
    typography,
    plotRect,
    onToggleSeries
  )
}
