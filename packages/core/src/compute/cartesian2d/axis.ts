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
export const AXIS_TITLE_OFFSET = 4 // spacing between tick labels and axis title

// Canonical vertical rotation per position (gated by axisLabelOrientation config)
// Only encodes rotation IF vertical orientation is requested
// Exported for use in adaptivePadding to ensure consistency
export const AXIS_TITLE_ROTATION_BY_POSITION: Record<Position, number | undefined> = {
  [Position.LEFT]: -90, // IF vertical: top→bottom (inverted from bottom→top)
  [Position.RIGHT]: 90, // IF vertical: bottom→top (implemented but less tested)
  [Position.BOTTOM]: undefined, // horizontal default (wired + tested)
  [Position.TOP]: undefined, // horizontal default (implemented but less tested)
}

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
  labelOrientation?: LabelOrientationConfig // for tick labels
  axisLabelOrientation?: LabelOrientationConfig // for axis title
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

  // FIRST PASS: Compute tick label layouts + calculate max bounds
  // Critical invariant: axis title position depends on max tick label bounds, never vice-versa
  let maxTickLabelWidth = 0
  let maxTickLabelHeight = 0

  const labelLayouts: AxisLabelLayout[] = ticks.map(tick => {
    const { width, height } = measureTextFont(
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
    let effectiveWidth = width
    let effectiveHeight = height

    // Handle label orientation and calculate effective dimensions
    if (labelOrientation === LabelOrientation.VERTICAL) {
      // Vertical labels: rotate 90 degrees
      // For horizontal axes, rotate -90 (text reads top to bottom)
      // For vertical axes, rotate 90 (text reads bottom to top)
      rotation =
        orientation === Position.BOTTOM || orientation === Position.TOP
          ? -90
          : 90
      // For 90° rotation, swap dimensions
      effectiveWidth = height
      effectiveHeight = width
    } else if (
      labelOrientation === LabelOrientation.ANGLED &&
      labelAngle !== undefined
    ) {
      rotation = labelAngle
      // For angled labels, calculate rotated bounds
      const angleRad = (labelAngle * Math.PI) / 180
      const cos = Math.abs(Math.cos(angleRad))
      const sin = Math.abs(Math.sin(angleRad))
      effectiveWidth = width * cos + height * sin
      effectiveHeight = width * sin + height * cos
    }

    // Track max effective dimensions for title positioning
    maxTickLabelWidth = Math.max(maxTickLabelWidth, effectiveWidth)
    maxTickLabelHeight = Math.max(maxTickLabelHeight, effectiveHeight)

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

  // SECOND PASS: Compute axis title layout using tick label bounds
  // Layout positions are derived from measured bounds only; no magic offsets besides documented constants.
  const axisLabelLayout: AxisLayout['axisLabelLayout'] =
        config?.axisLabel !== undefined
      ? (() => {
          const axisTitleOrientation = config.axisLabelOrientation?.orientation
          const axisTitleAngle = config.axisLabelOrientation?.angle

          // Measure unrotated title bounds first
          const unrotatedBounds = measureTextFont(
            measureText,
            config.axisLabel,
            options.axisLabelFont,
            DEFAULT_LABEL_FONT
          )

          // Determine rotation for title
          let rotation: number | undefined = undefined
          if (axisTitleOrientation === LabelOrientation.VERTICAL) {
            // Use canonical rotation from constant (gated by orientation config)
            rotation = AXIS_TITLE_ROTATION_BY_POSITION[orientation]
          } else if (
            axisTitleOrientation === LabelOrientation.ANGLED &&
            axisTitleAngle !== undefined
          ) {
            rotation = axisTitleAngle
          }

          // Calculate rotated bounds if needed
          let titleWidth = unrotatedBounds.width
          let titleHeight = unrotatedBounds.height
          if (rotation !== undefined) {
            const angleRad = (rotation * Math.PI) / 180
            const cos = Math.abs(Math.cos(angleRad))
            const sin = Math.abs(Math.sin(angleRad))
            titleWidth =
              unrotatedBounds.width * cos + unrotatedBounds.height * sin
            titleHeight =
              unrotatedBounds.width * sin + unrotatedBounds.height * cos
          }

          // Position title with offset beyond tick labels
          // Title centering uses plot range (rangeMin/rangeMax) in same coordinate space as title x/y
          let x = (rangeMin + rangeMax) / 2 // center in axis-local coords
          let y = 0
          let textAnchor: AxisLabelLayout['textAnchor'] = TextAnchor.MIDDLE
          let dominantBaseline: AxisLabelLayout['dominantBaseline'] =
            DominantBaseline.MIDDLE

          if (orientation === Position.BOTTOM) {
            // Position below tick labels
            // Tick labels: y = height + DEFAULT_TICK_LABEL_OFFSET, baseline = HANGING
            // Bottom of tick label text: y + height = height + DEFAULT_TICK_LABEL_OFFSET + height
            // Title with MIDDLE baseline: center at bottom of ticks + offset + half title height
            y =
              maxTickLabelHeight +
              DEFAULT_TICK_LABEL_OFFSET +
              maxTickLabelHeight +
              AXIS_TITLE_OFFSET +
              titleHeight / 2
            textAnchor = TextAnchor.MIDDLE
            dominantBaseline = DominantBaseline.MIDDLE
          } else if (orientation === Position.TOP) {
            // Position above tick labels
            // Tick labels: y = -DEFAULT_TICK_LABEL_OFFSET, baseline = AUTO
            // Top of tick label text extends above y
            // Title with MIDDLE baseline: center above ticks
            y =
              -DEFAULT_TICK_LABEL_OFFSET -
              maxTickLabelHeight -
              AXIS_TITLE_OFFSET -
              titleHeight / 2
            textAnchor = TextAnchor.MIDDLE
            dominantBaseline = DominantBaseline.MIDDLE
          } else if (orientation === Position.LEFT) {
            // Position to the left of tick labels
            // Tick labels: x = -DEFAULT_TICK_LABEL_OFFSET, textAnchor = END
            // Left edge of tick label text: x - width = -DEFAULT_TICK_LABEL_OFFSET - width
            // Title with MIDDLE textAnchor: center at left edge of ticks - offset - half title width
            x =
              -DEFAULT_TICK_LABEL_OFFSET -
              maxTickLabelWidth -
              AXIS_TITLE_OFFSET -
              titleWidth / 2
            textAnchor = TextAnchor.MIDDLE
            dominantBaseline = DominantBaseline.MIDDLE
            y = (rangeMin + rangeMax) / 2 // center in axis-local coords
          } else if (orientation === Position.RIGHT) {
            // Position to the right of tick labels
            // Tick labels: x = DEFAULT_TICK_LABEL_OFFSET, textAnchor = START
            // Right edge of tick label text: x + width = DEFAULT_TICK_LABEL_OFFSET + width
            // Title with MIDDLE textAnchor: center at right edge of ticks + offset + half title width
            x =
              DEFAULT_TICK_LABEL_OFFSET +
              maxTickLabelWidth +
              AXIS_TITLE_OFFSET +
              titleWidth / 2
            textAnchor = TextAnchor.MIDDLE
            dominantBaseline = DominantBaseline.MIDDLE
            y = (rangeMin + rangeMax) / 2 // center in axis-local coords
          }

          return {
            text: config.axisLabel,
            x,
            y,
            textAnchor,
            dominantBaseline,
            rotation,
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
