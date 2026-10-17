/** Exhaustiveness guard: compile error when a union member is unhandled. */
export function assertNever(value: never, site: string): never {
  throw new Error(`[${site}] Unexpected value: ${JSON.stringify(value)}`)
}
