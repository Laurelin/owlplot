import { Position } from '../../config/types'
import {
  DominantBaseline,
  TextAnchor,
  type MeasureText,
} from '../../text/types'
import type { AxisLabelLayout, AxisLayout, AxisTick } from './types/axis'

const DEFAULT_TICK_COUNT = 5
const DEFAULT_TICK_SIZE = 4
const DEFAULT_LABEL_OFFSET = 8

// simple linear tick generator
function linearTickValues(
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

interface ComputeAxisConfig {
  tickCount?: number
  axisLabel?: string
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
  config: ComputeAxisConfig | undefined
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

  const labelLayouts: AxisLabelLayout[] = ticks.map(tick => {
    const { width, height } = measureText(tick.label, '12px sans-serif')

    let x = tick.position
    let y = 0
    let textAnchor: AxisLabelLayout['textAnchor'] = TextAnchor.MIDDLE
    let dominantBaseline: AxisLabelLayout['dominantBaseline'] =
      DominantBaseline.MIDDLE

    if (orientation === 'bottom') {
      y = height + DEFAULT_LABEL_OFFSET
      textAnchor = TextAnchor.MIDDLE
      dominantBaseline = DominantBaseline.HANGING
    } else if (orientation === 'top') {
      y = -DEFAULT_LABEL_OFFSET
      textAnchor = TextAnchor.MIDDLE
      dominantBaseline = DominantBaseline.AUTO
    } else if (orientation === 'left') {
      x = -DEFAULT_LABEL_OFFSET
      textAnchor = TextAnchor.END
      dominantBaseline = DominantBaseline.MIDDLE
      y = tick.position
    } else if (orientation === 'right') {
      x = DEFAULT_LABEL_OFFSET
      textAnchor = TextAnchor.START
      dominantBaseline = DominantBaseline.MIDDLE
      y = tick.position
    }

    return { text: tick.label, x, y, textAnchor, dominantBaseline }
  })

  let x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0

  // axis line (in local axis coords)
  if (orientation === 'bottom' || orientation === 'top') {
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
          const { height } = measureText(config.axisLabel, '14px sans-serif')
          let x = (rangeMin + rangeMax) / 2
          let y = 0
          let textAnchor: AxisLabelLayout['textAnchor'] = TextAnchor.MIDDLE
          let dominantBaseline: AxisLabelLayout['dominantBaseline'] =
            DominantBaseline.MIDDLE

          if (orientation === 'bottom') {
            y = height + DEFAULT_LABEL_OFFSET
            textAnchor = TextAnchor.MIDDLE
            dominantBaseline = DominantBaseline.HANGING
          } else if (orientation === 'top') {
            y = -DEFAULT_LABEL_OFFSET
            textAnchor = TextAnchor.MIDDLE
            dominantBaseline = DominantBaseline.AUTO
          } else if (orientation === 'left') {
            x = -DEFAULT_LABEL_OFFSET
            textAnchor = TextAnchor.END
            dominantBaseline = DominantBaseline.MIDDLE
            y = (rangeMin + rangeMax) / 2
          } else if (orientation === 'right') {
            x = DEFAULT_LABEL_OFFSET
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
