export function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return String(value)
    }
    return value.toFixed(2)
  }
  return String(value)
}
