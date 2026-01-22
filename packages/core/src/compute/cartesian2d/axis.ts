import { Position } from '../../config/types'
import { measureTextFont } from '../../text/helpers'
import {
  DominantBaseline,
  TextAnchor,
  type MeasureText,
} from '../../text/types'
import type {
  AxisLabelLayout,
  AxisLayout,
  AxisTick,
  LabelOrientationConfig,
} from './types/axis'
import { LabelOrientation } from './types/axis'

const DEFAULT_TICK_COUNT = 5
const DEFAULT_TICK_SIZE = 4
export const DEFAULT_TICK_LABEL_OFFSET = 8
export const DEFAULT_TICK_FONT = '8pt sans-serif'
export const DEFAULT_LABEL_FONT = '9pt sans-serif' // for axis titles

// simple linear tick generator
export function linearTickValues(
  domainMin: number,
  domainMax: number,
  count: number
): number[] {
  if (count < 2) return [domainMin, domainMax]
  const span = domainMax - domainMin
  const step = span / (count - 1)
  const ticks: number[] = []
  for (let i = 0; i < count; i++) {
    ticks.push(domainMin + step * i)
  }
  return ticks
}

export interface AxisConfig {
  tickCount?: number
  axisLabel?: string
  labelOrientation?: LabelOrientationConfig
}

/**
 * computeAxisLayout
 *
 * returns an AxisLayout in local axis coordinates:
 * - tick positions are **pos** along the axis
 * - labelLayouts are text placements relative to axis origin
 */
export function computeAxisLayout(
  orientation: Position,
  domain: [number, number],
  rangePx: [number, number],
  measureText: MeasureText,
  config: AxisConfig | undefined,
  options: {
    axisTickFont?: string
    axisLabelFont?: string
  }
): AxisLayout {
  const tickCount = config?.tickCount ?? DEFAULT_TICK_COUNT
  const [domainMin, domainMax] = domain

  const values = linearTickValues(domainMin, domainMax, tickCount)
  const [rangeMin, rangeMax] = rangePx

  const project = (v: number): number =>
    rangeMin +
    ((v - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin)

  const ticks: AxisTick[] = values.map(value => ({
    value,
    position: project(value),
    label: value.toString(),
  }))

  const labelOrientation = config?.labelOrientation?.orientation
  const labelAngle = config?.labelOrientation?.angle

  const labelLayouts: AxisLabelLayout[] = ticks.map(tick => {
    const { height } = measureTextFont(
      measureText,
      tick.label,
      options.axisTickFont,
      DEFAULT_TICK_FONT
    )

    let x = tick.position
    let y = 0
    let textAnchor: AxisLabelLayout['textAnchor'] = TextAnchor.MIDDLE
    let dominantBaseline: AxisLabelLayout['dominantBaseline'] =
      DominantBaseline.MIDDLE
    let rotation: number | undefined = undefined

    // Handle label orientation
    if (labelOrientation === LabelOrientation.VERTICAL) {
      // Vertical labels: rotate 90 degrees
      // For horizontal axes, rotate -90 (text reads top to bottom)
      // For vertical axes, rotate 90 (text reads bottom to top)
      rotation =
        orientation === Position.BOTTOM || orientation === Position.TOP
          ? -90
          : 90
    } else if (
      labelOrientation === LabelOrientation.ANGLED &&
      labelAngle !== undefined
    ) {
      rotation = labelAngle
    }

    if (orientation === Position.BOTTOM) {
      y = height + DEFAULT_TICK_LABEL_OFFSET
      textAnchor = TextAnchor.MIDDLE
      dominantBaseline = DominantBaseline.HANGING
    } else if (orientation === Position.TOP) {
      y = -DEFAULT_TICK_LABEL_OFFSET
      textAnchor = TextAnchor.MIDDLE
      dominantBaseline = DominantBaseline.AUTO
    } else if (orientation === Position.LEFT) {
      x = -DEFAULT_TICK_LABEL_OFFSET
      textAnchor = TextAnchor.END
      dominantBaseline = DominantBaseline.MIDDLE
      y = tick.position
    } else if (orientation === Position.RIGHT) {
      x = DEFAULT_TICK_LABEL_OFFSET
      textAnchor = TextAnchor.START
      dominantBaseline = DominantBaseline.MIDDLE
      y = tick.position
    }

    return {
      text: tick.label,
      x,
      y,
      textAnchor,
      dominantBaseline,
      rotation,
    }
  })

  let x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0

  // axis line (in local axis coords)
  if (orientation === Position.BOTTOM || orientation === Position.TOP) {
    x1 = rangeMin
    x2 = rangeMax
    y1 = y2 = 0
  } else {
    y1 = rangeMin
    y2 = rangeMax
    x1 = x2 = 0
  }

  const axisLabelLayout: AxisLayout['axisLabelLayout'] =
    config?.axisLabel !== undefined
      ? (() => {
          const { height } = measureTextFont(
            measureText,
            config.axisLabel,
            options.axisLabelFont,
            DEFAULT_LABEL_FONT
          )
          let x = (rangeMin + rangeMax) / 2
          let y = 0
          let textAnchor: AxisLabelLayout['textAnchor'] = TextAnchor.MIDDLE
          let dominantBaseline: AxisLabelLayout['dominantBaseline'] =
            DominantBaseline.MIDDLE

          if (orientation === Position.BOTTOM) {
            y = height + DEFAULT_TICK_LABEL_OFFSET
            textAnchor = TextAnchor.MIDDLE
            dominantBaseline = DominantBaseline.HANGING
          } else if (orientation === Position.TOP) {
            y = -DEFAULT_TICK_LABEL_OFFSET
            textAnchor = TextAnchor.MIDDLE
            dominantBaseline = DominantBaseline.AUTO
          } else if (orientation === Position.LEFT) {
            x = -DEFAULT_TICK_LABEL_OFFSET
            textAnchor = TextAnchor.END
            dominantBaseline = DominantBaseline.MIDDLE
            y = (rangeMin + rangeMax) / 2
          } else if (orientation === Position.RIGHT) {
            x = DEFAULT_TICK_LABEL_OFFSET
            textAnchor = TextAnchor.START
            dominantBaseline = DominantBaseline.MIDDLE
            y = (rangeMin + rangeMax) / 2
          }

          return {
            text: config.axisLabel,
            x,
            y,
            textAnchor,
            dominantBaseline,
          }
        })()
      : undefined

  const result = {
    orientation,
    line: { x1, y1, x2, y2 },
    ticks,
    tickSize: DEFAULT_TICK_SIZE,
    labelLayouts,
    axisLabelLayout,
  }
  return result
}
