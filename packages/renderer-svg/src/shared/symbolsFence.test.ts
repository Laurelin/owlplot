import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

// Resolve from repo root (vitest cwd). Avoid import.meta.url — vitest can
// surface a non-file scheme and crash the suite at load (ERR_INVALID_URL_SCHEME).
const repoRoot = process.cwd()
const rendererSrc = join(repoRoot, 'packages/renderer-svg/src')

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
      let files: string[]
      try {
        files = walkSourceFiles(root)
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code
        if (code === 'ENOENT') continue
        throw err
      }
      for (const file of files) {
        const text = readFileSync(file, 'utf8')
        if (
          text.includes('shared/symbols') ||
          /from ['"][^'"]*renderer-svg[^'"]*symbols['"]/.test(text)
        ) {
          offenders.push(relative(repoRoot, file))
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
