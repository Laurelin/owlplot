import { describe, expect, it } from 'vitest'
import { Position } from '../../config/types'
import { formatAxisTickLabel, computeAxisLayout } from './axis'
import { createLinearScale, createLogScale } from './scale'
import {
  DominantBaseline,
  TextAnchor,
  type MeasureText,
} from '../../text/types'
import { LabelOrientation } from './types/axis'

const measureText: MeasureText = (text: string) => ({
  width: text.length * 7,
  height: 12,
})

describe('formatAxisTickLabel', () => {
  it('returns compact when format is AUTO and |value| >= compactThreshold', () => {
    expect(
      formatAxisTickLabel(140000, undefined, {
        tickStep: 1,
        compactThreshold: 10_000,
      })
    ).toMatch(/140K?/i)
    expect(
      formatAxisTickLabel(140000, undefined, {
        tickStep: 1,
        locale: 'en-US',
        compactThreshold: 10_000,
      })
    ).toMatch(/140K?/i)
  })

  it('returns decimals when format is AUTO and |value| < compactThreshold', () => {
    expect(
      formatAxisTickLabel(5000, undefined, {
        tickStep: 1,
        compactThreshold: 10_000,
      })
    ).toBe('5000')
    expect(
      formatAxisTickLabel(140000, undefined, {
        tickStep: 1,
        // no compactThreshold
      })
    ).toBe('140000')
  })

  it('respects explicit axisTickFormat (raw) over compact threshold', () => {
    expect(
      formatAxisTickLabel(
        140000,
        { axisTickFormat: { mode: 'raw' } },
        {
          tickStep: 1,
          compactThreshold: 10_000,
        }
      )
    ).toBe('140000')
  })

  it('respects null axisTickFormat as raw', () => {
    expect(
      formatAxisTickLabel(
        140000,
        { axisTickFormat: null },
        {
          tickStep: 1,
          compactThreshold: 10_000,
        }
      )
    ).toBe('140000')
  })

  it('ignores non-finite compact thresholds', () => {
    expect(
      formatAxisTickLabel(140000, undefined, {
        tickStep: 1,
        compactThreshold: Number.NaN,
      })
    ).toBe('140000')
  })
})

describe('computeAxisLayout (log scale ticks)', () => {
  it('uses major decade ticks for domain [1, 1000]', () => {
    const layout = computeAxisLayout(
      Position.LEFT,
      createLogScale([1, 1000], [100, 0], 10),
      measureText,
      { tickCount: 5 },
      {}
    )
    expect(layout.ticks.map(t => t.value)).toEqual([1, 10, 100, 1000])
  })

  it('keeps only powers of base inside the domain', () => {
    const layout = computeAxisLayout(
      Position.LEFT,
      createLogScale([5, 500], [100, 0], 10),
      measureText,
      { tickCount: 5 },
      {}
    )
    expect(layout.ticks.map(t => t.value)).toEqual([10, 100])
  })
})

