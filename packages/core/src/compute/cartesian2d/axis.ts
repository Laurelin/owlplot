import { Position } from '../../config/types'
import {
  formatNumber,
  type FormatContext,
  type NumberFormat,
} from '../../format/number'
import { measureTextFont } from '../../text/helpers'
import { measureRotatedBoundingBox } from '../../text/measureRotatedBoundingBox'
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
import type { ContinuousScale } from './scale'
import { generateTicks } from './ticks'

const DEFAULT_TICK_COUNT = 5
const DEFAULT_TICK_SIZE = 4
export const DEFAULT_TICK_LABEL_OFFSET = 8
export const DEFAULT_TICK_FONT = '8pt sans-serif'
export const DEFAULT_LABEL_FONT = '9pt sans-serif' // for axis titles
export const AXIS_TITLE_OFFSET = 4 // spacing between tick labels and axis title

// Canonical vertical rotation per position (gated by axisLabelOrientation config)
// Only encodes rotation IF vertical orientation is requested
// Exported for use in adaptivePadding to ensure consistency
export const AXIS_TITLE_ROTATION_BY_POSITION: Record<
  Position,
  number | undefined
> = {
  [Position.LEFT]: -90, // IF vertical: top→bottom (inverted from bottom→top)
  [Position.RIGHT]: 90, // IF vertical: bottom→top (implemented but less tested)
  [Position.BOTTOM]: undefined, // horizontal default (wired + tested)
  [Position.TOP]: undefined, // horizontal default (implemented but less tested)
}

export interface AxisConfig {
  tickCount?: number
  axisLabel?: string
  /** undefined = AUTO (decimals from step); null = raw; otherwise explicit mode. */
  axisTickFormat?: NumberFormat | null
  labelOrientation?: LabelOrientationConfig // for tick labels
  axisLabelOrientation?: LabelOrientationConfig // for axis title
  showTicks?: boolean
  showTickLabels?: boolean
  showAxis?: boolean
}

/** Options for axis tick label formatting. Axis policy (compact threshold) lives here; formatter stays dumb. */
export type AxisTickFormatOptions = {
  tickStep: number
  locale?: string
  compactThreshold?: number
}

type AxisFormatMode =
  | { mode: 'automatic' }
  | { mode: 'explicit'; format: NumberFormat }

type LabelRotation =
  | { mode: 'none' }
  | { mode: 'quarter-turn'; degrees: number }
  | { mode: 'angled'; degrees: number }

type MeasuredLabel = {
  layout: AxisLabelLayout
  effectiveWidth: number
  effectiveHeight: number
}

type TickBounds = { width: number; height: number }

function configuredAxisFormat(
  config: AxisConfig | undefined
): NumberFormat | undefined {
  if (config === undefined) return undefined
  if (config.axisTickFormat === null) return { mode: 'raw' }
  return config.axisTickFormat
}

function shouldUseCompactFormat(
  value: number,
  threshold: number | undefined
): boolean {
  if (threshold === undefined) return false
  if (!Number.isFinite(threshold)) return false
  return Math.abs(value) >= threshold
}

function resolveAxisFormatMode(
  config: AxisConfig | undefined,
  options: AxisTickFormatOptions,
  value: number
): AxisFormatMode {
  const configured = configuredAxisFormat(config)
  if (configured !== undefined) {
    return { mode: 'explicit', format: configured }
  }
  if (shouldUseCompactFormat(value, options.compactThreshold)) {
    return { mode: 'explicit', format: { mode: 'compact' } }
  }
  return { mode: 'automatic' }
}

/**
 * Format a single axis tick label. Owns AUTO → compact decision (axis policy); calls formatNumber with format + FormatContext only.
 * Use in both computeAxisLayout and computeAdaptivePadding so formatting is identical.
 */
export function formatAxisTickLabel(
  value: number,
  config: AxisConfig | undefined,
  options: AxisTickFormatOptions
): string {
  const mode = resolveAxisFormatMode(config, options, value)
  const format = mode.mode === 'explicit' ? mode.format : undefined
  const context: FormatContext = {
    tickStep: options.tickStep,
    locale: options.locale,
  }
  return formatNumber(value, format, context)
}

function computeTickStep(values: number[]): number {
  return values.length < 2 ? 0 : Math.abs(values[1]! - values[0]!)
}

