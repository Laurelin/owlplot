import { describe, expect, it } from 'vitest'
import { ChartKind } from '@owlplot/core'
import { chartKindFixtures } from './chartKinds'
import { renderFixtureSvg } from '../scripts/control/render'

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
        const svg = renderFixtureSvg(variant.config)
        expect(svg.startsWith('<svg')).toBe(true)
        expect(svg).not.toMatch(/NaN|Infinity/)
      })
    }
  }

  it('variant ids are unique per kind', () => {
    for (const [, { variants }] of entries) {
      const ids = variants.map(v => v.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
