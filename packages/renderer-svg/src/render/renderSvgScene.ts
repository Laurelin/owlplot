import type { SceneNode } from '@owlplot/core'
import type { TooltipRenderer } from '../tooltip/types'
import type { HoverMode } from '../hover/types'
import type { HoverIndicator } from '../hover/indicators/types'

import { clearSvg } from './svgDom'
import { appendNode } from './appendNode'

import { defaultTooltipRenderer } from '../tooltip/defaultTooltipRenderer'
import { hideTooltip } from '../tooltip/tooltipDom'

import { attachNodeHoverListeners, removeNodeHoverListeners } from '../hover/nodeHover'
import { attachXAxisHoverListeners, removeXAxisHoverListeners } from '../hover/xAxisHover'
import { buildPointIndexFromRenderedElements } from '../hover/pointIndex'
import { isXAxisHoverMetadata } from '../hover/xAxisHoverResolve'

import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import { POINT_INDEX_SYMBOL } from '../shared/symbols'
import { SceneMetadataKey, HoverModeKind, HoverIndicatorKind } from '../shared/enums'
import { hideXLine } from '../hover/indicators/xLine'

export function renderSvgScene(
  scene: SceneNode,
  svg: SVGSVGElement,
  options?: {
    tooltip?: TooltipRenderer
    hoverMode?: HoverMode
    hoverIndicator?: HoverIndicator
  }
): void {
  removeXAxisHoverListeners(svg)
  removeNodeHoverListeners(svg)
  hideTooltip(svg)
  hideXLine(svg)

  clearSvg(svg)
  appendNode(scene, svg)

  const hoverMode = options?.hoverMode ?? { kind: HoverModeKind.NODE }
  const resolvedHoverIndicator =
    options?.hoverIndicator ??
    (hoverMode.kind === HoverModeKind.X_AXIS ? { kind: HoverIndicatorKind.X_LINE } : { kind: HoverIndicatorKind.NONE })

  const tooltipRenderer = options?.tooltip ?? defaultTooltipRenderer

  if (hoverMode.kind === HoverModeKind.X_AXIS && resolvedHoverIndicator.kind === HoverIndicatorKind.POINT_EMPHASIS) {
    ;(svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] = buildPointIndexFromRenderedElements(svg)
  }

  if (hoverMode.kind === HoverModeKind.NODE) {
    attachNodeHoverListeners(svg, tooltipRenderer)
    return
  }

  if (hoverMode.kind === HoverModeKind.X_AXIS) {
    const hoverMetadata = scene.metadata?.[SceneMetadataKey.HOVER]
    if (isXAxisHoverMetadata(hoverMetadata)) {
      attachXAxisHoverListeners(svg, tooltipRenderer, hoverMetadata, resolvedHoverIndicator)
    }
  }
}
