import type { SceneNode, ScenePathNode, PointShape } from '@owlplot/core'
import { SceneNodeKind, isHoverMetadata } from '@owlplot/core'
import type {
  TooltipRenderer,
  TooltipContext,
  HoverSeriesStyle,
} from '../tooltip/types'
import type { HoverMode } from '../hover/types'
import type { RuntimeHoverMetadata } from '../hover/types'
import type { HoverIndicatorConfig } from '../hover/indicators/types'

import { clearSvg } from './svgDom'
import { appendNode, type AppendNodeContext } from './appendNode'
import {
  clearLegendArtifacts,
  renderLegend,
  type LegendOptions,
} from './legend'

import { defaultTooltipRenderer } from '../tooltip/defaultTooltipRenderer'
import { hideTooltip, removeTooltip } from '../tooltip/tooltipDom'
import { warnDev } from '../shared/dev'

import {
  attachDataHover,
  attachGlyphHover,
  detachAllHoverListeners,
} from '../hover/hoverManager'
import { createHoverResolver } from '../hover/resolvers'
import { createIndicators } from '../hover/indicators/indicators'
import { hydrateHoverMetadata } from '../hover/hydrateHoverMetadata'
import { buildPointIndexFromRenderedElements } from '../hover/pointIndex'

import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  POINT_INDEX_SYMBOL,
  TOOLTIP_CONTEXT_SYMBOL,
  SERIES_STYLES_SYMBOL,
  SERIES_POINT_SHAPES_SYMBOL,
  X_HOVER_LINE_SYMBOL,
  Y_HOVER_LINE_SYMBOL,
} from '../shared/symbols'
import { HoverModeKind, HoverIndicatorKind } from '../shared/enums'
import { hideXLine } from '../hover/indicators/xLine'
import { hideYLine } from '../hover/indicators/yLine'

/**
 * Resolve scene node stroke to a single color for tooltip swatch.
 * If stroke is a gradient → use first stop color only. Do not render gradients in tooltips.
 */
function strokeToSwatchColor(stroke: {
  type: string
  color?: string
  stops?: readonly { color: string }[]
}): string | undefined {
  if (stroke.type === 'solid') return stroke.color
  if (isGradientStrokeType(stroke.type)) return stroke.stops?.[0]?.color
  return undefined
}

function isGradientStrokeType(type: string): boolean {
  return type === 'linear' || type === 'radial'
}

/**
 * Walk scene and build seriesId → HoverSeriesStyle from series PATH nodes.
 * Stroke is resolved to a single color string (solid or first stop of gradient).
 */
function buildSeriesStylesFromScene(
  scene: SceneNode
): Map<string, HoverSeriesStyle> {
  const map = new Map<string, HoverSeriesStyle>()
  function recordSeriesStyle(node: ScenePathNode): void {
    const stroke = node.style?.stroke
    if (!node.seriesId || !stroke) return
    const color = strokeToSwatchColor(stroke)
    if (color) map.set(node.seriesId, { stroke: color })
  }
  function walk(node: SceneNode) {
    if (node.kind === SceneNodeKind.PATH) recordSeriesStyle(node)
    if (node.kind === SceneNodeKind.GROUP) {
      node.children.forEach(walk)
    }
  }
  walk(scene)
  return map
}

/**
 * Walk scene and build seriesId → PointShape from POINT nodes.
 * Used for overlay emphasis default shape when point nodes exist; empty when showPoints: false.
 */
function buildSeriesPointShapesFromScene(
  scene: SceneNode
): Map<string, PointShape> {
  const map = new Map<string, PointShape>()
  function recordPointShape(node: SceneNode): void {
    if (node.kind !== SceneNodeKind.POINT) return
    map.set(node.seriesId, node.point.shape)
  }
  function walk(node: SceneNode) {
    recordPointShape(node)
    if (node.kind === SceneNodeKind.GROUP) {
      node.children.forEach(walk)
    }
  }
  walk(scene)
  return map
}

type RenderSvgSceneOptions = {
  tooltip?: TooltipRenderer | null
  tooltipContext?: TooltipContext
  hoverMode?: HoverMode
  hoverIndicator?: HoverIndicatorConfig | HoverIndicatorConfig[]
  legend?: LegendOptions | boolean | null
  legendHost?: HTMLElement
}

