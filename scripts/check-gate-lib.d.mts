// Types for check-gate-lib.mjs, so tsconfig.root.json can check its tests.
export function npmScriptsIn(text: string): string[]
export function missingFromCi(hookText: string, ciScript: string): string[]
