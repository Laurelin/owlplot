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
