import type { SceneNode } from '@owlplot/core'
import type { TooltipRenderer } from '../tooltip/types'
import type { HoverMode } from '../hover/types'
import type { HoverIndicatorConfig } from '../hover/indicators/types'

import { clearSvg } from './svgDom'
import { appendNode } from './appendNode'

import { defaultTooltipRenderer } from '../tooltip/defaultTooltipRenderer'
import { hideTooltip } from '../tooltip/tooltipDom'

import { attachDataHover, attachGlyphHover } from '../hover/hoverManager'
import { createHoverResolver } from '../hover/resolvers'
import { createIndicators } from '../hover/indicators/indicators'
import { isHoverMetadata } from '../hover/types'
import { buildPointIndexFromRenderedElements } from '../hover/pointIndex'

import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import { POINT_INDEX_SYMBOL } from '../shared/symbols'
import {
  SceneMetadataKey,
  HoverModeKind,
  HoverIndicatorKind,
} from '../shared/enums'
import { hideXLine } from '../hover/indicators/xLine'
import { hideYLine } from '../hover/indicators/yLine'

export function renderSvgScene(
  scene: SceneNode,
  svg: SVGSVGElement,
  options?: {
    tooltip?: TooltipRenderer | null // null to disable tooltips
    hoverMode?: HoverMode
    hoverIndicator?: HoverIndicatorConfig | HoverIndicatorConfig[]
  }
): void {
  // Cleanup previous hover state
  hideTooltip(svg)
  hideXLine(svg)
  hideYLine(svg)

  clearSvg(svg)
  appendNode(scene, svg)

  const explicitHoverMode = options?.hoverMode
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

  // If explicit mode provided, use it
  if (explicitHoverMode) {
    // Default indicator based on explicit mode
    if (
      indicatorConfigs.length === 1 &&
      indicatorConfigs[0]!.kind === HoverIndicatorKind.NONE
    ) {
      if (explicitHoverMode.kind === HoverModeKind.POINT) {
        indicatorConfigs[0] = { kind: HoverIndicatorKind.POINT_EMPHASIS }
      } else if (explicitHoverMode.kind === HoverModeKind.X_AXIS) {
        indicatorConfigs[0] = { kind: HoverIndicatorKind.X_LINE }
      }
    }
    const finalIndicators = createIndicators(indicatorConfigs, svg)

    if (explicitHoverMode.kind === HoverModeKind.GLYPH) {
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
    ;(svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] =
      buildPointIndexFromRenderedElements(svg)
  }

  // Set default indicator for POINT mode fallback (POINT_EMPHASIS)
  let finalIndicatorConfigs = indicatorConfigs
  if (
    finalIndicatorConfigs.length === 1 &&
    finalIndicatorConfigs[0]!.kind === HoverIndicatorKind.NONE
  ) {
    finalIndicatorConfigs = [{ kind: HoverIndicatorKind.POINT_EMPHASIS }]
    // Build point index for default POINT_EMPHASIS indicator
    ;(svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] =
      buildPointIndexFromRenderedElements(svg)
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
