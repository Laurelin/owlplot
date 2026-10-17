import { describe, expect, it } from 'vitest'
import { assertNever } from './assertNever'

describe('assertNever', () => {
  it('throws with the site and value', () => {
    expect(() => assertNever('bogus' as never, 'test-site')).toThrow(
      '[test-site] Unexpected value: "bogus"'
    )
  })
})
