import type { MeasureText } from '../../text/types'
import { measureTextFont } from '../../text/helpers'
import { measureRotatedBoundingBox } from '../../text/measureRotatedBoundingBox'
import {
  formatAxisTickLabel,
  DEFAULT_TICK_LABEL_OFFSET,
  DEFAULT_TICK_FONT,
  DEFAULT_LABEL_FONT,
  AXIS_TITLE_OFFSET,
  AXIS_TITLE_ROTATION_BY_POSITION,
  type AxisConfig,
} from './axis'
import type { ContinuousScale } from './scale'
import { generateTicks } from './ticks'
import { LabelOrientation } from './types/axis'
import { Position } from '../../config/types'

export type AdaptivePadding = {
  top: number
  right: number
  bottom: number
  left: number
}

const MIN_PADDING_BUFFER = 4

type Bounds = { width: number; height: number }

type TextRotation =
  { mode: 'none' } | { mode: 'vertical' } | { mode: 'angled'; degrees: number }

type TickMeasurement = {
  config: AxisConfig | undefined
  formatConfig?: AxisConfig
  scale: ContinuousScale
  tickCount: number
  /** Category labels to measure instead of numeric tick labels. */
  tickLabels?: readonly string[]
}

type PaddingContext = {
  measureText: MeasureText
  axisTickFont: string | undefined
  axisLabelFont: string | undefined
  locale: string | undefined
  compactThreshold: number | undefined
  extraPadding: number
}

function isVerticalOrientation(
  orientation: AxisConfig['labelOrientation']
): boolean {
  return (
    orientation !== undefined &&
    orientation.orientation === LabelOrientation.VERTICAL
  )
}

function angledDegrees(
  orientation: AxisConfig['labelOrientation']
): number | undefined {
  if (orientation === undefined) return undefined
  if (orientation.orientation !== LabelOrientation.ANGLED) return undefined
  return orientation.angle
}

function resolveTextRotation(
  orientation: AxisConfig['labelOrientation'],
  verticalDegrees?: number
): TextRotation {
  if (isVerticalOrientation(orientation)) {
    return verticalDegrees === undefined
      ? { mode: 'vertical' }
      : { mode: 'angled', degrees: verticalDegrees }
  }
  const degrees = angledDegrees(orientation)
  return degrees === undefined ? { mode: 'none' } : { mode: 'angled', degrees }
}

function rotateBounds(bounds: Bounds, rotation: TextRotation): Bounds {
  switch (rotation.mode) {
    case 'none':
      return bounds
    case 'vertical':
      return { width: bounds.height, height: bounds.width }
    case 'angled':
      return measureRotatedBoundingBox(
        bounds.width,
        bounds.height,
        (rotation.degrees * Math.PI) / 180
      )
  }
}

function computeTickStep(values: number[]): number {
  return values.length < 2 ? 0 : Math.abs(values[1]! - values[0]!)
}

function tickFormatConfig(
  measurement: TickMeasurement
): AxisConfig | undefined {
  return measurement.formatConfig === undefined
    ? measurement.config
    : measurement.formatConfig
}

function resolveTickLabels(
  measurement: TickMeasurement,
  context: PaddingContext
): readonly string[] {
  if (measurement.tickLabels !== undefined) return measurement.tickLabels
  const values = generateTicks(measurement.scale, measurement.tickCount)
  const tickStep = computeTickStep(values)
  return values.map(value =>
    formatAxisTickLabel(value, tickFormatConfig(measurement), {
      tickStep,
      locale: context.locale,
      compactThreshold: context.compactThreshold,
    })
  )
}

function measureTickLabels(
  measurement: TickMeasurement,
  context: PaddingContext
): Bounds {
  if (measurement.config?.showTickLabels === false) {
    return { width: 0, height: 0 }
  }
  const rotation = resolveTextRotation(measurement.config?.labelOrientation)
  let maximum: Bounds = { width: 0, height: 0 }
  for (const label of resolveTickLabels(measurement, context)) {
    const bounds = measureTextFont(
      context.measureText,
      label,
      context.axisTickFont,
      DEFAULT_TICK_FONT
    )
    const rotated = rotateBounds(bounds, rotation)
    maximum = {
      width: Math.max(maximum.width, rotated.width),
      height: Math.max(maximum.height, rotated.height),
    }
  }
  return maximum
}

function measureAxisTitle(
  config: AxisConfig | undefined,
  verticalDegrees: number | undefined,
  context: PaddingContext
): Bounds {
  if (!hasAxisTitle(config)) return { width: 0, height: 0 }
  const bounds = measureTextFont(
    context.measureText,
    config.axisLabel,
    context.axisLabelFont,
    DEFAULT_LABEL_FONT
  )
  return rotateBounds(
    bounds,
    resolveTextRotation(config.axisLabelOrientation, verticalDegrees)
  )
}

function hasAxisTitle(
  config: AxisConfig | undefined
): config is AxisConfig & { axisLabel: string } {
  return config !== undefined && Boolean(config.axisLabel)
}

