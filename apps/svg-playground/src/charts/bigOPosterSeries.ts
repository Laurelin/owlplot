import type { DataPoint } from '@owlplot/core'

export type BigOClass =
  | 'O(1)'
  | 'O(log n)'
  | 'O(n)'
  | 'O(n log n)'
  | 'O(n^2)'
  | 'O(2^n)'
  | 'O(n!)'

export type BigOPosterSeries = {
  readonly id: BigOClass
  readonly points: DataPoint[]
}

export const BIG_O_CLASS_ORDER: readonly BigOClass[] = [
  'O(1)',
  'O(log n)',
  'O(n)',
  'O(n log n)',
  'O(n^2)',
  'O(2^n)',
  'O(n!)',
] as const

type BigOPosterSeriesOptions = {
  sampleCount?: number
  bandGap?: number
}

type ShapeFn = (t: number) => number

function normalizedExp(t: number, intensity: number): number {
  const numerator = Math.exp(intensity * t) - 1
  const denominator = Math.exp(intensity) - 1
  return denominator === 0 ? 0 : numerator / denominator
}

function buildShapeMap(): Record<BigOClass, ShapeFn> {
  const logK = 9
  const nlognNorm = Math.log1p(logK)

  return {
    'O(1)': () => 0.15,
    'O(log n)': t => Math.log1p(logK * t) / Math.log1p(logK),
    'O(n)': t => t,
    'O(n log n)': t => (t * Math.log1p(logK * t)) / nlognNorm,
    'O(n^2)': t => t * t,
    'O(2^n)': t => normalizedExp(t, 5.2),
    'O(n!)': t => normalizedExp(t * t, 9.4),
  }
}

function buildTValues(sampleCount: number): number[] {
  const points = Math.max(2, Math.floor(sampleCount))
  const denominator = points - 1
  return Array.from({ length: points }, (_, index) => index / denominator)
}

export function createBigOPosterSeries(
  options: BigOPosterSeriesOptions = {}
): BigOPosterSeries[] {
  const sampleCount = options.sampleCount ?? 14
  const bandGap = options.bandGap ?? 0.012
  const classCount = BIG_O_CLASS_ORDER.length
  const totalGap = bandGap * (classCount - 1)
  if (totalGap >= 1) {
    throw new Error('createBigOPosterSeries: bandGap is too large for class count.')
  }
  const bandHeight = (1 - totalGap) / classCount
  const tValues = buildTValues(sampleCount)
  const shapeMap = buildShapeMap()

  return BIG_O_CLASS_ORDER.map((id, rank) => {
    const bandMin = rank * (bandHeight + bandGap)
    const shape = shapeMap[id]

    const points = tValues.map(t => ({
      x: t,
      y: bandMin + shape(t) * bandHeight,
    }))

    return { id, points }
  })
}

