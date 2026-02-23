import { describe, expect, it } from 'vitest'
import { computeAdaptivePadding } from './adaptivePadding'
import type { MeasureText } from '../../text/types'
import { createLinearScale } from './scale'

const measureText: MeasureText = (text: string) => ({
  width: text.length * 7,
  height: 12,
})

describe('computeAdaptivePadding', () => {
  it('reserves axis label space even when axis line is hidden', () => {
    const xScale = createLinearScale([0, 5], [0, 1])
    const yScale = createLinearScale([0, 175], [0, 1])
    const base = computeAdaptivePadding(
      600,
      300,
      xScale,
      yScale,
      measureText,
      { axisLabel: 'Month', showAxis: true, showTickLabels: true },
      { axisLabel: 'Sales', showAxis: true, showTickLabels: true },
      undefined,
      5,
      5
    )

    const hiddenAxisLine = computeAdaptivePadding(
      600,
      300,
      xScale,
      yScale,
      measureText,
      { axisLabel: 'Month', showAxis: false, showTickLabels: true },
      { axisLabel: 'Sales', showAxis: false, showTickLabels: true },
      undefined,
      5,
      5
    )

    expect(hiddenAxisLine.bottom).toBe(base.bottom)
    expect(hiddenAxisLine.left).toBe(base.left)
  })
})
