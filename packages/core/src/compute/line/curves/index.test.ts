import { describe, expect, it } from 'vitest'
import { buildCurvePath } from './index'
import { buildMonotoneXSubpaths } from './monotoneX'
import type { ScreenPointOrGap } from './types'

function countCommands(path: string, command: 'M' | 'L' | 'C'): number {
  return (path.match(new RegExp(`${command}\\s`, 'g')) ?? []).length
}

function extractCCommands(path: string): Array<{
  c1y: number
  c2y: number
  y: number
}> {
  const matches = path.matchAll(
    /C\s*([-.\de]+)\s+([-.\de]+),\s*([-.\de]+)\s+([-.\de]+),\s*([-.\de]+)\s+([-.\de]+)/g
  )
  return Array.from(matches, match => ({
    c1y: Number(match[2]),
    c2y: Number(match[4]),
    y: Number(match[6]),
  }))
}

describe('curve path builders', () => {
  it('linear emits line commands and multiple subpaths across gaps', () => {
    const points: ScreenPointOrGap[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      null,
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]
    const path = buildCurvePath(points, { type: 'linear' })
    expect(countCommands(path, 'M')).toBe(2)
    expect(countCommands(path, 'L')).toBe(2)
    expect(countCommands(path, 'C')).toBe(0)
  })

  it('monotoneX emits cubic commands for strictly increasing x', () => {
    const points: ScreenPointOrGap[] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 3 },
    ]
    const path = buildCurvePath(points, { type: 'monotoneX' })
    expect(countCommands(path, 'M')).toBe(1)
    expect(countCommands(path, 'C')).toBe(3)
    expect(countCommands(path, 'L')).toBe(0)
  })

  it('monotoneX falls back to linear when x is not strictly increasing', () => {
    const points: ScreenPointOrGap[] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 3, y: 3 },
    ]
    const path = buildCurvePath(points, { type: 'monotoneX' })
    expect(countCommands(path, 'C')).toBe(0)
    expect(countCommands(path, 'L')).toBe(3)
  })

  it('monotoneX control-point y values stay within neighboring y bounds', () => {
    const segment = [
      { x: 0, y: 2 },
      { x: 1, y: 4 },
      { x: 2, y: 3 },
      { x: 3, y: 6 },
      { x: 4, y: 5 },
    ]
    const subpaths = buildMonotoneXSubpaths(segment)
    const path = subpaths[0]!
    const cCommands = extractCCommands(path)

    expect(cCommands.length).toBe(segment.length - 1)
    for (let i = 0; i < cCommands.length; i++) {
      const y0 = segment[i]!.y
      const y1 = segment[i + 1]!.y
      const minY = Math.min(y0, y1)
      const maxY = Math.max(y0, y1)
      expect(cCommands[i]!.c1y).toBeGreaterThanOrEqual(minY)
      expect(cCommands[i]!.c1y).toBeLessThanOrEqual(maxY)
      expect(cCommands[i]!.c2y).toBeGreaterThanOrEqual(minY)
      expect(cCommands[i]!.c2y).toBeLessThanOrEqual(maxY)
      expect(cCommands[i]!.y).toBe(y1)
    }
  })

  it('catmullRom emits cubic commands for 3+ points', () => {
    const points: ScreenPointOrGap[] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 3 },
    ]
    const path = buildCurvePath(points, { type: 'catmullRom' })
    expect(countCommands(path, 'M')).toBe(1)
    expect(countCommands(path, 'C')).toBe(3)
  })
})
