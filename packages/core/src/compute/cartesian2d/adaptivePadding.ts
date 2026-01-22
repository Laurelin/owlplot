import type { MeasureText } from '../../text/types'
import { measureTextFont } from '../../text/helpers'
import {
  linearTickValues,
  DEFAULT_TICK_LABEL_OFFSET,
  DEFAULT_TICK_FONT,
  DEFAULT_LABEL_FONT,
  type AxisConfig,
} from './axis'
import { LabelOrientation } from './types/axis'

/**
 * Calculate bounding box dimensions for rotated text
 */
function getRotatedTextBounds(
  width: number,
  height: number,
  angleDegrees: number
): { width: number; height: number } {
  const angleRad = (angleDegrees * Math.PI) / 180
  const cos = Math.abs(Math.cos(angleRad))
  const sin = Math.abs(Math.sin(angleRad))
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  }
}

export type AdaptivePadding = {
  top: number
  right: number
  bottom: number
  left: number
}

// Minimum buffer to add to all padding calculations to prevent clipping
// Accounts for font rendering differences, antialiasing, and provides visual breathing room
const MIN_PADDING_BUFFER = 4

/**
 * computeAdaptivePadding
 *
 * Based on axis tick text + axis label text measurements,
 * returns the minimal extra padding needed so labels never overflow.
 */