function buildTicks(
  values: number[],
  scale: ContinuousScale,
  config: AxisConfig | undefined,
  options: AxisTickFormatOptions
): AxisTick[] {
  let previousLabel: string | undefined
  const ticks: AxisTick[] = []
  for (const value of values) {
    const formatted = formatAxisTickLabel(value, config, options)
    const label = previousLabel === formatted ? '' : formatted
    previousLabel = formatted
    ticks.push({ value, position: scale.forward(value), label })
  }
  return ticks
}

function resolveTickRotation(
  orientation: Position,
  config: LabelOrientationConfig | undefined
): LabelRotation {
  if (isVerticalTickConfig(config)) {
    return { mode: 'quarter-turn', degrees: quarterTurnDegrees(orientation) }
  }
  const degrees = resolveAngledDegrees(config)
  return degrees === undefined ? { mode: 'none' } : { mode: 'angled', degrees }
}

function isVerticalTickConfig(
  config: LabelOrientationConfig | undefined
): boolean {
  return (
    config !== undefined && config.orientation === LabelOrientation.VERTICAL
  )
}

function quarterTurnDegrees(orientation: Position): number {
  const horizontal =
    orientation === Position.BOTTOM || orientation === Position.TOP
  return horizontal ? -90 : 90
}

function resolveAngledDegrees(
  config: LabelOrientationConfig | undefined
): number | undefined {
  if (config === undefined) return undefined
  return config.orientation === LabelOrientation.ANGLED
    ? config.angle
    : undefined
}

function effectiveBounds(
  width: number,
  height: number,
  rotation: LabelRotation
): TickBounds {
  switch (rotation.mode) {
    case 'none':
      return { width, height }
    case 'quarter-turn':
      return { width: height, height: width }
    case 'angled':
      return measureRotatedBoundingBox(
        width,
        height,
        (rotation.degrees * Math.PI) / 180
      )
  }
}

function placeTickLabel(
  orientation: Position,
  position: number,
  height: number
): Omit<AxisLabelLayout, 'text' | 'rotation'> {
  switch (orientation) {
    case Position.BOTTOM:
      return {
        x: position,
        y: height,
        textAnchor: TextAnchor.MIDDLE,
        dominantBaseline: DominantBaseline.HANGING,
      }
    case Position.TOP:
      return {
        x: position,
        y: -DEFAULT_TICK_LABEL_OFFSET,
        textAnchor: TextAnchor.MIDDLE,
        dominantBaseline: DominantBaseline.AUTO,
      }
    case Position.LEFT:
      return {
        x: -DEFAULT_TICK_LABEL_OFFSET,
        y: position,
        textAnchor: TextAnchor.END,
        dominantBaseline: DominantBaseline.MIDDLE,
      }
    case Position.RIGHT:
      return {
        x: DEFAULT_TICK_LABEL_OFFSET,
        y: position,
        textAnchor: TextAnchor.START,
        dominantBaseline: DominantBaseline.MIDDLE,
      }
  }
}

function measureTickLabel(
  tick: AxisTick,
  orientation: Position,
  rotation: LabelRotation,
  measureText: MeasureText,
  font: string | undefined
): MeasuredLabel {
  const measured = measureTextFont(
    measureText,
    tick.label,
    font,
    DEFAULT_TICK_FONT
  )
  const bounds = effectiveBounds(measured.width, measured.height, rotation)
  const placement = placeTickLabel(orientation, tick.position, measured.height)
  return {
    layout: {
      text: tick.label,
      ...placement,
      rotation: rotation.mode === 'none' ? undefined : rotation.degrees,
    },
    effectiveWidth: bounds.width,
    effectiveHeight: bounds.height,
  }
}

function measureTickLabels(
  ticks: AxisTick[],
  orientation: Position,
  config: AxisConfig | undefined,
  measureText: MeasureText,
  font: string | undefined
): { layouts: AxisLabelLayout[]; bounds: TickBounds } {
  const rotation = resolveTickRotation(orientation, config?.labelOrientation)
  const layouts: AxisLabelLayout[] = []
  const bounds: TickBounds = { width: 0, height: 0 }
  for (const tick of ticks) {
    const measured = measureTickLabel(
      tick,
      orientation,
      rotation,
      measureText,
      font
    )
    layouts.push(measured.layout)
    bounds.width = Math.max(bounds.width, measured.effectiveWidth)
    bounds.height = Math.max(bounds.height, measured.effectiveHeight)
  }
  return { layouts, bounds }
}

