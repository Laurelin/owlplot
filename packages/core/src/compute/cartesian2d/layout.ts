import type { MeasureText } from "../../text/types";
import { Position, type LineSeries } from "../../config/types";
import { computeAxisLayout } from "./axis";
import type {
  AxisLayout
} from "./types/axis";

export type CartesianLayoutResult = {
  plotRect: { x: number; y: number; width: number; height: number };
  scales: {
    x: (value: number) => number;
    y: (value: number) => number;
  };
  axes: {
    x: AxisLayout;
    y: AxisLayout;
  };
};

export function computeCartesianLayout(
  series: LineSeries[],
  size: { width: number; height: number },
  measureText: MeasureText,
  options: {
    padding: { top: number; right: number; bottom: number; left: number };
    xAxis?: { tickCount?: number; axisLabel?: string };
    yAxis?: { tickCount?: number; axisLabel?: string };
  }
): CartesianLayoutResult {
  // 1) figure domain extents
  let xMin = Infinity,
    xMax = -Infinity,
    yMin = Infinity,
    yMax = -Infinity;

  for (const s of series) {
    for (const p of s.points) {
      if (p.y === null) continue;
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
  }

  // degenerate domain protection
  if (xMin === Infinity || xMax === -Infinity) {
    xMin = 0;
    xMax = 1;
  }
  if (yMin === Infinity || yMax === -Infinity) {
    yMin = 0;
    yMax = 1;
  }
  if (xMin === xMax) xMax = xMin + 1;
  if (yMin === yMax) yMax = yMin + 1;

  // 2) compute plot rect from padding
  const { top, right, bottom, left } = options.padding;
  const plotRect = {
    x: left,
    y: top,
    width: Math.max(0, size.width - left - right),
    height: Math.max(0, size.height - top - bottom)
  };

  // 3) build scale functions
  const xScale = (v: number) =>
    plotRect.x +
    ((v - xMin) / (xMax - xMin)) * plotRect.width;
  const yScale = (v: number) =>
    plotRect.y + plotRect.height - ((v - yMin) / (yMax - yMin)) * plotRect.height;

  // 4) axis layouts
  const xAxis: AxisLayout = computeAxisLayout(
    Position.BOTTOM,
    [xMin, xMax],
    [plotRect.x, plotRect.x + plotRect.width],
    measureText,
    options.xAxis
  );

  const yAxis: AxisLayout = computeAxisLayout(
    Position.LEFT,
    [yMin, yMax],
    [plotRect.y + plotRect.height, plotRect.y],
    measureText,
    options.yAxis
  );

  return {
    plotRect,
    scales: { x: xScale, y: yScale },
    axes: { x: xAxis, y: yAxis }
  };
}
