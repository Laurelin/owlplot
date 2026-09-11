import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach } from 'vitest'
import { SceneNodeKind } from '@owlplot/core'
import type { SceneNode } from '@owlplot/core'
import { renderSvgScene } from './renderSvgScene'
import { ExtendedSVGSVGElement } from '../shared/extendedElements'
import {
  DATA_HOVER_LISTENERS_SYMBOL,
  GLYPH_HOVER_LISTENERS_SYMBOL,
} from '../shared/symbols'
import { HoverModeKind } from '../shared/enums'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
}

function identityScale() {
  return {
    type: 'linear' as const,
    domain: [0, 10] as const,
    range: [0, 200] as const,
    forward: (v: number) => v * 20,
    invert: (v: number) => v / 20,
  }
}

function sceneWithHoverAndGlyph(): SceneNode {
  const scale = identityScale()
  return {
    id: 'root',
    kind: SceneNodeKind.GROUP,
    children: [
      {
        id: 'point:s1:0',
        kind: SceneNodeKind.POINT,
        seriesId: 's1',
        x: 5,
        y: 5,
        point: { shape: { kind: 'circle' }, size: 4 },
        style: { fill: { type: 'solid', color: '#000' } },
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

  it('defaults to POINT (data hover), not GLYPH, even when glyphs are present', () => {
    renderSvgScene(sceneWithHoverAndGlyph(), svg, { tooltip: null })
    const extended = svg as ExtendedSVGSVGElement
    expect(extended[DATA_HOVER_LISTENERS_SYMBOL]).toBeDefined()
    expect(extended[GLYPH_HOVER_LISTENERS_SYMBOL]).toBeUndefined()
  })

  it('attaches glyph hover only when hoverMode is explicitly GLYPH', () => {
    renderSvgScene(sceneWithHoverAndGlyph(), svg, {
      tooltip: null,
      hoverMode: { kind: HoverModeKind.GLYPH },
    })
    const extended = svg as ExtendedSVGSVGElement
    expect(extended[GLYPH_HOVER_LISTENERS_SYMBOL]).toBeDefined()
    expect(extended[DATA_HOVER_LISTENERS_SYMBOL]).toBeUndefined()
  })
})
