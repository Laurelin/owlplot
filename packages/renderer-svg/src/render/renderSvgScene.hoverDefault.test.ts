import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach } from 'vitest'
import { SceneNodeKind, TooltipKind, createSceneTooltip } from '@owlplot/core'
import type { SceneNode } from '@owlplot/core'
import { renderSvgScene } from './renderSvgScene'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  DATA_HOVER_LISTENERS_SYMBOL,
  GLYPH_HOVER_LISTENERS_SYMBOL,
  POINT_INDEX_SYMBOL,
  SERIES_POINT_SHAPES_SYMBOL,
  SERIES_STYLES_SYMBOL,
} from '../shared/symbols'
import { HoverIndicatorKind, HoverModeKind } from '../shared/enums'
import { DATA_POINT_INDEX, DATA_SERIES_ID } from '../shared/dataAttributes'
import { buildPointIndexFromRenderedElements } from '../hover/pointIndex'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
}

/** Serializable scale descriptor (scene hover metadata shape). */
function scaleDescriptor() {
  return {
    type: 'linear' as const,
    domain: [0, 10] as [number, number],
    range: [0, 200] as [number, number],
  }
}

/** Production-shaped scene: POINT node with TooltipKind.POINT so glyphs get data-owlplot-* attrs. */
function sceneWithStampedGlyphs(): SceneNode {
  const scale = scaleDescriptor()
  return {
    id: 'root',
    kind: SceneNodeKind.GROUP,
    children: [
      {
        id: 'point:s1:0',
        kind: SceneNodeKind.POINT,
        seriesId: 's1',
        datumIndex: 0,
        x: 5,
        y: 5,
        point: { shape: { kind: 'circle' }, size: 4 },
        style: { fill: { type: 'solid', color: '#000' } },
        metadata: {
          tooltip: createSceneTooltip(TooltipKind.POINT, [
            { seriesId: 's1', x: 5, y: 5 },
          ]),
        },
      },
    ],
    metadata: {
      hover: {
        scales: { x: scale, y: scale },
        plotRect: { x: 0, y: 0, width: 200, height: 100 },
        xDomain: [0, 10] as [number, number],
        yDomain: [0, 10] as [number, number],
        series: [
          {
            id: 's1',
            yAxis: 'left' as const,
            sortedPoints: [{ x: 5, y: 5 }],
          },
        ],
      },
    },
  }
}

describe('renderSvgScene hover default', () => {
  let svg: SVGSVGElement

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    })
    testGlobal.document = dom.window.document
    testGlobal.window = dom.window
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '200')
    svg.setAttribute('height', '100')
  })

  it('defaults to POINT data hover when stamped glyphs exist', () => {
    renderSvgScene(sceneWithStampedGlyphs(), svg, { tooltip: null })

    // Lock: glyphs were actually indexed (soft-trap case), not empty-index fallback.
    expect(svg.querySelectorAll(`[${DATA_SERIES_ID}]`).length).toBeGreaterThan(
      0
    )
    const index =
      (svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL] ??
      buildPointIndexFromRenderedElements(svg)
    expect(index.size).toBeGreaterThan(0)

    const extended = svg as ExtendedSVGSVGElement
    expect(extended[DATA_HOVER_LISTENERS_SYMBOL]).toBeDefined()
    expect(extended[GLYPH_HOVER_LISTENERS_SYMBOL]).toBeUndefined()
  })

  it('uses typed identity for a series id containing a colon (north:revenue)', () => {
    const scale = scaleDescriptor()
    const scene: SceneNode = {
      id: 'root',
      kind: SceneNodeKind.GROUP,
      children: [
        {
          id: 'stroke-node-1',
          kind: SceneNodeKind.PATH,
          seriesId: 'north:revenue',
          d: 'M 0 0 L 1 1',
          style: { stroke: { type: 'solid', color: '#123456' } },
        },
        {
          id: 'glyph-node-7',
          kind: SceneNodeKind.POINT,
          seriesId: 'north:revenue',
          datumIndex: 2,
          x: 5,
          y: 5,
          point: { shape: { kind: 'circle' }, size: 4 },
          style: { fill: { type: 'solid', color: '#123456' } },
          metadata: {
            tooltip: createSceneTooltip(TooltipKind.POINT, [
              { seriesId: 'north:revenue', x: 5, y: 5 },
            ]),
          },
        },
      ],
      metadata: {
        hover: {
          scales: { x: scale, y: scale },
          plotRect: { x: 0, y: 0, width: 200, height: 100 },
          xDomain: [0, 10] as [number, number],
          yDomain: [0, 10] as [number, number],
          series: [
            {
              id: 'north:revenue',
              yAxis: 'left' as const,
              sortedPoints: [
                { x: 3, y: 3 },
                { x: 4, y: 4 },
                { x: 5, y: 5 },
              ],
            },
          ],
        },
      },
    }

    renderSvgScene(scene, svg, { tooltip: null })

    const glyph = svg.querySelector(`[${DATA_POINT_INDEX}]`)
    expect(glyph?.getAttribute(DATA_SERIES_ID)).toBe('north:revenue')
    expect(glyph?.getAttribute(DATA_POINT_INDEX)).toBe('2')

    const extended = svg as ExtendedSVGSVGElement
    expect(extended[SERIES_STYLES_SYMBOL]?.get('north:revenue')).toEqual({
      stroke: '#123456',
    })
    expect(extended[SERIES_STYLES_SYMBOL]?.has('north')).toBe(false)
    expect(extended[SERIES_POINT_SHAPES_SYMBOL]?.get('north:revenue')).toEqual({
      kind: 'circle',
    })
    expect(extended[SERIES_POINT_SHAPES_SYMBOL]?.has('north')).toBe(false)

    const index = buildPointIndexFromRenderedElements(svg)
    expect(index.get('north:revenue')).toHaveLength(1)
    expect(index.has('north')).toBe(false)
  })

  it('attaches glyph hover when hoverMode is explicitly GLYPH and glyphs are stamped', () => {
    renderSvgScene(sceneWithStampedGlyphs(), svg, {
      tooltip: null,
      hoverMode: { kind: HoverModeKind.GLYPH },
    })

    expect(svg.querySelectorAll(`[${DATA_SERIES_ID}]`).length).toBeGreaterThan(
      0
    )
    const extended = svg as ExtendedSVGSVGElement
    const index =
      extended[POINT_INDEX_SYMBOL] ?? buildPointIndexFromRenderedElements(svg)
    expect(index.size).toBeGreaterThan(0)

    expect(extended[GLYPH_HOVER_LISTENERS_SYMBOL]).toBeDefined()
    expect(extended[DATA_HOVER_LISTENERS_SYMBOL]).toBeUndefined()
  })

  it('honors explicit single and array indicator configurations', () => {
    renderSvgScene(sceneWithStampedGlyphs(), svg, {
      tooltip: null,
      hoverIndicator: { kind: HoverIndicatorKind.NONE },
    })
    expect((svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL]).toBeUndefined()

    renderSvgScene(sceneWithStampedGlyphs(), svg, {
      tooltip: null,
      hoverIndicator: [
        { kind: HoverIndicatorKind.NONE },
        { kind: HoverIndicatorKind.POINT_EMPHASIS },
      ],
    })
    expect(
      (svg as ExtendedSVGSVGElement)[POINT_INDEX_SYMBOL]?.size
    ).toBeGreaterThan(0)
  })
})
