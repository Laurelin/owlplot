import { describe, expect, it } from 'vitest'
import { mergePadding, resolvePointConfig } from './helpers'

describe('mergePadding', () => {
  it('uses defaults when padding is absent', () => {
    expect(mergePadding(undefined)).toEqual({
      top: 16,
      right: 16,
      bottom: 24,
      left: 32,
    })
  })

  it('merges partial values while preserving zero', () => {
    expect(mergePadding({ top: 0, left: 8 })).toEqual({
      top: 0,
      right: 16,
      bottom: 24,
      left: 8,
    })
  })
})

describe('resolvePointConfig', () => {
  it('uses defaults when point config is absent', () => {
    expect(resolvePointConfig()).toEqual({
      shape: { kind: 'circle' },
      size: 2.5,
    })
  })

  it('applies series values over option defaults independently', () => {
    expect(
      resolvePointConfig({ shape: 'diamond' }, { shape: 'square', size: 4 })
    ).toEqual({
      shape: { kind: 'diamond' },
      size: 4,
    })
  })

  it('normalizes every string shorthand', () => {
    expect(resolvePointConfig({ shape: 'circle' }).shape).toEqual({
      kind: 'circle',
    })
    expect(resolvePointConfig({ shape: 'square' }).shape).toEqual({
      kind: 'square',
    })
    expect(resolvePointConfig({ shape: 'triangle' }).shape).toEqual({
      kind: 'triangle',
    })
    expect(resolvePointConfig({ shape: 'diamond' }).shape).toEqual({
      kind: 'diamond',
    })
  })

  it('preserves structured point shapes and zero size', () => {
    const shape = { kind: 'emoji' as const, value: '🦉' }
    expect(resolvePointConfig({ shape, size: 0 })).toEqual({ shape, size: 0 })
  })
})
