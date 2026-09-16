import type { CartesianSeries } from '../../config/types'
import type { CartesianScales } from '../cartesian2d/layout'
import type { ContinuousScaleDescriptor } from '../cartesian2d/scale'
import { toScaleDescriptor } from '../cartesian2d/scale'

/**
 * Core -> Renderer Contract for Hover Metadata:
 *
 * hover.sortedPoints:
 * - filtered (finite x/y, y !== null)
 * - sorted ascending by x
 * - immutable for renderer lifetime (frozen)
 *
 * Renderer MUST use sortedPoints directly - NO per-hover sorting or filtering.
 * This is a one-time cost during scene computation, not per mousemove.
 *
 * scales: serializable descriptors only (no forward/invert). Renderer hydrates
 * via createScaleFromDescriptor at consume time.
 */
export type HoverSeries = {
  id: string
  yAxis: 'left' | 'right'
  sortedPoints: ReadonlyArray<{ x: number; y: number }>
}

export type HoverMetadataSingle = {
  scales: { x: ContinuousScaleDescriptor; y: ContinuousScaleDescriptor }
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  yDomain: [number, number]
  series: HoverSeries[]
}

export type HoverMetadataDual = {
  scales: {
    x: ContinuousScaleDescriptor
    yLeft: ContinuousScaleDescriptor
    yRight: ContinuousScaleDescriptor
  }
  yDomainLeft: [number, number]
  yDomainRight: [number, number]
  plotRect: { x: number; y: number; width: number; height: number }
  xDomain: [number, number]
  series: HoverSeries[]
}

export type HoverMetadata = HoverMetadataSingle | HoverMetadataDual

function isNumberPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  )
}

function isScaleDescriptor(value: unknown): value is ContinuousScaleDescriptor {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  if (!isNumberPair(d.domain) || !isNumberPair(d.range)) return false
  return isScaleKind(d)
}

function isScaleKind(
  value: Record<string, unknown>
): value is Record<string, unknown> & ContinuousScaleDescriptor {
  switch (value.type) {
    case 'linear':
      return true
    case 'log':
      return typeof value.base === 'number'
    default:
      return false
  }
}

function isHoverEnvelope(value: unknown): value is Record<string, unknown> & {
  scales: Record<string, unknown>
  series: unknown[]
} {
  if (typeof value !== 'object' || value === null) return false
  const metadata = value as Record<string, unknown>
  if (typeof metadata.scales !== 'object' || metadata.scales === null) {
    return false
  }
  return Array.isArray(metadata.series)
}

function hasCommonHoverFields(
  metadata: Record<string, unknown> & {
    scales: Record<string, unknown>
    series: unknown[]
  }
): boolean {
  return (
    'plotRect' in metadata &&
    isNumberPair(metadata.xDomain) &&
    isScaleDescriptor(metadata.scales.x)
  )
}

function isDualHoverMetadata(
  metadata: Record<string, unknown> & {
    scales: Record<string, unknown>
    series: unknown[]
  }
): boolean {
  const { scales } = metadata
  return (
    isScaleDescriptor(scales.yLeft) &&
    isScaleDescriptor(scales.yRight) &&
    isNumberPair(metadata.yDomainLeft) &&
    isNumberPair(metadata.yDomainRight)
  )
}

function isSingleHoverMetadata(
  metadata: Record<string, unknown> & {
    scales: Record<string, unknown>
    series: unknown[]
  }
): boolean {
  return isScaleDescriptor(metadata.scales.y) && isNumberPair(metadata.yDomain)
}

/** Type guard: accepts serializable descriptor-shaped hover metadata from the scene. */
export function isHoverMetadata(value: unknown): value is HoverMetadata {
  if (!isHoverEnvelope(value)) return false
  if (!hasCommonHoverFields(value)) return false
  return 'yLeft' in value.scales && 'yRight' in value.scales
    ? isDualHoverMetadata(value)
    : isSingleHoverMetadata(value)
}

function buildHoverSeries(
  series: CartesianSeries,
  axisMode: 'single' | 'dual'
): HoverSeries {
  const validPoints = series.points
    .filter(
      point =>
        point.y !== null && Number.isFinite(point.x) && Number.isFinite(point.y)
    )
    .map(point => ({ x: point.x, y: point.y! }))
    .sort((a, b) => a.x - b.x)
  return {
    id: series.id,
    yAxis: axisMode === 'dual' ? (series.yAxis ?? 'left') : 'left',
    sortedPoints: Object.freeze(validPoints),
  }
}

function buildDualHoverMetadata(
  seriesList: CartesianSeries[],
  scales: Extract<CartesianScales, { yLeft: unknown }>,
  plotRect: { x: number; y: number; width: number; height: number },
  xDomain: [number, number],
  yDomainLeft: [number, number],
  yDomainRight: [number, number]
): HoverMetadataDual {
  return {
    scales: {
      x: toScaleDescriptor(scales.x),
      yLeft: toScaleDescriptor(scales.yLeft),
      yRight: toScaleDescriptor(scales.yRight),
    },
    yDomainLeft,
    yDomainRight,
    plotRect,
    xDomain,
    series: seriesList.map(series => buildHoverSeries(series, 'dual')),
  }
}

function buildSingleHoverMetadata(
  seriesList: CartesianSeries[],
  scales: Extract<CartesianScales, { y: unknown }>,
  plotRect: { x: number; y: number; width: number; height: number },
  xDomain: [number, number],
  yDomain: [number, number]
): HoverMetadataSingle {
  return {
    scales: {
      x: toScaleDescriptor(scales.x),
      y: toScaleDescriptor(scales.y),
    },
    plotRect,
    xDomain,
    yDomain,
    series: seriesList.map(series => buildHoverSeries(series, 'single')),
  }
}

export function buildHoverMetadata(
  seriesList: CartesianSeries[],
  scales: CartesianScales,
  plotRect: { x: number; y: number; width: number; height: number },
  xDomain: [number, number],
  yDomain: [number, number],
  yDomainLeft?: [number, number],
  yDomainRight?: [number, number]
): HoverMetadata {
  if ('yLeft' in scales && 'yRight' in scales) {
    return buildDualHoverMetadata(
      seriesList,
      scales,
      plotRect,
      xDomain,
      yDomainLeft!,
      yDomainRight!
    )
  }
  return buildSingleHoverMetadata(
    seriesList,
    scales,
    plotRect,
    xDomain,
    yDomain
  )
}
