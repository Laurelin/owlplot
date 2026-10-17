import { describe, expect, it } from 'vitest'
import { computeAdaptivePadding } from './adaptivePadding'
import type { MeasureText } from '../../text/types'
import { createLinearScale } from './scale'
import { LabelOrientation } from './types/axis'

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

  it('measures horizontal, vertical, and angled labels', () => {
    const xScale = createLinearScale([0, 100], [0, 1])
    const yScale = createLinearScale([0, 100], [0, 1])
    const horizontal = computeAdaptivePadding(
      600,
      300,
      xScale,
      yScale,
      measureText,
      {},
      {},
      {},
      5,
      5
    )
    const vertical = computeAdaptivePadding(
      600,
      300,
      xScale,
      yScale,
      measureText,
      { labelOrientation: { orientation: LabelOrientation.VERTICAL } },
      { labelOrientation: { orientation: LabelOrientation.VERTICAL } },
      { labelOrientation: { orientation: LabelOrientation.VERTICAL } },
      5,
      5
    )
    const angled = computeAdaptivePadding(
      600,
      300,
      xScale,
      yScale,
      measureText,
      {
        labelOrientation: {
          orientation: LabelOrientation.ANGLED,
          angle: 45,
        },
      },
      {
        labelOrientation: {
          orientation: LabelOrientation.ANGLED,
          angle: 45,
        },
      },
      {
        labelOrientation: {
          orientation: LabelOrientation.ANGLED,
          angle: 45,
        },
      },
      5,
      5
    )
    expect(vertical.bottom).toBeGreaterThan(horizontal.bottom)
    expect(angled.left).toBeGreaterThan(0)
    expect(angled.right).toBeGreaterThan(0)
  })

  it('measures rotated titles on every axis side', () => {
    const scale = createLinearScale([0, 10], [0, 1])
    const padding = computeAdaptivePadding(
      600,
      300,
      scale,
      scale,
      measureText,
      {
        axisLabel: 'Bottom',
        axisLabelOrientation: {
          orientation: LabelOrientation.ANGLED,
          angle: 20,
        },
      },
      {
        axisLabel: 'Left',
        axisLabelOrientation: { orientation: LabelOrientation.VERTICAL },
      },
      {
        axisLabel: 'Right',
        axisLabelOrientation: { orientation: LabelOrientation.VERTICAL },
      },
      1,
      1,
      { extraPadding: 3 }
    )
    expect(padding).toEqual({
      top: expect.any(Number),
      right: expect.any(Number),
      bottom: expect.any(Number),
      left: expect.any(Number),
    })
    expect(Math.min(...Object.values(padding))).toBeGreaterThan(0)
  })

  it('honors hidden tick labels and absent angled-label degrees', () => {
    const scale = createLinearScale([0, 10], [0, 1])
    const hidden = computeAdaptivePadding(
      600,
      300,
      scale,
      scale,
      measureText,
      {
        showTickLabels: false,
        labelOrientation: { orientation: LabelOrientation.ANGLED },
      },
      { showTickLabels: false },
      { showTickLabels: false },
      5,
      5
    )
    expect(hidden.bottom).toBe(4)
    expect(hidden.left).toBe(12)
    expect(hidden.right).toBe(12)
  })

  it('uses a dedicated right scale, tick count, and formatting policy', () => {
    const leftScale = createLinearScale([0, 1], [0, 1])
    const rightScale = createLinearScale([0, 1_000_000], [0, 1])
    const padding = computeAdaptivePadding(
      600,
      300,
      leftScale,
      leftScale,
      measureText,
      undefined,
      { axisTickFormat: { mode: 'raw' } },
      { tickCount: 2, axisTickFormat: { mode: 'compact' } },
      5,
      5,
      {
        yScaleRight: rightScale,
        axisTickFont: 'custom tick',
        axisLabelFont: 'custom label',
      }
    )
    expect(padding.left).toBeGreaterThan(0)
    expect(padding.right).toBeGreaterThan(0)
  })

  it('clamps oversized measured text to half the chart', () => {
    const hugeText: MeasureText = () => ({ width: 1000, height: 1000 })
    const scale = createLinearScale([0, 10], [0, 1])
    expect(
      computeAdaptivePadding(
        100,
        80,
        scale,
        scale,
        hugeText,
        { axisLabel: 'X' },
        { axisLabel: 'Y' },
        { axisLabel: 'R' },
        5,
        5
      )
    ).toEqual({ top: 40, right: 50, bottom: 40, left: 50 })
  })
})

describe('computeAdaptivePadding (category tick labels)', () => {
  it('measures category labels instead of numeric labels for the bottom axis', () => {
    const xScale = createLinearScale([0, 2], [0, 1])
    const yScale = createLinearScale([0, 100], [0, 1])
    const bottomAxis = {
      labelOrientation: { orientation: LabelOrientation.VERTICAL },
    }
    const numeric = computeAdaptivePadding(
      600,
      300,
      xScale,
      yScale,
      measureText,
      bottomAxis,
      {},
      undefined,
      5,
      5
    )
    const category = computeAdaptivePadding(
      600,
      300,
      xScale,
      yScale,
      measureText,
      bottomAxis,
      {},
      undefined,
      5,
      5,
      { xTickLabels: ['A-very-long-category', 'Beta', 'Gamma'] }
    )
    expect(category.bottom).toBeGreaterThan(numeric.bottom)
  })
})
