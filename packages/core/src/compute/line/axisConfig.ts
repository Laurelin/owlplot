import { type AxisVisibility, type LineChartConfig } from '../../config/types'
import type { AxisConfig } from '../cartesian2d/axis'
import { LabelOrientation } from '../cartesian2d/types/axis'

function resolveAxisVisibility(
  axis: Partial<AxisVisibility> | undefined,
  global: AxisVisibility
): Required<AxisVisibility> {
  return {
    ticks: axis?.ticks ?? global.ticks ?? true,
    tickLabels: axis?.tickLabels ?? global.tickLabels ?? true,
    axisLine: axis?.axisLine ?? global.axisLine ?? true,
  }
}

export function buildAxisConfigs(config: LineChartConfig): {
  bottomAxisConfig: AxisConfig
  leftAxisConfig: AxisConfig
  rightAxisConfig: AxisConfig | undefined
  layoutYAxis: AxisConfig | null
} {
  const xAxisTitleOrientation =
    config.options?.xAxisLabelOrientation ?? undefined
  const yAxisTitleOrientation =
    config.options?.yAxisLabelOrientation ??
    (config.options?.yLabel
      ? { orientation: LabelOrientation.VERTICAL }
      : undefined)

  const axisVis = config.options?.axisVisibility
  const globalVisibility: AxisVisibility = {
    ticks: axisVis?.ticks ?? true,
    tickLabels: axisVis?.tickLabels ?? true,
    axisLine: axisVis?.axisLine ?? true,
  }

  const resolvedX = resolveAxisVisibility(axisVis?.x, globalVisibility)
  const resolvedY = resolveAxisVisibility(axisVis?.y, globalVisibility)

  const bottomAxisConfig: AxisConfig = {
    tickCount: config.options?.xTickCount,
    axisLabel: config.options?.xLabel,
    axisTickFormat: config.options?.axisTickFormat,
    labelOrientation: config.options?.xLabelOrientation
      ? {
          orientation: config.options.xLabelOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: config.options.xLabelOrientation.angle,
        }
      : undefined,
    axisLabelOrientation: xAxisTitleOrientation
      ? {
          orientation: xAxisTitleOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: xAxisTitleOrientation.angle,
        }
      : undefined,
    showTicks: resolvedX.ticks,
    showTickLabels: resolvedX.tickLabels,
    showAxis: resolvedX.axisLine,
  }

  const leftAxisConfig: AxisConfig = {
    tickCount: config.options?.yTickCount,
    axisLabel: config.options?.yLabel,
    axisTickFormat: config.options?.axisTickFormat,
    labelOrientation: config.options?.yLabelOrientation
      ? {
          orientation: config.options.yLabelOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: config.options.yLabelOrientation.angle,
        }
      : undefined,
    axisLabelOrientation: yAxisTitleOrientation
      ? {
          orientation: yAxisTitleOrientation.orientation as
            | LabelOrientation
            | undefined,
          angle: yAxisTitleOrientation.angle,
        }
      : undefined,
    showTicks: resolvedY.ticks,
    showTickLabels: resolvedY.tickLabels,
    showAxis: resolvedY.axisLine,
  }

  const rightAxisConfig: AxisConfig | undefined = config.options?.yAxisRight
    ? (() => {
        const resolved = resolveAxisVisibility(
          config.options.yAxisRight.axisVisibility,
          globalVisibility
        )
        return {
          tickCount: config.options.yAxisRight.tickCount,
          axisLabel: config.options.yAxisRight.axisLabel,
          axisTickFormat:
            config.options.yAxisRight.axisTickFormat !== undefined
              ? config.options.yAxisRight.axisTickFormat
              : config.options?.axisTickFormat,
          labelOrientation: config.options.yAxisRight.labelOrientation
            ? {
                orientation: config.options.yAxisRight.labelOrientation
                  .orientation as LabelOrientation | undefined,
                angle: config.options.yAxisRight.labelOrientation.angle,
              }
            : undefined,
          axisLabelOrientation: config.options.yAxisRight.labelOrientation
            ? {
                orientation: config.options.yAxisRight.labelOrientation
                  .orientation as LabelOrientation | undefined,
                angle: config.options.yAxisRight.labelOrientation.angle,
              }
            : config.options.yAxisRight.axisLabel
              ? { orientation: LabelOrientation.VERTICAL }
              : undefined,
          showTicks: resolved.ticks,
          showTickLabels: resolved.tickLabels,
          showAxis: resolved.axisLine,
        }
      })()
    : undefined

  const isRightOnly =
    config.options?.yAxis?.position === 'right' && config.options?.yAxisRight
  const layoutYAxis: AxisConfig | null = isRightOnly ? null : leftAxisConfig

  return { bottomAxisConfig, leftAxisConfig, rightAxisConfig, layoutYAxis }
}
