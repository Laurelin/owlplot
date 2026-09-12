/**
 * Measure parity: same fixture with approximateMeasureText (Node) vs
 * canvasMeasureText (browser/jsdom). Records plotRect / padding / ticks delta.
 *
 * jsdom without the optional native `canvas` package returns width 0 from
 * getContext stubs — detailed closeTo assertions then document that stub
 * path; when a real context exists, deltas are asserted with a loose bound.
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  ChartKind,
  approximateMeasureText,
  computeChartScene,
  type ChartConfig,
  type SceneNode,
} from '@owlplot/core'
import {
  canvasMeasureText,
  createCanvasMeasureText,
} from './canvasMeasureText'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
}

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  })
  testGlobal.window = dom.window
  testGlobal.document = dom.window.document
})

const FIXTURE_SIZE = { width: 640, height: 360 } as const

const FIXTURE_CONFIG: ChartConfig = {
  kind: ChartKind.LINE,
  series: [
    {
      id: 'a',
      points: [
        { x: 0, y: 10 },
        { x: 1, y: 25 },
        { x: 2, y: 15 },
        { x: 3, y: 40 },
      ],
    },
    {
      id: 'b',
      points: [
        { x: 0, y: 5 },
        { x: 1, y: 18 },
        { x: 2, y: 22 },
        { x: 3, y: 30 },
      ],
    },
  ],
  options: {
    showPoints: true,
    enableAdaptivePadding: true,
    // px fonts so approximateMeasureText and canvas height parsing agree on size
    axisTickFont: '12px sans-serif',
    axisLabelFont: '14px sans-serif',
    xLabel: 'Time',
    yLabel: 'Value',
  },
}

type PlotRect = { x: number; y: number; width: number; height: number }
type Padding = { top: number; right: number; bottom: number; left: number }
type TickProbe = { id: string; text: string; x: number; y: number }

function getPlotRect(scene: SceneNode): PlotRect {
  const hover = (
    scene.metadata as { hover?: { plotRect?: PlotRect } } | undefined
  )?.hover
  const plotRect = hover?.plotRect
  if (!plotRect) throw new Error('expected hover.plotRect on scene')
  return plotRect
}

function paddingFromPlotRect(
  plotRect: PlotRect,
  size: { width: number; height: number }
): Padding {
  return {
    top: plotRect.y,
    left: plotRect.x,
    right: size.width - plotRect.x - plotRect.width,
    bottom: size.height - plotRect.y - plotRect.height,
  }
}

function collectTickProbes(node: SceneNode, out: TickProbe[] = []): TickProbe[] {
  if (
    node.kind === 'text' &&
    typeof node.id === 'string' &&
    node.id.startsWith('axis-tick-label:')
  ) {
    out.push({
      id: node.id,
      text: node.text,
      x: node.x,
      y: node.y,
    })
  }
  if (node.kind === 'group' && Array.isArray(node.children)) {
    for (const child of node.children) collectTickProbes(child, out)
  }
  return out
}

function layoutProbe(scene: SceneNode, size: { width: number; height: number }) {
  const plotRect = getPlotRect(scene)
  return {
    plotRect,
    padding: paddingFromPlotRect(plotRect, size),
    ticks: collectTickProbes(scene),
  }
}

function canvasContextAvailable(): boolean {
  return createCanvasMeasureText(document)('M', '12px sans-serif').width > 0
}

describe('canvasMeasureText export', () => {
  it('is callable against the ambient document', () => {
    const metrics = canvasMeasureText('W', '12px sans-serif')
    expect(Number.isFinite(metrics.width)).toBe(true)
    expect(Number.isFinite(metrics.height)).toBe(true)
  })
})

describe('createCanvasMeasureText', () => {
  it('returns finite metrics and does not throw', () => {
    const measure = createCanvasMeasureText(document)
    const metrics = measure('Hello', '12px sans-serif')
    expect(Number.isFinite(metrics.width)).toBe(true)
    expect(Number.isFinite(metrics.height)).toBe(true)
    expect(metrics.height).toBe(12)
    expect(metrics.width).toBeGreaterThanOrEqual(0)
  })

  it('parses pt font size for height', () => {
    const measure = createCanvasMeasureText(document)
    const metrics = measure('x', '8pt sans-serif')
    expect(metrics.height).toBeCloseTo((8 * 4) / 3, 5)
  })
})

describe('measure parity (approximator vs canvas)', () => {
  it('records plotRect / padding / ticks delta on a shared fixture', () => {
    const approxResult = computeChartScene(FIXTURE_CONFIG, FIXTURE_SIZE, {
      devicePixelRatio: 1,
      measureText: approximateMeasureText,
    })
    const browserMeasure = createCanvasMeasureText(document)
    const canvasResult = computeChartScene(FIXTURE_CONFIG, FIXTURE_SIZE, {
      devicePixelRatio: 1,
      measureText: browserMeasure,
    })

    const approx = layoutProbe(approxResult.scene, FIXTURE_SIZE)
    const canvas = layoutProbe(canvasResult.scene, FIXTURE_SIZE)

    // Injection works: both produce finite layout fingerprints
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Number.isFinite(approx.plotRect[key])).toBe(true)
      expect(Number.isFinite(canvas.plotRect[key])).toBe(true)
    }
    expect(approx.ticks.length).toBeGreaterThan(0)
    expect(canvas.ticks.length).toBeGreaterThan(0)

    const plotRectDelta = {
      x: canvas.plotRect.x - approx.plotRect.x,
      y: canvas.plotRect.y - approx.plotRect.y,
      width: canvas.plotRect.width - approx.plotRect.width,
      height: canvas.plotRect.height - approx.plotRect.height,
    }
    const paddingDelta = {
      top: canvas.padding.top - approx.padding.top,
      right: canvas.padding.right - approx.padding.right,
      bottom: canvas.padding.bottom - approx.padding.bottom,
      left: canvas.padding.left - approx.padding.left,
    }

    // Fixture assertion: record the scene diff (acceptable delta bound).
    // Without native canvas, jsdom yields width 0 → larger padding shrink vs approximator.
    // With a real 2d context, deltas are typically much smaller.
    const hasRealCanvas = canvasContextAvailable()
    const maxAbsDelta = hasRealCanvas ? 40 : 120

    for (const v of Object.values(plotRectDelta)) {
      expect(Math.abs(v)).toBeLessThanOrEqual(maxAbsDelta)
    }
    for (const v of Object.values(paddingDelta)) {
      expect(Math.abs(v)).toBeLessThanOrEqual(maxAbsDelta)
    }

    // Tick label strings should match (domain/formatting independent of measure);
    // positions may shift with padding.
    expect(canvas.ticks.map(t => t.text)).toEqual(approx.ticks.map(t => t.text))

    // Documented fingerprint for PR / debugging (stable shape)
    expect({
      hasRealCanvas,
      approx: {
        plotRect: approx.plotRect,
        padding: approx.padding,
        tickCount: approx.ticks.length,
        tickTexts: approx.ticks.map(t => t.text),
      },
      canvas: {
        plotRect: canvas.plotRect,
        padding: canvas.padding,
        tickCount: canvas.ticks.length,
        tickTexts: canvas.ticks.map(t => t.text),
      },
      delta: { plotRect: plotRectDelta, padding: paddingDelta },
    }).toMatchObject({
      approx: { tickCount: expect.any(Number) },
      canvas: { tickCount: expect.any(Number) },
      delta: {
        plotRect: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
        }),
        padding: expect.objectContaining({
          top: expect.any(Number),
          right: expect.any(Number),
          bottom: expect.any(Number),
          left: expect.any(Number),
        }),
      },
    })
  })

  it('shows injection with a deterministic alternate when canvas is stubbed', () => {
    // Always-on Node-style check: a slightly different MeasureText changes layout.
    const wider: typeof approximateMeasureText = (text, fontCss) => {
      const base = approximateMeasureText(text, fontCss)
      return { width: base.width * 1.25, height: base.height }
    }
    const a = layoutProbe(
      computeChartScene(FIXTURE_CONFIG, FIXTURE_SIZE, {
        devicePixelRatio: 1,
        measureText: approximateMeasureText,
      }).scene,
      FIXTURE_SIZE
    )
    const b = layoutProbe(
      computeChartScene(FIXTURE_CONFIG, FIXTURE_SIZE, {
        devicePixelRatio: 1,
        measureText: wider,
      }).scene,
      FIXTURE_SIZE
    )
    // Wider labels → more left/bottom padding → smaller or shifted plotRect
    expect(
      a.plotRect.width !== b.plotRect.width ||
        a.plotRect.x !== b.plotRect.x ||
        a.padding.left !== b.padding.left
    ).toBe(true)
  })
})
