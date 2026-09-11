import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const rendererSrc = join(here, '..')
const repoRoot = join(rendererSrc, '../../..')

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walkSourceFiles(p, out)
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) out.push(p)
  }
  return out
}

describe('Symbol bag fence', () => {
  it('public package entry does not re-export shared/symbols', () => {
    const index = readFileSync(join(rendererSrc, 'index.ts'), 'utf8')
    expect(index).not.toMatch(/shared\/symbols/)
    expect(index).not.toMatch(/_SYMBOL/)
  })

  it('core and apps do not import renderer-svg symbols', () => {
    const roots = [join(repoRoot, 'packages', 'core'), join(repoRoot, 'apps')]
    const offenders: string[] = []
    for (const root of roots) {
      try {
        for (const file of walkSourceFiles(root)) {
          const text = readFileSync(file, 'utf8')
          if (
            text.includes('shared/symbols') ||
            /from ['"][^'"]*renderer-svg[^'"]*symbols['"]/.test(text)
          ) {
            offenders.push(relative(repoRoot, file))
          }
        }
      } catch {
        // Missing apps/core path should not fail the fence for this package layout.
      }
    }
    expect(offenders).toEqual([])
  })
})