export function computeAdaptivePadding(
  width: number,
  height: number,
  xDomain: [number, number],
  yDomain: [number, number],
  measureText: MeasureText,
  bottomAxisConfig: AxisConfig | undefined,
  leftAxisConfig: AxisConfig | undefined,
  rightAxisConfig: AxisConfig | undefined,
  xTickCount: number,
  yTickCount: number,
  options: {
    axisTickFont?: string
    axisLabelFont?: string
    extraPadding?: number
  } = {}
): AdaptivePadding {
  const { axisTickFont, axisLabelFont, extraPadding = 0 } = options

  // start with zero
  let top = 0
  let right = 0
  let bottom = 0
  let left = 0

  // --- horizontal axes (bottom & top)

  // measure bottom axis tick labels
  const bottomAxisTickValues = linearTickValues(
    xDomain[0],
    xDomain[1],
    xTickCount
  )
  let maxBottomTickLabelHeight = 0
  let maxBottomTickLabelWidth = 0
  const bottomLabelOrientation = bottomAxisConfig?.labelOrientation?.orientation
  const bottomLabelAngle = bottomAxisConfig?.labelOrientation?.angle

  for (const v of bottomAxisTickValues) {
    let { width: w, height: h } = measureTextFont(
      measureText,
      String(v),
      axisTickFont,
      DEFAULT_TICK_FONT
    )

    // Adjust dimensions for rotated labels
    if (bottomLabelOrientation === LabelOrientation.VERTICAL) {
      // Vertical labels: swap width and height
      ;[w, h] = [h, w]
    } else if (
      bottomLabelOrientation === LabelOrientation.ANGLED &&
      bottomLabelAngle !== undefined
    ) {
      // Angled labels: calculate bounding box
      const bounds = getRotatedTextBounds(w, h, bottomLabelAngle)
      w = bounds.width
      h = bounds.height
    }

    maxBottomTickLabelWidth = Math.max(maxBottomTickLabelWidth, w)
    maxBottomTickLabelHeight = Math.max(maxBottomTickLabelHeight, h)
  }

  // measure bottom axis title
  const bottomAxisTitleHeight = bottomAxisConfig?.axisLabel
    ? measureTextFont(
        measureText,
        bottomAxisConfig.axisLabel,
        axisLabelFont,
        DEFAULT_LABEL_FONT
      ).height
    : 0

  // bottom axis needs space for tick labels
  // With HANGING baseline: y = height + offset, text hangs down by height
  // Total space: height (y position) + offset + height (text extends down) + title + buffer
  // Note: Title is positioned at same y as tick labels, so we need max of both
  const bottomTickSpace =
    maxBottomTickLabelHeight + // space for y position
    DEFAULT_TICK_LABEL_OFFSET +
    maxBottomTickLabelHeight // space text extends down with HANGING baseline
  const bottomTitleSpace = bottomAxisTitleHeight
    ? bottomAxisTitleHeight + DEFAULT_TICK_LABEL_OFFSET + bottomAxisTitleHeight
    : 0
  bottom = Math.max(
    bottom,
    Math.max(bottomTickSpace, bottomTitleSpace) +
      extraPadding +
      MIN_PADDING_BUFFER
  )

  // top axis needs space too (rarely used)
  // With AUTO baseline: y = -offset, baseline at y, text extends above
  // Total space: offset + height (for text above baseline) + buffer
  top = Math.max(
    top,
    DEFAULT_TICK_LABEL_OFFSET +
      maxBottomTickLabelHeight + // text extends above baseline
      bottomAxisTitleHeight +
      extraPadding +
      MIN_PADDING_BUFFER
  )

  // --- vertical axes (left & right)

  const leftAxisTickValues = linearTickValues(
    yDomain[0],
    yDomain[1],
    yTickCount
  )
  let maxLeftTickLabelWidth = 0
  let maxLeftTickLabelHeight = 0
  const leftLabelOrientation = leftAxisConfig?.labelOrientation?.orientation
  const leftLabelAngle = leftAxisConfig?.labelOrientation?.angle

  for (const v of leftAxisTickValues) {
    let { width: w, height: h } = measureTextFont(
      measureText,
      String(v),
      axisTickFont,
      DEFAULT_TICK_FONT
    )

    // Adjust dimensions for rotated labels
    if (leftLabelOrientation === LabelOrientation.VERTICAL) {
      // Vertical labels: swap width and height
      ;[w, h] = [h, w]
    } else if (
      leftLabelOrientation === LabelOrientation.ANGLED &&
      leftLabelAngle !== undefined
    ) {
      // Angled labels: calculate bounding box
      const bounds = getRotatedTextBounds(w, h, leftLabelAngle)
      w = bounds.width
      h = bounds.height
    }

    maxLeftTickLabelWidth = Math.max(maxLeftTickLabelWidth, w)
    maxLeftTickLabelHeight = Math.max(maxLeftTickLabelHeight, h)
  }

  const leftAxisTitleWidth = leftAxisConfig?.axisLabel
    ? measureTextFont(
        measureText,
        leftAxisConfig.axisLabel,
        axisLabelFont,
        DEFAULT_LABEL_FONT
      ).width
    : 0

  // left axis needs space for tick text
  // With textAnchor END: x = -offset, text ends at x and extends left by width
  // Total space: offset + width + title + buffer
  // Title also uses textAnchor END, so it extends left by its width
  left = Math.max(
    left,
    DEFAULT_TICK_LABEL_OFFSET + // offset
      maxLeftTickLabelWidth + // text extends left
      leftAxisTitleWidth +
      extraPadding +
      MIN_PADDING_BUFFER
  )

  // right axis needs space (use right axis config if provided, else left)
  const rightAxisTickValues = rightAxisConfig
    ? linearTickValues(
        yDomain[0],
        yDomain[1],
        rightAxisConfig.tickCount ?? yTickCount
      )
    : leftAxisTickValues
  let maxRightTickLabelWidth = 0
  let maxRightTickLabelHeight = 0
  const rightLabelOrientation = rightAxisConfig?.labelOrientation?.orientation
  const rightLabelAngle = rightAxisConfig?.labelOrientation?.angle

  for (const v of rightAxisTickValues) {
    let { width: w, height: h } = measureTextFont(
      measureText,
      String(v),
      axisTickFont,
      DEFAULT_TICK_FONT
    )

    // Adjust dimensions for rotated labels
    if (rightLabelOrientation === LabelOrientation.VERTICAL) {
      ;[w, h] = [h, w]
    } else if (
      rightLabelOrientation === LabelOrientation.ANGLED &&
      rightLabelAngle !== undefined
    ) {
      const bounds = getRotatedTextBounds(w, h, rightLabelAngle)
      w = bounds.width
      h = bounds.height
    }

    maxRightTickLabelWidth = Math.max(maxRightTickLabelWidth, w)
    maxRightTickLabelHeight = Math.max(maxRightTickLabelHeight, h)
  }

  const rightAxisTitleWidth = rightAxisConfig?.axisLabel
    ? measureTextFont(
        measureText,
        rightAxisConfig.axisLabel,
        axisLabelFont,
        DEFAULT_LABEL_FONT
      ).width
    : leftAxisTitleWidth

  // With textAnchor START: x = offset, text starts at x and extends right by width
  // Total space: offset + width + title + buffer
  right = Math.max(
    right,
    DEFAULT_TICK_LABEL_OFFSET + // offset
      maxRightTickLabelWidth + // text extends right
      rightAxisTitleWidth +
      extraPadding +
      MIN_PADDING_BUFFER
  )

  // clamp to not exceed half of chart (sensible limit)
  // prevents absurd outsize labels from consuming entire layout
  const halfW = Math.floor(width / 2)
  const halfH = Math.floor(height / 2)
  top = Math.min(top, halfH)
  bottom = Math.min(bottom, halfH)
  left = Math.min(left, halfW)
  right = Math.min(right, halfW)

  return { top, right, bottom, left }
}
