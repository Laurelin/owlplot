import { describe, expect, it } from 'vitest'
import {
  assertUsableCoverage,
  dedupeCoverageFunctions,
  findGateViolations,
  // @ts-expect-error -- plain .mjs gate script, no type declarations
} from '../scripts/check-crap-lib.mjs'

const method = (overrides: Record<string, unknown>) => ({
  src: 'packages/core/src/example.ts',
  lineStart: 1,
  method: 'example',
  crap: 1,
  cc: 1,
  ...overrides,
})

describe('CRAP gate completeness', () => {
  it('fails a function with no coverage data', () => {
    const violations = findGateViolations([method({ crap: null })])
    expect(violations).toHaveLength(1)
    expect(violations[0].method).toBe('example')
  })

  it('fails an empty coverage file', () => {
    expect(() => assertUsableCoverage({})).toThrow(/no coverage data/)
    expect(() =>
      assertUsableCoverage({ 'x.ts': { fnMap: {}, statementMap: {} } })
    ).toThrow(/no coverage data/)
  })

  it('passes when every function is covered and within thresholds', () => {
    expect(
      findGateViolations([method({ crap: 6, cc: 6 }), method({ crap: 0.5 })])
    ).toEqual([])
    expect(() =>
      assertUsableCoverage({
        'x.ts': { fnMap: { 0: {} }, statementMap: { 0: {} } },
      })
    ).not.toThrow()
  })

  it('still fails CRAP and CC above the thresholds', () => {
    expect(findGateViolations([method({ crap: 6.01 })])).toHaveLength(1)
    expect(findGateViolations([method({ cc: 7 })])).toHaveLength(1)
  })

  it('deduplicates merged fnMap entries for the same function', () => {
    const fn = (name: string, declLine: number, locEndLine: number) => ({
      name,
      decl: { start: { line: declLine, column: 4 } },
      loc: {
        start: { line: declLine, column: 35 },
        end: { line: locEndLine },
      },
    })
    const coverage = {
      'x.ts': {
        fnMap: {
          0: fn('forward', 63, 65),
          1: fn('(anonymous_1)', 63, 65),
          2: fn('other', 90, 92),
        },
        f: { 0: 3, 1: 3, 2: 1 },
        statementMap: { 0: {} },
      },
    }
    const deduped = dedupeCoverageFunctions(coverage)
    expect(Object.keys(deduped['x.ts'].fnMap)).toEqual(['0', '2'])
    expect(deduped['x.ts'].f).toEqual({ 0: 3, 2: 1 })
  })
})
