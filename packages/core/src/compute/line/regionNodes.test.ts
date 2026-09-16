import { describe, expect, it } from 'vitest'
import type {
  CartesianSeries,
  DominanceRegionsConfig,
} from '../../config/types'
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

  it('splits rankings at pairwise intersections', () => {
    const crossing: CartesianSeries[] = [
      {
        id: 'rising',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      },
      {
        id: 'falling',
        points: [
          { x: 0, y: 10 },
          { x: 10, y: 0 },
        ],
      },
    ]
    const regions = compileDominanceRegions(
      {
        seriesIds: ['rising', 'falling'],
        fills: [{ type: 'solid', color: '#ddd' }],
      },
      crossing
    )

    expect(regions).toHaveLength(2)
    expect(regions.map(region => [region.xMin, region.xMax])).toEqual([
      [0, 5],
      [5, 10],
    ])
    expect(regions.map(region => region.lower)).toEqual([
      { type: 'series', id: 'rising' },
      { type: 'series', id: 'falling' },
    ])
  })

  it('rejects incomplete or geometrically invalid dominance inputs', () => {
    const fill = [{ type: 'solid', color: '#ddd' }] as const
    const nonMonotone: CartesianSeries[] = [
      tiedSeries[0]!,
      {
        id: 'bad',
        points: [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
        ],
      },
    ]
    const disjoint: CartesianSeries[] = [
      tiedSeries[0]!,
      {
        id: 'late',
        points: [
          { x: 2, y: 0 },
          { x: 3, y: 1 },
        ],
      },
    ]
    const mixedAxes: CartesianSeries[] = [
      tiedSeries[0]!,
      { ...tiedSeries[1]!, yAxis: 'right' },
    ]

    expect(compileDominanceRegions(undefined, tiedSeries)).toEqual([])
    expect(
      compileDominanceRegions(
        { seriesIds: ['A'], fills: [...fill] },
        tiedSeries
      )
    ).toEqual([])
    expect(
      compileDominanceRegions({ seriesIds: ['A', 'B'], fills: [] }, tiedSeries)
    ).toEqual([])
    expect(
      compileDominanceRegions(
        { seriesIds: ['A', 'missing'], fills: [...fill] },
        tiedSeries
      )
    ).toEqual([])
    expect(
      compileDominanceRegions(
        { seriesIds: ['A', 'bad'], fills: [...fill] },
        nonMonotone
      )
    ).toEqual([])
    expect(
      compileDominanceRegions(
        { seriesIds: ['A', 'late'], fills: [...fill] },
        disjoint
      )
    ).toEqual([])
    expect(
      compileDominanceRegions(
        { seriesIds: ['A', 'B'], fills: [...fill] },
        mixedAxes
      )
    ).toEqual([])
  })
})
