import { describe, expect, it } from 'vitest'
import { missingFromCi, npmScriptsIn } from './check-gate-lib.mjs'

describe('check-gate', () => {
  it('parses npm run names, skipping flags', () => {
    expect(
      npmScriptsIn('npm run lint\nnpm run -s typecheck\nnpm run --silent a:b')
    ).toEqual(['lint', 'typecheck', 'a:b'])
  })

  it('handles npm test and npm t', () => {
    expect(npmScriptsIn('npm test\nnpm t -- --run')).toEqual(['test', 'test'])
  })

  it('skips comment lines', () => {
    expect(npmScriptsIn('# npm run ci in Actions\nnpm run lint')).toEqual([
      'lint',
    ])
  })

  it('reports hook checks missing from ci', () => {
    const ci = 'npm run build && npm run lint'
    expect(missingFromCi('npm run -s lint\nnpm test', ci)).toEqual(['test'])
    expect(missingFromCi('npm run lint', ci)).toEqual([])
  })
})
