/**
 * Dense-line canvas-gate measurement helpers (~50k points, one series).
 * No side effects — the CLI entry prints results.
 */
import { JSDOM } from 'jsdom'
import {
  ChartKind,
  SceneNodeKind,
  approximateMeasureText,
  computeChartScene,
  type SceneNode,
} from '@owlplot/core'
import {
  HoverIndicatorKind,
  HoverModeKind,
  renderSvgScene,
} from '@owlplot/renderer-svg'
import {
  DENSE_LINE_POINT_COUNT,
  buildDenseLinePoints,
} from './dense-line-fixture'

export { DENSE_LINE_POINT_COUNT, buildDenseLinePoints }

const size = { width: 640, height: 360 }

export function countSceneNodes(node: SceneNode): number {
  if (node.kind !== SceneNodeKind.GROUP) return 1
  let total = 1
  for (const child of node.children) {
    total += countSceneNodes(child)
  }
  return total
}

function setupDom(): { svg: SVGSVGElement } {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  })
  const { window } = dom
  const g = globalThis as unknown as Record<string, unknown>
  g.window = window
  g.document = window.document
  g.navigator = window.navigator
  // appendNode uses instanceof SVGSVGElement — install jsdom constructors.
  g.SVGElement = window.SVGElement
  g.SVGSVGElement = window.SVGSVGElement
  g.Element = window.Element
  g.HTMLElement = window.HTMLElement
  g.Node = window.Node
  const svg = window.document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  ) as SVGSVGElement
  svg.setAttribute('width', String(size.width))
  svg.setAttribute('height', String(size.height))
  window.document.body.appendChild(svg)
  return { svg }
}

export type DenseLineCostResult = {
  pointCount: number
  sceneNodeCount: number
  svgNodeCount: number
  computeMs: number
  renderMs: number
}

export function measureDenseLineCost(): DenseLineCostResult {
  const points = buildDenseLinePoints(DENSE_LINE_POINT_COUNT)
  const t0 = performance.now()
  const { scene } = computeChartScene(
    {
      kind: ChartKind.LINE,
      series: [{ id: 'dense', points }],
      options: { showPoints: false },
    },
    size,
    { devicePixelRatio: 1, measureText: approximateMeasureText }
  )
  const computeMs = performance.now() - t0
  const sceneNodeCount = countSceneNodes(scene)

  const { svg } = setupDom()
  const t1 = performance.now()
  // legend/tooltip/hover off — measure plot mount cost only
  renderSvgScene(scene, svg, {
    legend: false,
    tooltip: null,
    hoverMode: { kind: HoverModeKind.POINT },
    hoverIndicator: { kind: HoverIndicatorKind.NONE },
  })
  const renderMs = performance.now() - t1
  const svgNodeCount = svg.querySelectorAll('*').length

  return {
    pointCount: points.length,
    sceneNodeCount,
    svgNodeCount,
    computeMs,
    renderMs,
  }
}
