import type { LineChartConfig } from "../../config/types";
import type { ChartEnvironment } from "../../env/types.ts";
import type { ChartSize } from "../types";
import { SceneNodeKind, type SceneNode } from "../../scene/types";

import { computeCartesianLayout } from "../cartesian2d/layout";
import { mergePadding } from "../../config/helpers";

function buildLinePathD(
  data: { x: number; y: number | null }[],
  xScale: (value: number) => number,
  yScale: (value: number) => number
): string {
  let d = "";
  let started = false;

  for (const pt of data) {
    if (pt.y === null || !Number.isFinite(pt.y) || !Number.isFinite(pt.x)) {
      started = false;
      continue;
    }
    const px = xScale(pt.x);
    const py = yScale(pt.y);

    if (!started) {
      d += `M ${px} ${py}`;
      started = true;
    } else {
      d += ` L ${px} ${py}`;
    }
  }
  return d;
}

function axisToSceneNodes(
  axis: ReturnType<typeof computeCartesianLayout>["axes"][keyof ReturnType<typeof computeCartesianLayout>["axes"]],
  groupId: string
): SceneNode[] {
  const nodes: SceneNode[] = [];

  // axis line
  nodes.push({
    kind: SceneNodeKind.PATH,
    id: `${groupId}:axis-line:${axis.orientation}`,
    d: `M ${axis.line.x1} ${axis.line.y1} L ${axis.line.x2} ${axis.line.y2}`,
    style: { stroke: "currentColor", strokeWidth: 1 }
  });

  // ticks and tick text
  axis.ticks.forEach((tick, i) => {
    // tick mark
    const tickStart =
      axis.orientation === "left" || axis.orientation === "right"
        ? `${axis.line.x1} ${tick.position}`
        : `${tick.position} ${axis.line.y1}`;

    const tickEnd =
      axis.orientation === "left" || axis.orientation === "right"
        ? `${axis.line.x1 - axis.tickSize} ${tick.position}`
        : `${tick.position} ${axis.line.y1 + axis.tickSize}`;

    nodes.push({
      kind: SceneNodeKind.PATH,
      id: `${groupId}:axis-tick:${axis.orientation}:${i}`,
      d: `M ${tickStart} L ${tickEnd}`,
      style: { stroke: "currentColor", strokeWidth: 1 }
    });

    // tick label
    const label = axis.labelLayouts[i];
    if (!label) return;
    nodes.push({
      kind: SceneNodeKind.TEXT,
      id: `${groupId}:axis-tick-label:${axis.orientation}:${i}`,
      x: label.x,
      y: label.y,
      text: label.text,
      textAnchor: label.textAnchor,
      dominantBaseline: label.dominantBaseline,
      style: { fill: "currentColor", fontSizePx: 12 }
    });
  });

  // axis label title
  if (axis.axisLabelLayout) {
    const al = axis.axisLabelLayout;
    nodes.push({
      kind: SceneNodeKind.TEXT,
      id: `${groupId}:axis-label:${axis.orientation}`,
      x: al.x,
      y: al.y,
      text: al.text,
      textAnchor: al.textAnchor,
      dominantBaseline: al.dominantBaseline,
      style: { fill: "currentColor", fontSizePx: 14 }
    });
  }

  return nodes;
}

export function scene(
  config: LineChartConfig,
  size: ChartSize,
  env: ChartEnvironment
): { scene: SceneNode } {
  const padding = mergePadding(config.options?.padding)

  const xAxisConfig: { tickCount?: number; axisLabel?: string } = {
    tickCount: config.options?.xTickCount,
    axisLabel: config.options?.xLabel
  };

  const yAxisConfig: { tickCount?: number; axisLabel?: string } = {
    tickCount: config.options?.yTickCount,
    axisLabel: config.options?.yLabel
  };

  const { plotRect, scales, axes } = computeCartesianLayout(
    config.series,
    size,
    env.measureText,
    {
      padding,
      xAxis: xAxisConfig,
      yAxis: yAxisConfig
    }
  );

  const children: SceneNode[] = [];

  // background (optional)
  children.push({
    kind: SceneNodeKind.RECT,
    id: "background",
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    style: { fill: "transparent" }
  });

  // axes
  children.push(
    ...axisToSceneNodes(axes.x, "x"),
    ...axisToSceneNodes(axes.y, "y")
  );

  // line paths and optional points
  for (const series of config.series) {
    children.push({
      kind: SceneNodeKind.PATH,
      id: `series:${series.id}`,
      d: buildLinePathD(series.points, scales.x, scales.y),
      style: { fill: "transparent", stroke: "currentColor", strokeWidth: 2 }
    });

    if (config.options?.showPoints) {
      series.points.forEach((pt, index) => {
        if (pt.y === null || !Number.isFinite(pt.y) || !Number.isFinite(pt.x)) return;
        children.push({
          kind: SceneNodeKind.CIRCLE,
          id: `point:${series.id}:${index}`,
          cx: scales.x(pt.x),
          cy: scales.y(pt.y),
          r: 2.5,
          style: { fill: "currentColor" }
        });
      });
    }
  }

  return {
    scene: {
      kind: SceneNodeKind.GROUP,
      id: "root",
      children
    }
  };
}