describe('computeAxisLayout (placements)', () => {
  const scale = createLinearScale([0, 10], [0, 100])

  it.each([
    [Position.BOTTOM, TextAnchor.MIDDLE, DominantBaseline.HANGING],
    [Position.TOP, TextAnchor.MIDDLE, DominantBaseline.AUTO],
    [Position.LEFT, TextAnchor.END, DominantBaseline.MIDDLE],
    [Position.RIGHT, TextAnchor.START, DominantBaseline.MIDDLE],
  ])('places %s tick labels and axis line', (position, anchor, baseline) => {
    const layout = computeAxisLayout(position, scale, measureText, {}, {})
    expect(layout.labelLayouts[0]).toMatchObject({
      textAnchor: anchor,
      dominantBaseline: baseline,
    })
    expect(
      position === Position.BOTTOM || position === Position.TOP
        ? layout.line.y2
        : layout.line.x2
    ).toBe(0)
  })

  it.each([
    [Position.BOTTOM, -90],
    [Position.TOP, -90],
    [Position.LEFT, 90],
    [Position.RIGHT, 90],
  ])('rotates vertical %s tick labels', (position, rotation) => {
    const layout = computeAxisLayout(
      position,
      scale,
      measureText,
      { labelOrientation: { orientation: LabelOrientation.VERTICAL } },
      {}
    )
    expect(layout.labelLayouts[0]?.rotation).toBe(rotation)
  })

  it('supports angled tick labels and ignores an absent angle', () => {
    const angled = computeAxisLayout(
      Position.BOTTOM,
      scale,
      measureText,
      {
        labelOrientation: {
          orientation: LabelOrientation.ANGLED,
          angle: 30,
        },
      },
      {}
    )
    const unspecified = computeAxisLayout(
      Position.BOTTOM,
      scale,
      measureText,
      { labelOrientation: { orientation: LabelOrientation.ANGLED } },
      {}
    )
    expect(angled.labelLayouts[0]?.rotation).toBe(30)
    expect(unspecified.labelLayouts[0]?.rotation).toBeUndefined()
  })

  it.each([
    [Position.BOTTOM, undefined],
    [Position.TOP, undefined],
    [Position.LEFT, -90],
    [Position.RIGHT, 90],
  ])('positions a vertical %s title', (position, rotation) => {
    const layout = computeAxisLayout(
      position,
      scale,
      measureText,
      {
        axisLabel: 'Title',
        axisLabelOrientation: { orientation: LabelOrientation.VERTICAL },
      },
      {}
    )
    expect(layout.axisLabelLayout).toMatchObject({
      text: 'Title',
      rotation,
      textAnchor: TextAnchor.MIDDLE,
      dominantBaseline: DominantBaseline.MIDDLE,
    })
  })

  it('positions an angled title and omits an unconfigured title', () => {
    const titled = computeAxisLayout(
      Position.LEFT,
      scale,
      measureText,
      {
        axisLabel: 'Title',
        axisLabelOrientation: {
          orientation: LabelOrientation.ANGLED,
          angle: 25,
        },
      },
      {}
    )
    const untitled = computeAxisLayout(
      Position.LEFT,
      scale,
      measureText,
      {},
      {}
    )
    expect(titled.axisLabelLayout?.rotation).toBe(25)
    expect(untitled.axisLabelLayout).toBeUndefined()
  })

  it('suppresses repeated formatted labels', () => {
    const layout = computeAxisLayout(
      Position.BOTTOM,
      createLinearScale([0, 1], [0, 100]),
      measureText,
      {
        tickCount: 10,
        axisTickFormat: { mode: 'decimals', decimals: 0 },
      },
      {}
    )
    expect(layout.ticks.some(tick => tick.label === '')).toBe(true)
  })

  it('handles a scale that generates one tick', () => {
    const layout = computeAxisLayout(
      Position.LEFT,
      createLogScale([5, 50], [100, 0], 10),
      measureText,
      {},
      {}
    )
    expect(layout.ticks).toHaveLength(1)
  })
})

describe('computeAxisLayout (category tick labels)', () => {
  it('shows category strings at integer positions instead of numeric labels', () => {
    const layout = computeAxisLayout(
      Position.BOTTOM,
      createLinearScale([0, 2], [0, 100]),
      measureText,
      { tickCount: 5 },
      { tickLabels: ['Alpha', 'Beta', 'Gamma'] }
    )
    expect(layout.ticks.map(tick => tick.value)).toEqual([0, 1, 2])
    expect(layout.ticks.map(tick => tick.label)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ])
    expect(layout.labelLayouts.map(item => item.text)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ])
    expect(layout.ticks[1]?.position).toBe(50)
  })

  it('only labels integer positions inside the domain that have a label', () => {
    const padded = computeAxisLayout(
      Position.BOTTOM,
      createLinearScale([-1.5, 2.5], [0, 100]),
      measureText,
      {},
      { tickLabels: ['Alpha', 'Beta', 'Gamma'] }
    )
    const wider = computeAxisLayout(
      Position.BOTTOM,
      createLinearScale([0, 5], [0, 100]),
      measureText,
      {},
      { tickLabels: ['Alpha', 'Beta', 'Gamma'] }
    )
    expect(padded.ticks.map(tick => tick.value)).toEqual([0, 1, 2])
    expect(wider.ticks.map(tick => tick.value)).toEqual([0, 1, 2])
  })

  it('produces no ticks for an empty label list', () => {
    const layout = computeAxisLayout(
      Position.BOTTOM,
      createLinearScale([0, 2], [0, 100]),
      measureText,
      {},
      { tickLabels: [] }
    )
    expect(layout.ticks).toEqual([])
    expect(layout.labelLayouts).toEqual([])
  })
})
