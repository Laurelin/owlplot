import { JSDOM } from "jsdom";
import { ChartKind, computeChartScene } from "@owlplot/core";
import { renderSvgScene } from "../src/index";
import { expect, it } from "vitest";

it("renders a line path", () => {
  const dom = new JSDOM(`<svg width="200" height="100"></svg>`);
  const svg = dom.window.document.querySelector("svg")!;
  const result = computeChartScene(
    {
      kind: ChartKind.LINE,
      series: [
        { id: "s", points: [ { x: 0, y: 0 }, { x: 1, y: 1 } ] }
      ]
    },
    { width: 200, height: 100 },
    { devicePixelRatio: 1, measureText: () => ({ width: 0, height: 0 }) }
  );
  renderSvgScene(result.scene, svg);

  expect(svg.innerHTML).toContain("<path");
});