type LegendPlan =
  | { kind: 'disabled' }
  | { kind: 'enabled'; options: LegendOptions; host?: HTMLElement }

type HoverPlan =
  | { kind: 'unavailable' }
  | {
      kind: 'glyph'
      metadata: RuntimeHoverMetadata
      indicators: HoverIndicatorConfig[]
      tooltip: TooltipRenderer | null
    }
  | {
      kind: 'data'
      metadata: RuntimeHoverMetadata
      indicators: HoverIndicatorConfig[]
      tooltip: TooltipRenderer | null
      mode: Exclude<HoverMode, { kind: HoverModeKind.GLYPH }>
    }

function hydrateSceneHover(scene: SceneNode): RuntimeHoverMetadata | undefined {
  const rawHover = scene.metadata?.hover
  return isHoverMetadata(rawHover) ? hydrateHoverMetadata(rawHover) : undefined
}

function resolveAppendContext(
  hover: RuntimeHoverMetadata | undefined
): AppendNodeContext | undefined {
  if (!hover?.scales) return undefined
  const seriesYAxis = Object.fromEntries(
    hover.series.map(series => [series.id, series.yAxis])
  )
  return { scales: hover.scales, seriesYAxis }
}

function resolveLegendPlan(options?: RenderSvgSceneOptions): LegendPlan {
  const legend = options?.legend
  if (isLegendDisabled(legend)) return { kind: 'disabled' }
  return {
    kind: 'enabled',
    options: isLegendOptions(legend) ? legend : {},
    host: options?.legendHost,
  }
}

function isLegendOptions(
  legend: RenderSvgSceneOptions['legend']
): legend is LegendOptions {
  return legend !== null && typeof legend === 'object'
}

function isLegendDisabled(legend: RenderSvgSceneOptions['legend']): boolean {
  if (legend === null) return true
  if (legend === false) return true
  return isLegendOptions(legend) && legend.placement === 'none'
}

function defaultIndicatorForMode(mode: HoverMode): HoverIndicatorConfig {
  switch (mode.kind) {
    case HoverModeKind.POINT:
      return { kind: HoverIndicatorKind.POINT_EMPHASIS }
    case HoverModeKind.X_AXIS:
      return { kind: HoverIndicatorKind.X_LINE }
    case HoverModeKind.GLYPH:
    case HoverModeKind.Y_AXIS:
      return { kind: HoverIndicatorKind.NONE }
  }
}

function resolveIndicatorConfigs(
  options: RenderSvgSceneOptions | undefined,
  mode: HoverMode
): HoverIndicatorConfig[] {
  const configured = options?.hoverIndicator
  if (configured !== undefined) return toIndicatorArray(configured)
  return [defaultIndicatorForMode(mode)]
}

function toIndicatorArray(
  configured: HoverIndicatorConfig | HoverIndicatorConfig[]
): HoverIndicatorConfig[] {
  return Array.isArray(configured) ? [...configured] : [configured]
}

function resolveTooltip(
  option: TooltipRenderer | null | undefined
): TooltipRenderer | null {
  return option === null ? null : (option ?? defaultTooltipRenderer)
}

function resolveHoverPlan(
  hover: RuntimeHoverMetadata | undefined,
  options?: RenderSvgSceneOptions
): HoverPlan {
  if (!hover) return { kind: 'unavailable' }
  const mode = options?.hoverMode ?? { kind: HoverModeKind.POINT }
  const common = {
    metadata: hover,
    indicators: resolveIndicatorConfigs(options, mode),
    tooltip: resolveTooltip(options?.tooltip),
  }
  return mode.kind === HoverModeKind.GLYPH
    ? { kind: 'glyph', ...common }
    : { kind: 'data', mode, ...common }
}

function resetRenderEffects(svg: SVGSVGElement): void {
  hideTooltip(svg)
  hideXLine(svg)
  hideYLine(svg)
  clearSvg(svg)
}

