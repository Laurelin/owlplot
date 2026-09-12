import { describe, it, expect } from 'vitest'

/**
 * Ensures workspace package names resolve via exports (after build).
 * Run: npm run build && npm run check:exports
 */
describe('package exports resolve', () => {
  it('imports @owlplot/core', async () => {
    const mod = await import('@owlplot/core')
    expect(mod).toBeTypeOf('object')
    expect(mod).not.toBeNull()
  })

  it('imports @owlplot/renderer-svg', async () => {
    const mod = await import('@owlplot/renderer-svg')
    expect(mod).toBeTypeOf('object')
    expect(mod).not.toBeNull()
  })
})
