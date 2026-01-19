import { describe, expect, it } from "vitest";
import { ChartConfig } from "../../config/chartConfig";
import { computeChartScene } from "../computeChartScene";
import { approximateMeasureText } from "../../text/measureText";

describe("computeChartScene (line)", () => {
    it("produces a deterministic scene graph", () => {
      const config: ChartConfig = {
        kind: "line",
        series: [
          { id: "a", points: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: null }, { x: 3, y: 1 }] },
          { id: "b", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1.5 }, { x: 3, y: 2 }] }
        ],
        options: { showPoints: true, padding: { left: 40 } }
      };
  
      const result = computeChartScene(
        config,
        { width: 640, height: 360 },
        { devicePixelRatio: 2, measureText: approximateMeasureText }
      );
  
      expect(result.scene).toMatchSnapshot();
    });
  });
