import type { ChartConfig } from "../config/chartConfig";
import type { ChartEnvironment } from "../env/chartEnvironment";
import type { SceneNode } from "../scene/sceneNode";
import { computeLineChartScene } from "./line/computeLineChartScene";

export type ChartSize = { width: number; height: number };

export type ComputeResult = {
  scene: SceneNode;
};

export function computeChartScene(
  config: ChartConfig,
  size: ChartSize,
  env: ChartEnvironment
): ComputeResult {
  switch (config.kind) {
    case "line":
      return computeLineChartScene(config, size, env);
  }
}