function storeScenePresentation(
  scene: SceneNode,
  svg: SVGSVGElement,
  options?: RenderSvgSceneOptions
): void {
  const extendedSvg = svg as ExtendedSVGSVGElement
  if (options?.tooltipContext != null) {
    extendedSvg[TOOLTIP_CONTEXT_SYMBOL] = options.tooltipContext
  }
  extendedSvg[SERIES_STYLES_SYMBOL] = buildSeriesStylesFromScene(scene)
  extendedSvg[SERIES_POINT_SHAPES_SYMBOL] =
    buildSeriesPointShapesFromScene(scene)
}

function applyLegendPlan(
  plan: LegendPlan,
  scene: SceneNode,
  svg: SVGSVGElement,
  plotRect?: { x: number; y: number; width: number; height: number }
): void {
  if (plan.kind === 'disabled') {
    clearLegendArtifacts(svg)
    return
  }
  renderLegend(scene, svg, plan.options, plotRect, plan.host)
}

function warnEmptyPointIndex(pointIndex: Map<string, unknown>): void {
  if (pointIndex.size !== 0) return
  warnDev(
    '[owlplot] Hover requested point emphasis, but no glyphs were indexed. ' +
      'Check data-owlplot-* attributes.'
  )
}

function needsPointIndex(
  plan: Exclude<HoverPlan, { kind: 'unavailable' }>
): boolean {
  if (plan.kind === 'glyph') return true
  return plan.indicators.some(
    indicator => indicator.kind === HoverIndicatorKind.POINT_EMPHASIS
  )
}

function preparePointIndex(
  plan: Exclude<HoverPlan, { kind: 'unavailable' }>,
  svg: SVGSVGElement
): void {
  if (!needsPointIndex(plan)) return
  const pointIndex = buildPointIndexFromRenderedElements(svg)
  ;(svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] = pointIndex
  if (plan.indicators.some(isPointEmphasisIndicator)) {
    warnEmptyPointIndex(pointIndex)
  }
}

function isPointEmphasisIndicator(config: HoverIndicatorConfig): boolean {
  return config.kind === HoverIndicatorKind.POINT_EMPHASIS
}

function applyHoverPlan(plan: HoverPlan, svg: SVGSVGElement): void {
  if (plan.kind === 'unavailable') {
    detachAllHoverListeners(svg)
    return
  }
  detachAllHoverListeners(svg)
  preparePointIndex(plan, svg)
  const indicators = createIndicators(plan.indicators, svg)
  if (plan.kind === 'glyph') {
    attachGlyphHover(svg, plan.tooltip, plan.metadata, indicators)
    return
  }
  const resolver = createHoverResolver(plan.mode)
  attachDataHover(svg, resolver, indicators, plan.tooltip, plan.metadata)
}

export function renderSvgScene(
  scene: SceneNode,
  svg: SVGSVGElement,
  options?: RenderSvgSceneOptions
): void {
  const hover = hydrateSceneHover(scene)
  const legendPlan = resolveLegendPlan(options)
  const hoverPlan = resolveHoverPlan(hover, options)
  resetRenderEffects(svg)
  storeScenePresentation(scene, svg, options)
  appendNode(scene, svg, undefined, resolveAppendContext(hover))
  applyLegendPlan(legendPlan, scene, svg, hover?.plotRect)
  applyHoverPlan(hoverPlan, svg)
}

/**
 * End the render session for `svg`: detach hover listeners, remove the
 * renderer-owned tooltip container, clear legend artifacts and SVG
 * children, and delete session state stored on the element.
 * Host-owned DOM (the `svg` itself, its parent, unrelated elements) is
 * left in place. Safe to call more than once and on a fresh element.
 */
export function disposeSvgScene(svg: SVGSVGElement): void {
  detachAllHoverListeners(svg)
  removeTooltip(svg)
  clearLegendArtifacts(svg)
  clearSvg(svg)
  const extendedSvg = svg as ExtendedSVGSVGElement
  delete extendedSvg[POINT_INDEX_SYMBOL]
  delete extendedSvg[X_HOVER_LINE_SYMBOL]
  delete extendedSvg[Y_HOVER_LINE_SYMBOL]
  delete extendedSvg[TOOLTIP_CONTEXT_SYMBOL]
  delete extendedSvg[SERIES_STYLES_SYMBOL]
  delete extendedSvg[SERIES_POINT_SHAPES_SYMBOL]
}