function horizontalPadding(
  ticks: Bounds,
  title: Bounds,
  config: AxisConfig | undefined,
  context: PaddingContext
): Pick<AdaptivePadding, 'top' | 'bottom'> {
  const titleSpace = hasAxisTitle(config) ? title.height + AXIS_TITLE_OFFSET : 0
  return {
    top:
      DEFAULT_TICK_LABEL_OFFSET +
      ticks.height +
      title.height +
      context.extraPadding +
      MIN_PADDING_BUFFER,
    bottom:
      ticks.height * 2 + titleSpace + context.extraPadding + MIN_PADDING_BUFFER,
  }
}

function verticalPadding(
  ticks: Bounds,
  title: Bounds,
  config: AxisConfig | undefined,
  context: PaddingContext
): number {
  const titleSpace = hasAxisTitle(config) ? title.width + AXIS_TITLE_OFFSET : 0
  return (
    DEFAULT_TICK_LABEL_OFFSET +
    ticks.width +
    titleSpace +
    context.extraPadding +
    MIN_PADDING_BUFFER
  )
}

function clampPadding(
  padding: AdaptivePadding,
  width: number,
  height: number
): AdaptivePadding {
  const halfWidth = Math.floor(width / 2)
  const halfHeight = Math.floor(height / 2)
  return {
    top: Math.min(padding.top, halfHeight),
    right: Math.min(padding.right, halfWidth),
    bottom: Math.min(padding.bottom, halfHeight),
    left: Math.min(padding.left, halfWidth),
  }
}

function createPaddingContext(
  measureText: MeasureText,
  options: {
    axisTickFont?: string
    axisLabelFont?: string
    extraPadding?: number
    locale?: string
    compactThreshold?: number
  }
): PaddingContext {
  return {
    measureText,
    axisTickFont: options.axisTickFont,
    axisLabelFont: options.axisLabelFont,
    locale: options.locale,
    compactThreshold: options.compactThreshold,
    extraPadding: options.extraPadding === undefined ? 0 : options.extraPadding,
  }
}

function createRightTickMeasurement(
  yScale: ContinuousScale,
  yTickCount: number,
  leftAxisConfig: AxisConfig | undefined,
  rightAxisConfig: AxisConfig | undefined,
  options: {
    yScaleRight?: ContinuousScale
  }
): TickMeasurement {
  return {
    config: rightAxisConfig,
    formatConfig:
      rightAxisConfig === undefined ? leftAxisConfig : rightAxisConfig,
    scale: options.yScaleRight === undefined ? yScale : options.yScaleRight,
    tickCount:
      rightAxisConfig?.tickCount === undefined
        ? yTickCount
        : rightAxisConfig.tickCount,
  }
}

function computeLeftPadding(
  ticks: Bounds,
  title: Bounds,
  config: AxisConfig | undefined,
  context: PaddingContext
): number {
  return config === undefined
    ? 0
    : verticalPadding(ticks, title, config, context)
}

export function computeAdaptivePadding(
  width: number,
  height: number,
  xScale: ContinuousScale,
  yScale: ContinuousScale,
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
    /** When dual-scale, right axis uses this scale for tick values (and thus padding). */
    yScaleRight?: ContinuousScale
    locale?: string
    compactThreshold?: number
    /** Category labels for the bottom (x) axis, measured instead of numeric tick labels. */
    xTickLabels?: readonly string[]
  } = {}
): AdaptivePadding {
  const context = createPaddingContext(measureText, options)
  const bottomTicks = measureTickLabels(
    {
      config: bottomAxisConfig,
      scale: xScale,
      tickCount: xTickCount,
      tickLabels: options.xTickLabels,
    },
    context
  )
  const bottomTitle = measureAxisTitle(
    bottomAxisConfig,
    AXIS_TITLE_ROTATION_BY_POSITION[Position.BOTTOM],
    context
  )
  const horizontal = horizontalPadding(
    bottomTicks,
    bottomTitle,
    bottomAxisConfig,
    context
  )
  const leftTicks = measureTickLabels(
    { config: leftAxisConfig, scale: yScale, tickCount: yTickCount },
    context
  )
  const leftTitle = measureAxisTitle(
    leftAxisConfig,
    AXIS_TITLE_ROTATION_BY_POSITION[Position.LEFT],
    context
  )
  const rightTicks = measureTickLabels(
    createRightTickMeasurement(
      yScale,
      yTickCount,
      leftAxisConfig,
      rightAxisConfig,
      options
    ),
    context
  )
  const rightTitle = measureAxisTitle(
    rightAxisConfig,
    AXIS_TITLE_ROTATION_BY_POSITION[Position.RIGHT],
    context
  )
  return clampPadding(
    {
      ...horizontal,
      left: computeLeftPadding(leftTicks, leftTitle, leftAxisConfig, context),
      right: verticalPadding(rightTicks, rightTitle, rightAxisConfig, context),
    },
    width,
    height
  )
}
