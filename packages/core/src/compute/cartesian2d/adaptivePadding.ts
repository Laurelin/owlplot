import type { MeasureText } from '../../text/types'
import { formatNumber, type NumberFormat } from '../../format/number'
import { measureTextFont } from '../../text/helpers'
import {
  linearTickValues,
  DEFAULT_TICK_LABEL_OFFSET,
  DEFAULT_TICK_FONT,
  DEFAULT_LABEL_FONT,
  AXIS_TITLE_OFFSET,
  AXIS_TITLE_ROTATION_BY_POSITION,
  type AxisConfig,
} from './axis'
import { LabelOrientation } from './types/axis'
import { Position } from '../../config/types'

/** Same formatting as axis: null → raw, undefined → AUTO, else explicit. */
function formatTickLabel(
  value: number,
  config: AxisConfig | undefined,
  tickStep: number
): string {
  const effectiveFormat: NumberFormat | undefined =
    config?.axisTickFormat === null
      ? { mode: 'raw' }
      : (config?.axisTickFormat ?? undefined)
  return formatNumber(value, effectiveFormat, { tickStep })
}

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
 *
 * Critical Invariant: Adaptive padding must be computable *without* scene nodes.
 * Layout positions are derived from measured bounds only; no magic offsets besides documented constants.
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
    /** When dual-scale, right axis uses this domain for tick values (and thus padding). */
    yDomainRight?: [number, number]
  } = {}
): AdaptivePadding {
  const {
    axisTickFont,
    axisLabelFont,
    extraPadding = 0,
    yDomainRight,
  } = options

  // start with zero
  let top = 0
  let right = 0
  let bottom = 0
  let left = 0

  // --- horizontal axes (bottom & top)

  // measure bottom axis tick labels (only if visible)
  let maxBottomTickLabelHeight = 0
  let maxBottomTickLabelWidth = 0
  const showBottomTickLabels = bottomAxisConfig?.showTickLabels !== false

  if (showBottomTickLabels) {
    const bottomAxisTickValues = linearTickValues(
      xDomain[0],
      xDomain[1],
      xTickCount
    )
    const bottomTickStep =
      bottomAxisTickValues.length >= 2
        ? Math.abs(bottomAxisTickValues[1]! - bottomAxisTickValues[0]!)
        : 0
    const bottomLabelOrientation =
      bottomAxisConfig?.labelOrientation?.orientation
    const bottomLabelAngle = bottomAxisConfig?.labelOrientation?.angle

    for (const v of bottomAxisTickValues) {
      const label = formatTickLabel(v, bottomAxisConfig, bottomTickStep)
      let { width: w, height: h } = measureTextFont(
        measureText,
        label,
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
  }

  // measure bottom axis title (with rotation support, only if visible)
  const bottomAxisTitleOrientation =
    bottomAxisConfig?.axisLabelOrientation?.orientation
  const bottomAxisTitleAngle = bottomAxisConfig?.axisLabelOrientation?.angle
  let bottomAxisTitleHeight = 0
  let _bottomAxisTitleWidth = 0
  const showBottomAxis = bottomAxisConfig?.showAxis !== false

  if (bottomAxisConfig?.axisLabel && showBottomAxis) {
    // Always measure unrotated bounds first
    const unrotatedBounds = measureTextFont(
      measureText,
      bottomAxisConfig.axisLabel,
      axisLabelFont,
      DEFAULT_LABEL_FONT
    )

    // Determine rotation (use constant to ensure consistency with axis.ts)
    let rotation: number | undefined = undefined
    if (bottomAxisTitleOrientation === LabelOrientation.VERTICAL) {
      rotation = AXIS_TITLE_ROTATION_BY_POSITION[Position.BOTTOM]
    } else if (
      bottomAxisTitleOrientation === LabelOrientation.ANGLED &&
      bottomAxisTitleAngle !== undefined
    ) {
      rotation = bottomAxisTitleAngle
    }

    // Calculate rotated bounds if needed (mechanical, not special-cased)
    if (rotation !== undefined) {
      const rotatedBounds = getRotatedTextBounds(
        unrotatedBounds.width,
        unrotatedBounds.height,
        rotation
      )
      _bottomAxisTitleWidth = rotatedBounds.width
      bottomAxisTitleHeight = rotatedBounds.height
    } else {
      _bottomAxisTitleWidth = unrotatedBounds.width
      bottomAxisTitleHeight = unrotatedBounds.height
    }
  }

  // bottom axis needs space for tick labels + title
  // With HANGING baseline: y = height (no extra gap), text hangs down by height
  // Tick label space: height (y position) + height (text extends down)
  const bottomTickSpace =
    maxBottomTickLabelHeight + // space for y position
    maxBottomTickLabelHeight // space text extends down with HANGING baseline

  // Title space: positioned below tick labels with offset
  // Title with MIDDLE baseline: center at bottom of ticks + offset + half title height
  const bottomTitleSpace = bottomAxisConfig?.axisLabel
    ? bottomAxisTitleHeight + AXIS_TITLE_OFFSET
    : 0

  bottom = Math.max(
    bottom,
    bottomTickSpace + bottomTitleSpace + extraPadding + MIN_PADDING_BUFFER
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

  // measure left axis tick labels (only if visible)
  let maxLeftTickLabelWidth = 0
  let maxLeftTickLabelHeight = 0
  const showLeftTickLabels = leftAxisConfig?.showTickLabels !== false

  if (showLeftTickLabels) {
    const leftAxisTickValues = linearTickValues(
      yDomain[0],
      yDomain[1],
      yTickCount
    )
    const leftTickStep =
      leftAxisTickValues.length >= 2
        ? Math.abs(leftAxisTickValues[1]! - leftAxisTickValues[0]!)
        : 0
    const leftLabelOrientation = leftAxisConfig?.labelOrientation?.orientation
    const leftLabelAngle = leftAxisConfig?.labelOrientation?.angle

    for (const v of leftAxisTickValues) {
      const label = formatTickLabel(v, leftAxisConfig, leftTickStep)
      let { width: w, height: h } = measureTextFont(
        measureText,
        label,
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
  }

  // measure left axis title (with rotation support, only if visible)
  const leftAxisTitleOrientation =
    leftAxisConfig?.axisLabelOrientation?.orientation
  const leftAxisTitleAngle = leftAxisConfig?.axisLabelOrientation?.angle
  let leftAxisTitleWidth = 0
  let _leftAxisTitleHeight = 0
  const showLeftAxis = leftAxisConfig?.showAxis !== false

  if (leftAxisConfig?.axisLabel && showLeftAxis) {
    // Always measure unrotated bounds first
    const unrotatedBounds = measureTextFont(
      measureText,
      leftAxisConfig.axisLabel,
      axisLabelFont,
      DEFAULT_LABEL_FONT
    )

    // Determine rotation (use constant to ensure consistency with axis.ts)
    let rotation: number | undefined = undefined
    if (leftAxisTitleOrientation === LabelOrientation.VERTICAL) {
      rotation = AXIS_TITLE_ROTATION_BY_POSITION[Position.LEFT]
    } else if (
      leftAxisTitleOrientation === LabelOrientation.ANGLED &&
      leftAxisTitleAngle !== undefined
    ) {
      rotation = leftAxisTitleAngle
    }

    // Calculate rotated bounds if needed (mechanical, not special-cased)
    if (rotation !== undefined) {
      const rotatedBounds = getRotatedTextBounds(
        unrotatedBounds.width,
        unrotatedBounds.height,
        rotation
      )
      leftAxisTitleWidth = rotatedBounds.width
      _leftAxisTitleHeight = rotatedBounds.height
    } else {
      leftAxisTitleWidth = unrotatedBounds.width
      _leftAxisTitleHeight = unrotatedBounds.height
    }
  }

  // left axis needs space for tick text + title (only when left axis is present; right-only has no left axis)
  if (leftAxisConfig) {
    const leftTickLabelSpace = DEFAULT_TICK_LABEL_OFFSET + maxLeftTickLabelWidth
    const leftTitleSpace = leftAxisConfig.axisLabel
      ? leftAxisTitleWidth + AXIS_TITLE_OFFSET
      : 0
    left = Math.max(
      left,
      leftTickLabelSpace + leftTitleSpace + extraPadding + MIN_PADDING_BUFFER
    )
  }

  // right axis needs space (use right axis config if provided, else left)
  let maxRightTickLabelWidth = 0
  let maxRightTickLabelHeight = 0
  const showRightTickLabels = rightAxisConfig?.showTickLabels !== false

  if (showRightTickLabels) {
    const rightYDomain = yDomainRight ?? yDomain
    const rightAxisTickValues = rightAxisConfig
      ? linearTickValues(
          rightYDomain[0],
          rightYDomain[1],
          rightAxisConfig.tickCount ?? yTickCount
        )
      : linearTickValues(rightYDomain[0], rightYDomain[1], yTickCount)
    const rightTickStep =
      rightAxisTickValues.length >= 2
        ? Math.abs(rightAxisTickValues[1]! - rightAxisTickValues[0]!)
        : 0
    const rightLabelOrientation = rightAxisConfig?.labelOrientation?.orientation
    const rightLabelAngle = rightAxisConfig?.labelOrientation?.angle

    for (const v of rightAxisTickValues) {
      const label = formatTickLabel(
        v,
        rightAxisConfig ?? leftAxisConfig,
        rightTickStep
      )
      let { width: w, height: h } = measureTextFont(
        measureText,
        label,
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
  }

  // measure right axis title (with rotation support, only if visible)
  const rightAxisTitleOrientation =
    rightAxisConfig?.axisLabelOrientation?.orientation
  const rightAxisTitleAngle = rightAxisConfig?.axisLabelOrientation?.angle
  let rightAxisTitleWidth = 0
  let _rightAxisTitleHeight = 0
  const showRightAxis = rightAxisConfig?.showAxis !== false

  if (rightAxisConfig?.axisLabel && showRightAxis) {
    // Always measure unrotated bounds first
    const unrotatedBounds = measureTextFont(
      measureText,
      rightAxisConfig.axisLabel,
      axisLabelFont,
      DEFAULT_LABEL_FONT
    )

    // Determine rotation (use constant to ensure consistency with axis.ts)
    let rotation: number | undefined = undefined
    if (rightAxisTitleOrientation === LabelOrientation.VERTICAL) {
      rotation = AXIS_TITLE_ROTATION_BY_POSITION[Position.RIGHT]
    } else if (
      rightAxisTitleOrientation === LabelOrientation.ANGLED &&
      rightAxisTitleAngle !== undefined
    ) {
      rotation = rightAxisTitleAngle
    }

    // Calculate rotated bounds if needed (mechanical, not special-cased)
    if (rotation !== undefined) {
      const rotatedBounds = getRotatedTextBounds(
        unrotatedBounds.width,
        unrotatedBounds.height,
        rotation
      )
      rightAxisTitleWidth = rotatedBounds.width
      _rightAxisTitleHeight = rotatedBounds.height
    } else {
      rightAxisTitleWidth = unrotatedBounds.width
      _rightAxisTitleHeight = unrotatedBounds.height
    }
  } else if (!showRightAxis || !rightAxisConfig?.axisLabel) {
    // Fallback to left axis title width if no right axis title or axis is hidden
    rightAxisTitleWidth = leftAxisTitleWidth
  }

  // right axis needs space for tick text + title
  // With textAnchor START: x = DEFAULT_TICK_LABEL_OFFSET, text starts at x and extends right by width
  // Tick label space: offset + width
  const rightTickLabelSpace = DEFAULT_TICK_LABEL_OFFSET + maxRightTickLabelWidth

  // Title space: positioned to right of tick labels with offset
  // Title with MIDDLE textAnchor: center at right edge of ticks + offset + half title width
  const rightTitleSpace = rightAxisConfig?.axisLabel
    ? rightAxisTitleWidth + AXIS_TITLE_OFFSET
    : 0

  right = Math.max(
    right,
    rightTickLabelSpace + rightTitleSpace + extraPadding + MIN_PADDING_BUFFER
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
