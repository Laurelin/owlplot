import { describe, expect, it } from 'vitest'
import {
  DENSE_LINE_POINT_COUNT,
  buildDenseLinePoints,
} from '../scripts/dense-line-fixture'

describe('dense-line fixture', () => {
  it('uses one series size of ~50k points', () => {
    expect(DENSE_LINE_POINT_COUNT).toBe(50_000)
    const points = buildDenseLinePoints()
    expect(points).toHaveLength(50_000)
    expect(points[0]?.x).toBe(0)
    expect(points[49_999]?.x).toBe(49_999)
    expect(Number.isFinite(points[0]?.y)).toBe(true)
  })
})
