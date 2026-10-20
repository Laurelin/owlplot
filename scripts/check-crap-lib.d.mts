// Types for check-crap-lib.mjs, so tsconfig.root.json can check its tests.
export interface CrapMethod {
  src: string
  lineStart: number
  method: string
  crap: number | null
  cc: number
}

export type CoverageMap = Record<string, CoverageEntry>

export interface CoverageEntry {
  fnMap?: Record<string, unknown>
  statementMap?: Record<string, unknown>
  f?: Record<string, number>
  [key: string]: unknown
}

export const CRAP_THRESHOLD: number
export const COMPLEXITY_THRESHOLD: number
export function findGateViolations<T extends CrapMethod>(methods: T[]): T[]
export function formatViolation(method: CrapMethod): string
export function assertUsableCoverage(coverage: unknown): void
export function dedupeCoverageFunctions(coverage: CoverageMap): CoverageMap
export function printViolations(violations: CrapMethod[]): void
