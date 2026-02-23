export const DEFAULT_AREA_FILL_OPACITY = 0.25

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function resolveAreaFillOpacity(
  seriesFillOpacity?: number,
  chartFillOpacity?: number
): number {
  const candidates = [seriesFillOpacity, chartFillOpacity]
  const firstFinite = candidates.find(
    (value): value is number => value !== undefined && Number.isFinite(value)
  )
  return clamp01(firstFinite ?? DEFAULT_AREA_FILL_OPACITY)
}

export function shouldSerializeFillOpacity(opacity: number): boolean {
  return opacity < 1
}
