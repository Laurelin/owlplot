import type { SceneNode, PointShape } from '@owlplot/core'
import { SceneNodeKind } from '@owlplot/core'
import type {
  TooltipRenderer,
  TooltipContext,
  HoverSeriesStyle,
} from '../tooltip/types'
import type { HoverMode } from '../hover/types'
import type { HoverIndicatorConfig } from '../hover/indicators/types'

import { clearSvg } from './svgDom'
import { appendNode, type AppendNodeContext } from './appendNode'
import {
  clearLegendArtifacts,
  renderLegend,
  type LegendOptions,
} from './legend'

import { defaultTooltipRenderer } from '../tooltip/defaultTooltipRenderer'
import { hideTooltip } from '../tooltip/tooltipDom'

import {
  attachDataHover,
  attachGlyphHover,
  detachAllHoverListeners,
} from '../hover/hoverManager'
import { createHoverResolver } from '../hover/resolvers'
import { createIndicators } from '../hover/indicators/indicators'
import { isHoverMetadata } from '../hover/types'
import { buildPointIndexFromRenderedElements } from '../hover/pointIndex'

import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  POINT_INDEX_SYMBOL,
  TOOLTIP_CONTEXT_SYMBOL,
  SERIES_STYLES_SYMBOL,
  SERIES_POINT_SHAPES_SYMBOL,
  HIDDEN_SERIES_IDS_SYMBOL,
} from '../shared/symbols'
import {
  SceneMetadataKey,
  HoverModeKind,
  HoverIndicatorKind,
} from '../shared/enums'
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
  if (stroke.type === 'solid' && stroke.color) return stroke.color
  if (
    (stroke.type === 'linear' || stroke.type === 'radial') &&
    stroke.stops?.[0]
  )
    return stroke.stops[0].color
  return undefined
}

/**
 * Walk scene and build seriesId → HoverSeriesStyle from nodes with id like "series:<id>".
 * Stroke is resolved to a single color string (solid or first stop of gradient).
 */
function buildSeriesStylesFromScene(
  scene: SceneNode
): Map<string, HoverSeriesStyle> {
  const map = new Map<string, HoverSeriesStyle>()
  function walk(node: SceneNode) {
    if (node.id.startsWith('series:') && node.style?.stroke) {
      const seriesId = node.id.slice(7)
      const color = strokeToSwatchColor(
        node.style.stroke as {
          type: string
          color?: string
          stops?: readonly { color: string }[]
        }
      )
      if (color) map.set(seriesId, { stroke: color })
    }
    if (node.kind === SceneNodeKind.GROUP) {
      node.children.forEach(walk)
    }
  }
  walk(scene)
  return map
}

/**
 * Walk scene and build seriesId → PointShape from POINT nodes (id: "point:seriesId:index").
 * Used for overlay emphasis default shape when point nodes exist; empty when showPoints: false.
 */
function buildSeriesPointShapesFromScene(
  scene: SceneNode
): Map<string, PointShape> {
  const map = new Map<string, PointShape>()
  function walk(node: SceneNode) {
    if (node.kind === SceneNodeKind.POINT && node.id.startsWith('point:')) {
      const parts = node.id.split(':')
      if (parts.length >= 2) {
        const seriesId = parts[1]
        if (seriesId && node.point?.shape) map.set(seriesId, node.point.shape)
      }
    }
    if (node.kind === SceneNodeKind.GROUP) {
      node.children.forEach(walk)
    }
  }
  walk(scene)
  return map
}

