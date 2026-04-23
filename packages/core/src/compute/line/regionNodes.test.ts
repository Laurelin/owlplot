import { describe, expect, it } from 'vitest'
import type { CartesianSeries, DominanceRegionsConfig } from '../../config/types'
import { compileDominanceRegions } from './regionNodes'

const tiedSeries: CartesianSeries[] = [
  {
    id: 'A',
    points: [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
    ],
  },
  {
    id: 'B',
    points: [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
    ],
  },
  {
    id: 'C',
    points: [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
    ],
  },
]

describe('compileDominanceRegions', () => {
  it('uses stable-input tie-break by default', () => {
    const config: DominanceRegionsConfig = {
      seriesIds: ['B', 'A', 'C'],
      fills: [
        { type: 'solid', color: '#a7f3d0' },
        { type: 'solid', color: '#fde68a' },
      ],
    }
    const regions = compileDominanceRegions(config, tiedSeries)
    expect(regions).toHaveLength(2)
    expect(regions[0]).toMatchObject({
      lower: { type: 'series', id: 'B' },
      upper: { type: 'series', id: 'A' },
    })
    expect(regions[1]).toMatchObject({
      lower: { type: 'series', id: 'A' },
      upper: { type: 'series', id: 'C' },
    })
  })

  it('supports series-id tie-break', () => {
    const config: DominanceRegionsConfig = {
      seriesIds: ['B', 'A', 'C'],
      fills: [
        { type: 'solid', color: '#a7f3d0' },
        { type: 'solid', color: '#fde68a' },
      ],
      tieBreak: 'series-id',
    }
    const regions = compileDominanceRegions(config, tiedSeries)
    expect(regions).toHaveLength(2)
    expect(regions[0]).toMatchObject({
      lower: { type: 'series', id: 'A' },
      upper: { type: 'series', id: 'B' },
    })
    expect(regions[1]).toMatchObject({
      lower: { type: 'series', id: 'B' },
      upper: { type: 'series', id: 'C' },
    })
  })
})
