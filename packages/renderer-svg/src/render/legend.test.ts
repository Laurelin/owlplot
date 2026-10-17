import { JSDOM } from 'jsdom'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  Position,
  SceneNodeKind,
  type SceneAxisRole,
  type SceneNode,
} from '@owlplot/core'
import { renderSvgScene } from './renderSvgScene'

const testGlobal = globalThis as unknown as {
  window: Window & typeof globalThis
  document: Document
}

function sceneWithAxisNode(axisNode: SceneNode): SceneNode {
  return {
    id: 'root',
    kind: SceneNodeKind.GROUP,
    children: [
      {
        id: 'axis-group',
        kind: SceneNodeKind.GROUP,
        children: [axisNode],
      },
    ],
    metadata: {
      legend: {
        entries: [
          {
            seriesId: 'a',
            label: 'a',
            paint: { type: 'solid', color: '#ff0000' },
            order: 0,
          },
        ],
      },
    },
  }
}

function axisTextNode(orientation: Position, role: SceneAxisRole): SceneNode {
  return {
    id: `axis:${orientation}:${role}`,
    kind: SceneNodeKind.TEXT,
    x: 0,
    y: 0,
    text: 'x',
    axis: { orientation, role },
  }
}

function legendRootMarginTop(scene: SceneNode): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '200')
  svg.setAttribute('height', '100')
  const host = document.createElement('div')
  host.appendChild(svg)
  document.body.appendChild(host)
  renderSvgScene(scene, svg, { tooltip: null, legendHost: host })
  const root = host.querySelector(
    '[data-owlplot-legend-root]'
  ) as HTMLElement | null
  expect(root).not.toBeNull()
  return root!.style.marginTop
}

describe('renderLegend bottom-axis gap', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      pretendToBeVisual: true,
    })
    testGlobal.document = dom.window.document
    testGlobal.window = dom.window
  })

  it.each(['tick', 'tick-label', 'label'] as const)(
    'uses the wider gap for a bottom axis %s node',
    role => {
      expect(
        legendRootMarginTop(
          sceneWithAxisNode(axisTextNode(Position.BOTTOM, role))
        )
      ).toBe('14px')
    }
  )

  it.each([
    ['bottom', 'line'],
    ['bottom', 'group'],
    ['top', 'tick'],
    ['left', 'label'],
  ] as const)(
    'uses the default gap for a %s axis %s node',
    (orientation, role) => {
      expect(
        legendRootMarginTop(sceneWithAxisNode(axisTextNode(orientation, role)))
      ).toBe('8px')
    }
  )

  it('uses the default gap when no node carries axis identity', () => {
    const plain: SceneNode = {
      id: 'plain',
      kind: SceneNodeKind.TEXT,
      x: 0,
      y: 0,
      text: 'x',
    }
    expect(legendRootMarginTop(sceneWithAxisNode(plain))).toBe('8px')
  })
})