function computeAxisLine(
  orientation: Position,
  rangeMin: number,
  rangeMax: number
): AxisLayout['line'] {
  const horizontal =
    orientation === Position.BOTTOM || orientation === Position.TOP
  return horizontal
    ? { x1: rangeMin, y1: 0, x2: rangeMax, y2: 0 }
    : { x1: 0, y1: rangeMin, x2: 0, y2: rangeMax }
}

function resolveTitleRotation(
  orientation: Position,
  config: LabelOrientationConfig | undefined
): number | undefined {
  if (config?.orientation === LabelOrientation.VERTICAL) {
    return AXIS_TITLE_ROTATION_BY_POSITION[orientation]
  }
  return config?.orientation === LabelOrientation.ANGLED
    ? config.angle
    : undefined
}

function measureTitleBounds(
  measureText: MeasureText,
  text: string,
  font: string | undefined,
  rotation: number | undefined
): TickBounds {
  const measured = measureTextFont(measureText, text, font, DEFAULT_LABEL_FONT)
  return rotation === undefined
    ? measured
    : measureRotatedBoundingBox(
        measured.width,
        measured.height,
        (rotation * Math.PI) / 180
      )
}

function placeAxisTitle(
  orientation: Position,
  rangeCenter: number,
  tickBounds: TickBounds,
  titleBounds: TickBounds
): Omit<AxisLabelLayout, 'text' | 'rotation'> {
  const common = {
    textAnchor: TextAnchor.MIDDLE,
    dominantBaseline: DominantBaseline.MIDDLE,
  }
  switch (orientation) {
    case Position.BOTTOM:
      return {
        ...common,
        x: rangeCenter,
        y: tickBounds.height * 2 + AXIS_TITLE_OFFSET + titleBounds.height / 2,
      }
    case Position.TOP:
      return {
        ...common,
        x: rangeCenter,
        y:
          -DEFAULT_TICK_LABEL_OFFSET -
          tickBounds.height -
          AXIS_TITLE_OFFSET -
          titleBounds.height / 2,
      }
    case Position.LEFT:
      return {
        ...common,
        x:
          -DEFAULT_TICK_LABEL_OFFSET -
          tickBounds.width -
          AXIS_TITLE_OFFSET -
          titleBounds.width / 2,
        y: rangeCenter,
      }
    case Position.RIGHT:
      return {
        ...common,
        x:
          DEFAULT_TICK_LABEL_OFFSET +
          tickBounds.width +
          AXIS_TITLE_OFFSET +
          titleBounds.width / 2,
        y: rangeCenter,
      }
  }
}

function computeAxisTitleLayout(
  orientation: Position,
  range: readonly [number, number],
  tickBounds: TickBounds,
  config: AxisConfig | undefined,
  measureText: MeasureText,
  font: string | undefined
): AxisLabelLayout | undefined {
  if (config?.axisLabel === undefined) return undefined
  const rotation = resolveTitleRotation(
    orientation,
    config.axisLabelOrientation
  )
  const titleBounds = measureTitleBounds(
    measureText,
    config.axisLabel,
    font,
    rotation
  )
  return {
    text: config.axisLabel,
    ...placeAxisTitle(
      orientation,
      (range[0] + range[1]) / 2,
      tickBounds,
      titleBounds
    ),
    rotation,
  }
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
  scale: ContinuousScale,
  measureText: MeasureText,
  config: AxisConfig | undefined,
  options: {
    axisTickFont?: string
    axisLabelFont?: string
    locale?: string
    compactThreshold?: number
  }
): AxisLayout {
  const tickCount = config?.tickCount ?? DEFAULT_TICK_COUNT
  const values = generateTicks(scale, tickCount)
  const tickStep = computeTickStep(values)
  const tickFormatOptions: AxisTickFormatOptions = {
    tickStep,
    locale: options.locale,
    compactThreshold: options.compactThreshold,
  }
  const ticks = buildTicks(values, scale, config, tickFormatOptions)
  const measuredTicks = measureTickLabels(
    ticks,
    orientation,
    config,
    measureText,
    options.axisTickFont
  )
  return {
    orientation,
    line: computeAxisLine(orientation, scale.range[0], scale.range[1]),
    ticks,
    tickSize: DEFAULT_TICK_SIZE,
    labelLayouts: measuredTicks.layouts,
    axisLabelLayout: computeAxisTitleLayout(
      orientation,
      scale.range,
      measuredTicks.bounds,
      config,
      measureText,
      options.axisLabelFont
    ),
  }
}
