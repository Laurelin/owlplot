import type {
  HoverIndicator,
  IndicatorHandle,
  HoverIndicatorConfig,
} from './types'
import { HoverIndicatorKind } from '../../shared/enums'
import {
  emphasizePoints,
  restorePointEmphasis,
  type PointEmphasisResult,
} from './pointEmphasis'
import { updateXLine, hideXLine } from './xLine'
import { updateYLine, hideYLine } from './yLine'
import type { PointIndex } from '../types'
import { ExtendedSVGSVGElement } from '../../shared/extendedElements'
import { POINT_INDEX_SYMBOL } from '../../shared/symbols'

/**
 * Create indicator implementations from config.
 */
export function createIndicators(
  config: HoverIndicatorConfig[],
  svg: SVGSVGElement
): HoverIndicator[] {
  const indicators: HoverIndicator[] = []

  for (const indicatorConfig of config) {
    if (indicatorConfig.kind === HoverIndicatorKind.NONE) {
      continue
    }

    switch (indicatorConfig.kind) {
      case HoverIndicatorKind.POINT_EMPHASIS: {
        const pointIndex: PointIndex | undefined = (
          svg as ExtendedSVGSVGElement
        )[POINT_INDEX_SYMBOL]
        indicators.push({
          id: 'point-emphasis',
          render(result, context) {
            if (result.kind !== 'points') return null as IndicatorHandle
            const emphasisResult = emphasizePoints(
              result.points,
              {
                scales: context.scales,
                pointIndex,
              },
              context.svg,
              indicatorConfig.radius ?? 5,
              indicatorConfig.animation
            )
            return emphasisResult as IndicatorHandle
          },
          restore(handle) {
            if (handle) {
              restorePointEmphasis(handle as PointEmphasisResult)
            }
          },
        })
        break
      }
      case HoverIndicatorKind.X_LINE: {
        const svgRef = svg
        indicators.push({
          id: 'x-line',
          render(result, context) {
            if (result.kind !== 'points' || result.points.length === 0) {
              hideXLine(svgRef)
              return null as IndicatorHandle
            }
            const primaryPoint = result.points[result.primaryIndex]
            if (!primaryPoint) {
              hideXLine(svgRef)
              return null as IndicatorHandle
            }
            const svgX = context.scales.x(primaryPoint.point.x)
            updateXLine(svgRef, svgX, context.plotRect, indicatorConfig.style)
            return { type: 'x-line' } as IndicatorHandle
          },
          restore() {
            hideXLine(svgRef)
          },
        })
        break
      }
      case HoverIndicatorKind.Y_LINE: {
        const svgRef = svg
        indicators.push({
          id: 'y-line',
          render(result, context) {
            if (result.kind !== 'points' || result.points.length === 0) {
              hideYLine(svgRef)
              return null as IndicatorHandle
            }
            const primaryPoint = result.points[result.primaryIndex]
            if (!primaryPoint) {
              hideYLine(svgRef)
              return null as IndicatorHandle
            }
            const svgY = context.scales.y(primaryPoint.point.y)
            updateYLine(svgRef, svgY, context.plotRect, indicatorConfig.style)
            return { type: 'y-line' } as IndicatorHandle
          },
          restore() {
            hideYLine(svgRef)
          },
        })
        break
      }
    }
  }

  return indicators
}
