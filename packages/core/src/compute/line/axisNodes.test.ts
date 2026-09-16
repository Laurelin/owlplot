import { describe, expect, it } from 'vitest'
import { Position } from '../../config/types'
import { DominantBaseline, TextAnchor } from '../../text/types'
import type { AxisLayout } from '../cartesian2d/types/axis'
import { axisToSceneNodes } from './axisNodes'

function buildAxis(): AxisLayout {
  return {
    orientation: Position.BOTTOM,
    line: { x1: 0, y1: 0, x2: 100, y2: 0 },
    ticks: [
      { value: 0, position: 0, label: '0' },
      { value: 1, position: 100, label: '1' },
    ],
    tickSize: 6,
    labelLayouts: [
      {
        x: 0,
        y: 10,
        text: '0',
        textAnchor: TextAnchor.MIDDLE,
        dominantBaseline: DominantBaseline.HANGING,
      },
      {
        x: 100,
        y: 10,
        text: '',
        textAnchor: TextAnchor.MIDDLE,
        dominantBaseline: DominantBaseline.HANGING,
      },
    ],
    axisLabelLayout: {
      x: 50,
      y: 25,
      text: 'X axis',
      textAnchor: TextAnchor.MIDDLE,
      dominantBaseline: DominantBaseline.HANGING,
      rotation: 15,
    },
  }
}

function childrenFor(axis: AxisLayout, tickFont?: string, labelFont?: string) {
  const [group] = axisToSceneNodes(
    axis,
    { x: 5, y: 10, width: 100, height: 80 },
    tickFont,
    labelFont
  )
  if (group?.kind !== 'group') throw new Error('expected axis group')
  return group.children
}

describe('axisToSceneNodes', () => {
  it('parses px and pt font sizes and preserves label rotation', () => {
    const children = childrenFor(buildAxis(), '9px', '12pt')
    const tickLabel = children.find(node => node.id.includes('tick-label'))
    const axisLabel = children.find(node => node.id.includes('axis-label'))

    expect(tickLabel?.style?.fontSizePx).toBe(9)
    expect(axisLabel?.style?.fontSizePx).toBe(16)
    expect(axisLabel?.transform).toMatchObject({
      kind: 'rotate',
      degrees: 15,
    })
  })

  it('uses the fallback size for malformed fonts', () => {
    const children = childrenFor(buildAxis(), 'bold sans-serif', 'invalid')
    const textNodes = children.filter(node => node.kind === 'text')
    expect(textNodes.map(node => node.style?.fontSizePx)).toEqual([10, 10])
  })

  it('honors origin hiding and all visibility controls', () => {
    const [group] = axisToSceneNodes(
      buildAxis(),
      { x: 5, y: 10, width: 100, height: 80 },
      undefined,
      undefined,
      true,
      { showAxis: false, showTicks: false, showTickLabels: false }
    )
    if (group?.kind !== 'group') throw new Error('expected axis group')

    expect(group.children.map(node => node.id)).toEqual(['axis-label:bottom'])
  })

  it('positions right axes at the plot edge', () => {
    const axis = buildAxis()
    axis.orientation = Position.RIGHT
    const [group] = axisToSceneNodes(axis, {
      x: 5,
      y: 10,
      width: 100,
      height: 80,
    })
    expect(group?.transform).toEqual({
      kind: 'translate',
      x: 105,
      y: 10,
    })
  })
})
