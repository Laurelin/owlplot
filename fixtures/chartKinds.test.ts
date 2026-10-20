import { describe, expect, it } from 'vitest'
import { ChartKind, SceneNodeKind, type SceneNode } from '@owlplot/core'
import { chartKindFixtures } from './chartKinds'
import { renderFixture } from '../scripts/control/render'

function countSceneNodes(node: SceneNode): number {
  if (node.kind !== SceneNodeKind.GROUP) return 1
  return node.children.reduce((n, c) => n + countSceneNodes(c), 1)
}

function seriesPath(svg: string, id: string): string {
  const d = new RegExp(`id="${id}"[^>]*\\sd="([^"]*)"`).exec(svg)?.[1]
  expect(d, `${id} path`).toBeDefined()
  return d ?? ''
}

// Dense-50k scene node budget (replaces measure:dense-line). Measured 23 at
// 640x360: one series path plus axes/chrome, independent of point count.
// 40 leaves room for chrome changes; a per-point regression adds ~50k.
const DENSE_MAX_SCENE_NODES = 40

/** Cheap assertions for each variant's `covers` claim, beyond finite SVG. */
const coversChecks: Record<string, (svg: string, scene: SceneNode) => void> = {
  'nulls-gaps': svg => {
    expect(seriesPath(svg, 'series:gaps').match(/M/g)).toHaveLength(3)
  },
  'area-baseline': svg => {
    const fill = seriesPath(svg, 'series-fill:area')
    expect(fill.trim().endsWith('Z')).toBe(true)
    const ys = (d: string) =>
      [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => Number(m[2]))
    const lineMax = Math.max(...ys(seriesPath(svg, 'series:area')))
    expect(Math.max(...ys(fill))).toBeGreaterThan(lineMax)
  },
  'many-series-20': svg => {
    expect(svg.match(/<path id="series:s\d+"/g)).toHaveLength(20)
  },
  'hidden-series': svg => {
    seriesPath(svg, 'series:shown')
    expect(svg).not.toContain('id="series:hidden"')
    const labels = [...svg.matchAll(/>(-?[\d.]+)<\/text/g)].map(m =>
      Number(m[1])
    )
    expect(Math.max(...labels)).toBeLessThan(100)
  },
  'dense-50k': (_svg, scene) => {
    expect(countSceneNodes(scene)).toBeLessThanOrEqual(DENSE_MAX_SCENE_NODES)
  },
}

const entries = Object.entries(chartKindFixtures)

describe('chartKindFixtures', () => {
  it('has an entry with variants for every ChartKind', () => {
    expect(Object.keys(chartKindFixtures).sort()).toEqual(
      Object.values(ChartKind).sort()
    )
    for (const [kind, { variants }] of entries) {
      expect(variants.length, `${kind} has no variants`).toBeGreaterThan(0)
    }
  })

  for (const [kind, { variants }] of entries) {
    for (const variant of variants) {
      it(`${kind}/${variant.id} renders a finite SVG`, () => {
        expect(variant.covers.length).toBeGreaterThan(0)
        expect(variant.config.kind).toBe(kind)
        const { scene, svg } = renderFixture(variant.config)
        expect(svg.startsWith('<svg')).toBe(true)
        expect(svg).not.toMatch(/NaN|Infinity/)
        coversChecks[variant.id]?.(svg, scene)
      })
    }
  }

  it('every covers check names a real variant', () => {
    const ids = entries.flatMap(([, { variants }]) => variants.map(v => v.id))
    for (const id of Object.keys(coversChecks)) expect(ids).toContain(id)
  })

  it('variant ids are unique per kind', () => {
    for (const [, { variants }] of entries) {
      const ids = variants.map(v => v.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
