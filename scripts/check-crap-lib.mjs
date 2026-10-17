import console from 'node:console'

export const CRAP_THRESHOLD = 6
export const COMPLEXITY_THRESHOLD = 6

/**
 * A method with `crap === null` was skipped by crap-typescript because it
 * has no coverage data. That is a gate failure, not a pass: otherwise an
 * empty or mismatched coverage file makes every method null and the gate
 * passes while checking nothing.
 */
export function findGateViolations(methods) {
  return methods.filter(
    method =>
      method.crap === null ||
      method.crap > CRAP_THRESHOLD ||
      method.cc > COMPLEXITY_THRESHOLD
  )
}

export function formatViolation(method) {
  const crap = method.crap === null ? 'no coverage' : method.crap.toFixed(2)
  return `- ${method.src}:${method.lineStart} ${method.method} (CRAP ${crap}, CC ${method.cc})`
}

/**
 * Fail when the coverage file carries no data at all (for example `{}`),
 * instead of letting every method come back with no coverage.
 */
export function assertUsableCoverage(coverage) {
  const entries = Object.values(coverage ?? {})
  const hasData = entries.some(
    entry =>
      entry &&
      (Object.keys(entry.fnMap ?? {}).length > 0 ||
        Object.keys(entry.statementMap ?? {}).length > 0)
  )
  if (!hasData) {
    throw new Error(
      'Coverage file has no coverage data. Run `npm run test:coverage` first.'
    )
  }
}

/**
 * Vitest merges coverage from several projects that load the same file.
 * The merged file can hold two fnMap entries for one function (for
 * example `forward` and an anonymous duplicate, or a `name_2` entry) with
 * the same declaration and body lines but different names/columns.
 * crap-typescript treats that as an ambiguous match and reports the
 * function as having no coverage. Drop later duplicates, keeping the
 * first entry for each declaration/body line span, so a function that
 * was actually measured is not reported as skipped. Functions on
 * distinct lines are never merged.
 */
export function dedupeCoverageFunctions(coverage) {
  const result = {}
  for (const [path, entry] of Object.entries(coverage ?? {})) {
    if (!entry || typeof entry !== 'object' || !entry.fnMap) {
      result[path] = entry
      continue
    }
    const seen = new Set()
    const fnMap = {}
    const hits = {}
    for (const [key, fn] of Object.entries(entry.fnMap)) {
      const spanKey = [
        fn?.decl?.start?.line,
        fn?.loc?.start?.line,
        fn?.loc?.end?.line,
      ].join(':')
      if (seen.has(spanKey)) continue
      seen.add(spanKey)
      fnMap[key] = fn
      if (entry.f && key in entry.f) hits[key] = entry.f[key]
    }
    result[path] = entry.f ? { ...entry, fnMap, f: hits } : { ...entry, fnMap }
  }
  return result
}

export function printViolations(violations) {
  console.error(
    `CRAP gate failed: ${violations.length} function(s) exceed CRAP ${CRAP_THRESHOLD}, exceed CC ${COMPLEXITY_THRESHOLD}, or have no coverage data.`
  )
  for (const method of violations) {
    console.error(formatViolation(method))
  }
}
