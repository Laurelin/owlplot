// Pure helpers for check-gate.mjs (unit-tested in scripts/check-gate.test.ts).

// `npm run [flags] <name>`, `npm test`, `npm t`. Flags such as -s or
// --silent are skipped, so `npm run -s lint` yields `lint`.
const NPM_SCRIPT =
  /\bnpm\s+(?:run(?:-script)?\s+(?:-{1,2}[\w-]+\s+)*([\w:-]+)|(test|t)\b)/g

/** npm script names a shell snippet runs, in order. Comment lines are skipped. */
export function npmScriptsIn(text) {
  const code = text
    .split('\n')
    .filter(line => !line.trimStart().startsWith('#'))
    .join('\n')
  return [...code.matchAll(NPM_SCRIPT)].map(m => m[1] ?? 'test')
}

/** Scripts the hook runs that `ci` does not. */
export function missingFromCi(hookText, ciScript) {
  const ci = new Set(npmScriptsIn(ciScript))
  return npmScriptsIn(hookText).filter(name => !ci.has(name))
}
