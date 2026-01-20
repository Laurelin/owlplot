import { ChartKind, type ChartConfig } from "../config/types";
import type { ChartEnvironment } from "../env/types.ts";
import { scene } from "./line/scene";
import { ChartSize, ComputeResult } from "./types";

export function computeChartScene(
  config: ChartConfig,
  size: ChartSize,
  env: ChartEnvironment
): ComputeResult {
  switch (config.kind) {
    case ChartKind.LINE:
      return scene(config, size, env);
  }
}
