import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

/**
 * Ensures workspace package names resolve via exports (after build).
 * Run: npm run build && npm run check:exports
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function readPackageJson(rel: string) {
  return JSON.parse(readFileSync(join(root, rel, 'package.json'), 'utf8')) as {
    name: string
    private?: boolean
    version?: string
    exports?: Record<string, unknown>
  }
}

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

  it('keeps private packages with `.` exports only', () => {
    for (const rel of ['packages/core', 'packages/renderer-svg']) {
      const pkg = readPackageJson(rel)
      expect(pkg.private, `${pkg.name} must stay private`).toBe(true)
      expect(Object.keys(pkg.exports ?? {}), `${pkg.name} exports`).toEqual([
        '.',
      ])
    }
  })
})
