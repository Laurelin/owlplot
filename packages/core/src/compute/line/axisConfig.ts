import { type AxisVisibility, type LineChartConfig } from '../../config/types'
import type { AxisConfig } from '../cartesian2d/axis'
import { LabelOrientation } from '../cartesian2d/types/axis'

type LabelOrientationConfig = {
  orientation?: string
  angle?: number
}

const DEFAULT_AXIS_VISIBILITY: Required<AxisVisibility> = {
  ticks: true,
  tickLabels: true,
  axisLine: true,
}

function firstDefined<T>(values: Array<T | undefined>): T {
  return values.find((value): value is T => value !== undefined)!
}

function resolveAxisVisibility(
  axis: Partial<AxisVisibility> | undefined,
  global: AxisVisibility
): Required<AxisVisibility> {
  return {
    ticks: firstDefined([axis?.ticks, global.ticks, true]),
    tickLabels: firstDefined([axis?.tickLabels, global.tickLabels, true]),
    axisLine: firstDefined([axis?.axisLine, global.axisLine, true]),
  }
}

function toAxisOrientation(
  value: LabelOrientationConfig | undefined
): AxisConfig['labelOrientation'] {
  if (!value) return undefined
  return {
    orientation: value.orientation as LabelOrientation | undefined,
    angle: value.angle,
  }
}

function buildBottomAxisConfig(
  config: LineChartConfig,
  visibility: Required<AxisVisibility>
): AxisConfig {
  const options = config.options
  return {
    tickCount: options?.xTickCount,
    axisLabel: options?.xLabel,
    axisTickFormat: options?.axisTickFormat,
    labelOrientation: toAxisOrientation(options?.xLabelOrientation),
    axisLabelOrientation: toAxisOrientation(options?.xAxisLabelOrientation),
    showTicks: visibility.ticks,
    showTickLabels: visibility.tickLabels,
    showAxis: visibility.axisLine,
  }
}

function resolveYAxisTitleOrientation(
  config: LineChartConfig
): AxisConfig['axisLabelOrientation'] {
  const configured = toAxisOrientation(config.options?.yAxisLabelOrientation)
  if (configured) return configured
  return config.options?.yLabel
    ? { orientation: LabelOrientation.VERTICAL }
    : undefined
}

function buildLeftAxisConfig(
  config: LineChartConfig,
  visibility: Required<AxisVisibility>
): AxisConfig {
  const options = config.options
  return {
    tickCount: options?.yTickCount,
    axisLabel: options?.yLabel,
    axisTickFormat: options?.axisTickFormat,
    labelOrientation: toAxisOrientation(options?.yLabelOrientation),
    axisLabelOrientation: resolveYAxisTitleOrientation(config),
    showTicks: visibility.ticks,
    showTickLabels: visibility.tickLabels,
    showAxis: visibility.axisLine,
  }
}

function resolveRightTickFormat(config: LineChartConfig) {
  return firstDefined([
    config.options?.yAxisRight?.axisTickFormat,
    config.options?.axisTickFormat,
  ])
}

function buildRightAxisConfig(
  config: LineChartConfig,
  globalVisibility: AxisVisibility
): AxisConfig | undefined {
  const right = config.options?.yAxisRight
  if (!right) return undefined
  const visibility = resolveAxisVisibility(
    right.axisVisibility,
    globalVisibility
  )
  const labelOrientation = toAxisOrientation(right.labelOrientation)
  return {
    tickCount: right.tickCount,
    axisLabel: right.axisLabel,
    axisTickFormat: resolveRightTickFormat(config),
    labelOrientation,
    axisLabelOrientation:
      labelOrientation ??
      (right.axisLabel
        ? { orientation: LabelOrientation.VERTICAL }
        : undefined),
    showTicks: visibility.ticks,
    showTickLabels: visibility.tickLabels,
    showAxis: visibility.axisLine,
  }
}

function resolveVisibilityConfigs(config: LineChartConfig): {
  global: Required<AxisVisibility>
  x: Required<AxisVisibility>
  y: Required<AxisVisibility>
} {
  const configured = config.options?.axisVisibility
  const global = resolveAxisVisibility(configured, DEFAULT_AXIS_VISIBILITY)
  return {
    global,
    x: resolveAxisVisibility(configured?.x, global),
    y: resolveAxisVisibility(configured?.y, global),
  }
}

function usesRightAxisOnly(config: LineChartConfig): boolean {
  return (
    config.options?.yAxis?.position === 'right' &&
    config.options.yAxisRight !== undefined
  )
}

export function buildAxisConfigs(config: LineChartConfig): {
  bottomAxisConfig: AxisConfig
  leftAxisConfig: AxisConfig
  rightAxisConfig: AxisConfig | undefined
  layoutYAxis: AxisConfig | null
} {
  const visibility = resolveVisibilityConfigs(config)
  const bottomAxisConfig = buildBottomAxisConfig(config, visibility.x)
  const leftAxisConfig = buildLeftAxisConfig(config, visibility.y)
  const rightAxisConfig = buildRightAxisConfig(config, visibility.global)
  const layoutYAxis = usesRightAxisOnly(config) ? null : leftAxisConfig

  return { bottomAxisConfig, leftAxisConfig, rightAxisConfig, layoutYAxis }
}