export function renderSvgScene(
  scene: SceneNode,
  svg: SVGSVGElement,
  options?: {
    tooltip?: TooltipRenderer | null // null to disable tooltips
    tooltipContext?: TooltipContext
    hoverMode?: HoverMode
    hoverIndicator?: HoverIndicatorConfig | HoverIndicatorConfig[]
    legend?: LegendOptions | boolean | null
    legendHost?: HTMLElement
  }
): void {
  // Cleanup previous hover state
  hideTooltip(svg)
  hideXLine(svg)
  hideYLine(svg)

  const extendedSvg = svg as ExtendedSVGSVGElement
  if (options?.tooltipContext != null) {
    extendedSvg[TOOLTIP_CONTEXT_SYMBOL] = options.tooltipContext
  }
  extendedSvg[SERIES_STYLES_SYMBOL] = buildSeriesStylesFromScene(scene)
  extendedSvg[SERIES_POINT_SHAPES_SYMBOL] =
    buildSeriesPointShapesFromScene(scene)
  const hiddenSeriesIds = extendedSvg[HIDDEN_SERIES_IDS_SYMBOL] ?? new Set()
  extendedSvg[HIDDEN_SERIES_IDS_SYMBOL] = hiddenSeriesIds

  clearSvg(svg)
  const hoverMeta = scene.metadata?.[SceneMetadataKey.HOVER] as
    | {
        scales:
          | { x: (v: number) => number; y: (v: number) => number }
          | {
              x: (v: number) => number
              yLeft: (v: number) => number
              yRight: (v: number) => number
            }
        series: Array<{ id: string; yAxis: 'left' | 'right' }>
        plotRect: { x: number; y: number; width: number; height: number }
      }
    | undefined
  const seriesYAxis =
    hoverMeta?.series != null
      ? Object.fromEntries(hoverMeta.series.map(s => [s.id, s.yAxis]))
      : undefined
  const appendContext: AppendNodeContext | undefined =
    hoverMeta?.scales != null
      ? { scales: hoverMeta.scales, seriesYAxis: seriesYAxis ?? {} }
      : undefined
  appendNode(scene, svg, undefined, appendContext)
  const legendOption = options?.legend
  const legendDisabled =
    legendOption === null ||
    legendOption === false ||
    (typeof legendOption === 'object' && legendOption.placement === 'none')
  if (!legendDisabled) {
    const legendOptions: LegendOptions =
      typeof legendOption === 'object' ? legendOption : {}
    renderLegend(
      scene,
      svg,
      hiddenSeriesIds,
      legendOptions,
      hoverMeta?.plotRect,
      options?.legendHost
    )
  } else {
    clearLegendArtifacts(svg)
  }

  const explicitHoverMode = options?.hoverMode
  const hasExplicitIndicator = options?.hoverIndicator !== undefined
  const hoverIndicatorConfig = options?.hoverIndicator ?? {
    kind: HoverIndicatorKind.NONE,
  }
  const indicatorConfigs = Array.isArray(hoverIndicatorConfig)
    ? hoverIndicatorConfig
    : [hoverIndicatorConfig]

  // tooltip can be null to disable tooltips, undefined uses default, or a custom renderer
  const tooltipRenderer =
    options?.tooltip === null
      ? null
      : (options?.tooltip ?? defaultTooltipRenderer)

  // Get hover metadata
  const hoverMetadata = scene.metadata?.[SceneMetadataKey.HOVER]
  if (!isHoverMetadata(hoverMetadata)) {
    // No hover metadata available - cannot attach hover
    return
  }

  detachAllHoverListeners(svg)

  // If explicit mode provided, use it
  if (explicitHoverMode) {
    // Default indicator based on explicit mode only when user did not pass hoverIndicator
    if (
      !hasExplicitIndicator &&
      indicatorConfigs.length === 1 &&
      indicatorConfigs[0]!.kind === HoverIndicatorKind.NONE
    ) {
      if (explicitHoverMode.kind === HoverModeKind.POINT) {
        indicatorConfigs[0] = { kind: HoverIndicatorKind.POINT_EMPHASIS }
      } else if (explicitHoverMode.kind === HoverModeKind.X_AXIS) {
        indicatorConfigs[0] = { kind: HoverIndicatorKind.X_LINE }
      }
    }
    const explicitNeedsPointIndex = indicatorConfigs.some(
      c => c.kind === HoverIndicatorKind.POINT_EMPHASIS
    )
    if (explicitNeedsPointIndex) {
      const pointIndex = buildPointIndexFromRenderedElements(svg)
      ;(svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] = pointIndex
      if (process.env.NODE_ENV !== 'production' && pointIndex.size === 0) {
        console.warn(
          '[owlplot] Hover requested point emphasis, but no glyphs were indexed. ' +
            'Check data-owlplot-* attributes.'
        )
      }
    }
    const finalIndicators = createIndicators(indicatorConfigs, svg)

    if (explicitHoverMode.kind === HoverModeKind.GLYPH) {
      const pointIndex = buildPointIndexFromRenderedElements(svg)
      ;(svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] = pointIndex
      attachGlyphHover(svg, tooltipRenderer, hoverMetadata, finalIndicators)
      return
    }

    // Data-driven modes (POINT, X_AXIS, Y_AXIS)
    const resolver = createHoverResolver(explicitHoverMode, hoverMetadata)
    attachDataHover(
      svg,
      resolver,
      finalIndicators,
      tooltipRenderer,
      hoverMetadata
    )
    return
  }

  // Default behavior: try GLYPH → POINT fallback chain
  // Build point index if needed (optional optimization)
  const needsPointIndex = indicatorConfigs.some(
    config => config.kind === HoverIndicatorKind.POINT_EMPHASIS
  )
  if (needsPointIndex) {
    const pointIndex = buildPointIndexFromRenderedElements(svg)
    ;(svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] = pointIndex
    if (process.env.NODE_ENV !== 'production' && pointIndex.size === 0) {
      console.warn(
        '[owlplot] Hover requested point emphasis, but no glyphs were indexed. ' +
          'Check data-owlplot-* attributes.'
      )
    }
  }

  // Set default indicator for POINT mode fallback (POINT_EMPHASIS)
  let finalIndicatorConfigs = indicatorConfigs
  if (
    finalIndicatorConfigs.length === 1 &&
    finalIndicatorConfigs[0]!.kind === HoverIndicatorKind.NONE
  ) {
    finalIndicatorConfigs = [{ kind: HoverIndicatorKind.POINT_EMPHASIS }]
    const pointIndex = buildPointIndexFromRenderedElements(svg)
    ;(svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] = pointIndex
    if (process.env.NODE_ENV !== 'production' && pointIndex.size === 0) {
      console.warn(
        '[owlplot] Hover requested point emphasis, but no glyphs were indexed. ' +
          'Check data-owlplot-* attributes.'
      )
    }
  }
  const finalIndicators = createIndicators(finalIndicatorConfigs, svg)

  // Try GLYPH first
  const hasGlyphs = attachGlyphHover(
    svg,
    tooltipRenderer,
    hoverMetadata,
    finalIndicators
  )
  if (hasGlyphs) {
    return
  }

  // Fallback to POINT (data-driven, no glyphs required)
  const pointResolver = createHoverResolver(
    { kind: HoverModeKind.POINT },
    hoverMetadata
  )
  attachDataHover(
    svg,
    pointResolver,
    finalIndicators,
    tooltipRenderer,
    hoverMetadata
  )

  // Note: X_AXIS is available as an explicit mode option.
  // POINT should always work if there's data, so X_AXIS fallback is not needed here.
}
