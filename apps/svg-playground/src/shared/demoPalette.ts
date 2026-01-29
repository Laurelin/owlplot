import type { LineSeries } from '@owlplot/core'

/**
 * Demo palette: 6–8 hex colors with perceptual distance.
 * No two adjacent blues; bias toward distinguishability.
 */
export const DEMO_PALETTE: readonly string[] = [
  '#2563eb', // blue
  '#dc2626', // red
  '#059669', // green
  '#d97706', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#b91c1c', // dark red
  '#047857', // dark green
] as const

/**
 * At series-construction time: assign palette color only when series
 * has no color and no paint. Never override explicit styling (Colors tab authority).
 */
export function withDemoColor(
  series: LineSeries,
  index: number
): LineSeries {
  if (series.paint || series.color) return series
  return { ...series, color: DEMO_PALETTE[index % DEMO_PALETTE.length] }
}
