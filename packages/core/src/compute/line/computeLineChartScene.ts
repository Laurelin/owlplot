import type { LineChartConfig, Padding } from "../../config/chartConfig";
import type { ChartEnvironment } from "../../env/chartEnvironment";
import type { ChartSize } from "../computeChartScene";
import type { SceneNode } from "../../scene/sceneNode";

const defaultPadding: Padding = { top: 16, right: 16, bottom: 24, left: 32 };

type PlotRect = { x: number; y: number; width: number; height: number };

function mergePadding(partial: Partial<Padding> | undefined): Padding {
  return {
    top: partial?.top ?? defaultPadding.top,
    right: partial?.right ?? defaultPadding.right,
    bottom: partial?.bottom ?? defaultPadding.bottom,
    left: partial?.left ?? defaultPadding.left
  };
}

function computePlotRect(size: ChartSize, padding: Padding): PlotRect {
  const width = Math.max(0, size.width - padding.left - padding.right);
  const height = Math.max(0, size.height - padding.top - padding.bottom);
  return { x: padding.left, y: padding.top, width, height };
}

function computeDomains(config: LineChartConfig): { xMin: number; xMax: number; yMin: number; yMax: number } {
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;

  for (const series of config.series) {
    for (const point of series.points) {
      if (Number.isFinite(point.x)) {
        xMin = Math.min(xMin, point.x);
        xMax = Math.max(xMax, point.x);
      }
      if (point.y !== null && Number.isFinite(point.y)) {
        yMin = Math.min(yMin, point.y);
        yMax = Math.max(yMax, point.y);
      }
    }
  }

  if (!Number.isFinite(xMin) || !Number.isFinite(xMax)) {
    xMin = 0;
    xMax = 1;
  }
  if (!Number.isFinite(yMin) || !Number.isFinite(yMax)) {
    yMin = 0;
    yMax = 1;
  }
  if (xMin === xMax) xMax = xMin + 1;
  if (yMin === yMax) yMax = yMin + 1;

  return { xMin, xMax, yMin, yMax };
}

function scaleLinear(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): number {
  const t = (value - domainMin) / (domainMax - domainMin);
  return rangeMin + t * (rangeMax - rangeMin);
}

function buildPathD(points: Array<{ x: number; y: number | null }>, plotRect: PlotRect, domain: ReturnType<typeof computeDomains>): string {
  let d = "";
  let hasOpenSubpath = false;

  for (const point of points) {
    if (point.y === null || !Number.isFinite(point.y) || !Number.isFinite(point.x)) {
      hasOpenSubpath = false;
      continue;
    }

    const x = scaleLinear(point.x, domain.xMin, domain.xMax, plotRect.x, plotRect.x + plotRect.width);
    const y = scaleLinear(point.y, domain.yMin, domain.yMax, plotRect.y + plotRect.height, plotRect.y);

    if (!hasOpenSubpath) {
      d += `M ${x} ${y}`;
      hasOpenSubpath = true;
    } else {
      d += ` L ${x} ${y}`;
    }
  }

  return d;
}

export function computeLineChartScene(
  config: LineChartConfig,
  size: ChartSize,
  _env: ChartEnvironment
): { scene: SceneNode } {
  const padding = mergePadding(config.options?.padding);
  const plotRect = computePlotRect(size, padding);
  const domain = computeDomains(config);

  const children: SceneNode[] = [];

  children.push({
    kind: "rect",
    id: "background",
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    style: { fill: "transparent" }
  });

  children.push({
    kind: "rect",
    id: "plot:clip",
    x: plotRect.x,
    y: plotRect.y,
    width: plotRect.width,
    height: plotRect.height,
    style: { fill: "transparent", stroke: "transparent" }
  });

  for (const series of config.series) {
    const d = buildPathD(series.points, plotRect, domain);
    children.push({
      kind: "path",
      id: `series:${series.id}`,
      d,
      style: { fill: "transparent", stroke: "currentColor", strokeWidth: 2 }
    });

    if (config.options?.showPoints) {
      for (const point of series.points) {
        if (point.y === null || !Number.isFinite(point.y) || !Number.isFinite(point.x)) continue;
        const cx = scaleLinear(point.x, domain.xMin, domain.xMax, plotRect.x, plotRect.x + plotRect.width);
        const cy = scaleLinear(point.y, domain.yMin, domain.yMax, plotRect.y + plotRect.height, plotRect.y);
        children.push({
          kind: "circle",
          id: `point:${series.id}:${point.x}`,
          cx,
          cy,
          r: 2.5,
          style: { fill: "currentColor" }
        });
      }
    }
  }

  return {
    scene: {
      kind: "group",
      id: "root",
      children
    }
  };
}
