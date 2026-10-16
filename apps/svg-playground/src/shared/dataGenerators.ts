import type { DataPoint } from '@owlplot/core'

// Pre-computed datasets for deterministic rendering
// Randomness is demo poison - breaks reproducibility, screenshots, visual diffs

const temperature: readonly DataPoint[] = [
  { x: 0, y: 15 },
  { x: 1, y: 18 },
  { x: 2, y: 22 },
  { x: 3, y: 20 },
  { x: 4, y: 25 },
  { x: 5, y: 23 },
  { x: 6, y: 28 },
  { x: 7, y: 26 },
]

const humidity: readonly DataPoint[] = [
  { x: 0, y: 60 },
  { x: 1, y: 65 },
  { x: 2, y: 70 },
  { x: 3, y: 68 },
  { x: 4, y: 75 },
  { x: 5, y: 72 },
  { x: 6, y: 80 },
  { x: 7, y: 78 },
]

// Dense data (50 points) - deterministic pattern
const dense: readonly DataPoint[] = Array.from({ length: 50 }, (_, i) => ({
  x: i,
  y: 100 + Math.sin(i / 5) * 30 + (i % 3) * 5,
}))

export const PRECOMPUTED_DATASETS = {
  temperature,
  humidity,
  dense,
} as const

export type SampleFunctionOptions = {
  yCap?: number
  yFloor?: number
  includeInvalid?: boolean
}

type SampledValue =
  { readonly kind: 'include'; readonly y: number } | { readonly kind: 'skip' }

function hasValidRange(xMin: number, xMax: number, step: number): boolean {
  return (
    Number.isFinite(xMin) && Number.isFinite(xMax) && step > 0 && xMax >= xMin
  )
}

function isRejectedValue(y: number, yFloor: number): boolean {
  return !Number.isFinite(y) || y <= yFloor
}

function exceedsCap(y: number, yCap: number | undefined): yCap is number {
  return yCap !== undefined && y > yCap
}

function resolveSampledValue(
  y: number,
  options: Required<Pick<SampleFunctionOptions, 'yFloor' | 'includeInvalid'>> &
    Pick<SampleFunctionOptions, 'yCap'>
): SampledValue {
  if (isRejectedValue(y, options.yFloor)) {
    return options.includeInvalid ? { kind: 'include', y } : { kind: 'skip' }
  }
  if (exceedsCap(y, options.yCap)) {
    return { kind: 'include', y: options.yCap }
  }
  return { kind: 'include', y }
}

/**
 * Deterministically sample a function on [xMin, xMax] using step increments.
 * Defaults are conservative for chart rendering:
 * - invalid values are skipped
 * - non-positive y values are skipped (log-scale friendly)
 */
export function sampleFunction(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  step: number,
  options: SampleFunctionOptions = {}
): DataPoint[] {
  const { yCap, yFloor = 0, includeInvalid = false } = options
  const points: DataPoint[] = []
  if (!hasValidRange(xMin, xMax, step)) return points

  const count = Math.floor((xMax - xMin) / step)
  for (let i = 0; i <= count; i++) {
    const x = xMin + i * step
    const sampled = resolveSampledValue(fn(x), { yCap, yFloor, includeInvalid })
    if (sampled.kind === 'include') points.push({ x, y: sampled.y })
  }

  return points
}
