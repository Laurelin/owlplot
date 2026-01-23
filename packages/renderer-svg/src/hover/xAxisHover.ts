import type { TooltipRenderer } from '../tooltip/types'
import { hideTooltip, showTooltip } from '../tooltip/tooltipDom'
import { ExtendedSVGSVGElement, type XAxisHoverListenerRef, type HoverPointRef } from '../shared/extendedElements'
import {
  POINT_INDEX_SYMBOL,
  X_AXIS_HOVER_LISTENERS_SYMBOL,
} from '../shared/symbols'
import type { HoverIndicator } from './indicators/types'
import { HoverIndicatorKind } from '../shared/enums'
import { resolveXAxisHover, type XAxisHoverMetadata } from './xAxisHoverResolve'
import { hideXLine, updateXLine } from './indicators/xLine'
import {
  emphasizePoints,
  restorePointEmphasis,
  type EmphasizedPoint,
} from './indicators/pointEmphasis'

export function removeXAxisHoverListeners(svg: SVGSVGElement) {
  const extendedSvg = svg as ExtendedSVGSVGElement
  const listeners = extendedSvg[X_AXIS_HOVER_LISTENERS_SYMBOL]
  if (!listeners) return

  svg.removeEventListener('mousemove', listeners.mousemove)
  svg.removeEventListener('mouseleave', listeners.mouseleave)
  extendedSvg[X_AXIS_HOVER_LISTENERS_SYMBOL] = undefined
}

function hideHoverIndicator(svg: SVGSVGElement, indicator: HoverIndicator) {
  if (
    indicator.kind === HoverIndicatorKind.X_LINE ||
    indicator.kind === HoverIndicatorKind.Y_LINE
  ) {
    hideXLine(svg)
  }
}

function cleanupHover(
  svg: SVGSVGElement,
  indicator: HoverIndicator,
  emphasized: EmphasizedPoint[]
) {
  hideTooltip(svg)
  hideHoverIndicator(svg, indicator)
  restorePointEmphasis(emphasized)
}

export function attachXAxisHoverListeners(
  svg: SVGSVGElement,
  renderer: TooltipRenderer,
  hoverMetadata: XAxisHoverMetadata,
  indicator: HoverIndicator
) {
  removeXAxisHoverListeners(svg)

  const extendedSvg = svg as ExtendedSVGSVGElement
  const pointIndex =
    extendedSvg[POINT_INDEX_SYMBOL] ?? new Map<string, HoverPointRef[]>()

  let emphasizedPoints: EmphasizedPoint[] = []

  const handleMouseMove = (event: MouseEvent) => {
    const svgRect = svg.getBoundingClientRect()
    const hoverResult = resolveXAxisHover(event, svg, svgRect, hoverMetadata)

    if (!hoverResult) {
      cleanupHover(svg, indicator, emphasizedPoints)
      emphasizedPoints = []
      return
    }

    restorePointEmphasis(emphasizedPoints)
    showTooltip(hoverResult.tooltipDatum, event, svg, renderer)

    if (indicator.kind === HoverIndicatorKind.X_LINE) {
      updateXLine(
        svg,
        hoverResult.clampedSvgX,
        hoverMetadata.plotRect,
        indicator.style
      )
      emphasizedPoints = []
      return
    }

    if (indicator.kind === HoverIndicatorKind.POINT_EMPHASIS) {
      emphasizedPoints = emphasizePoints(
        hoverResult.nearestPoints,
        pointIndex,
        indicator.radius ?? 5,
        indicator.animation
      )
      return
    }

    emphasizedPoints = []
  }

  const handleMouseLeave = () => {
    cleanupHover(svg, indicator, emphasizedPoints)
    emphasizedPoints = []
  }

  svg.addEventListener('mousemove', handleMouseMove)
  svg.addEventListener('mouseleave', handleMouseLeave)

  extendedSvg[X_AXIS_HOVER_LISTENERS_SYMBOL] = {
    mousemove: handleMouseMove,
    mouseleave: handleMouseLeave,
  }
}
