import type { TooltipDatum, HoverSeries } from '@owlplot/core'
import { binarySearchNearestByX } from '../shared/binarySearchNearestByX'
import { TooltipKind } from '../shared/enums'

export type XAxisHoverMetadata = {
  xInvert: (px: number) => number
  scales: { x: (v: number) => number; y: (v: number) => number }
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  series: HoverSeries[]
}

export type XAxisHoverResult = {
  domainX: number
  clampedSvgX: number
  nearestPoints: Array<{ seriesId: string; point: { x: number; y: number } }>
  tooltipDatum: TooltipDatum
} | null

export function isXAxisHoverMetadata(
  value: unknown
): value is XAxisHoverMetadata {
  return (
    typeof value === 'object' &&
    value !== null &&
    'xInvert' in value &&
    'scales' in value &&
    'plotRect' in value &&
    'xDomain' in value &&
    'series' in value &&
    typeof (value as { xInvert: unknown }).xInvert === 'function' &&
    typeof (value as { scales: unknown }).scales === 'object' &&
    typeof (value as { plotRect: unknown }).plotRect === 'object' &&
    Array.isArray((value as { series: unknown }).series)
  )
}

export function resolveXAxisHover(
  event: MouseEvent,
  svg: SVGSVGElement,
  svgRect: DOMRect,
  hoverMetadata: XAxisHoverMetadata
): XAxisHoverResult {
  const svgX = event.clientX - svgRect.left
  const svgY = event.clientY - svgRect.top

  if (
    svgX < hoverMetadata.plotRect.x ||
    svgX > hoverMetadata.plotRect.x + hoverMetadata.plotRect.width ||
    svgY < hoverMetadata.plotRect.y ||
    svgY > hoverMetadata.plotRect.y + hoverMetadata.plotRect.height
  ) {
    return null
  }

  const clampedSvgX = Math.max(
    hoverMetadata.plotRect.x,
    Math.min(hoverMetadata.plotRect.x + hoverMetadata.plotRect.width, svgX)
  )

  const domainX = hoverMetadata.xInvert(clampedSvgX)
  const [xMin, xMax] = hoverMetadata.xDomain
  const clampedX = Math.max(xMin, Math.min(xMax, domainX))

  const seriesData: Record<string, number> = {}
  const nearestPoints: Array<{
    seriesId: string
    point: { x: number; y: number }
  }> = []

  for (const series of hoverMetadata.series) {
    if (!series.sortedPoints || series.sortedPoints.length === 0) continue
    const nearest = binarySearchNearestByX(series.sortedPoints, clampedX)
    if (!nearest) continue
    seriesData[series.id] = nearest.y
    nearestPoints.push({ seriesId: series.id, point: nearest })
  }

  return {
    domainX: clampedX,
    clampedSvgX,
    nearestPoints,
    tooltipDatum: {
      kind: TooltipKind.X_AXIS,
      values: { x: clampedX, ...seriesData },
    },
  }
}
