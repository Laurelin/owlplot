export type ScaleType = 'linear' | 'log'

export type ContinuousScale = {
  readonly type: ScaleType
  readonly domain: readonly [number, number]
  readonly range: readonly [number, number]
  forward(value: number): number
  invert(pixel: number): number
}

function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[owlplot] ${message}`)
  }
}

function assertFinitePair(
  name: 'domain' | 'range',
  pair: readonly [number, number]
): void {
  const [min, max] = pair
  invariant(
    Number.isFinite(min) && Number.isFinite(max),
    `${name} values must be finite numbers`
  )
}

export function createLinearScale(
  domain: readonly [number, number],
  range: readonly [number, number]
): ContinuousScale {
  assertFinitePair('domain', domain)
  assertFinitePair('range', range)

  const [domainMin, domainMax] = domain
  const [rangeMin, rangeMax] = range
  const domainSpan = domainMax - domainMin
  const rangeSpan = rangeMax - rangeMin

  invariant(domainSpan !== 0, 'linear scale domain span must be non-zero')
  invariant(rangeSpan !== 0, 'linear scale range span must be non-zero')

  const scaleFactor = rangeSpan / domainSpan
  const inverseScaleFactor = domainSpan / rangeSpan

  return {
    type: 'linear',
    domain,
    range,
    forward(value: number): number {
      return rangeMin + (value - domainMin) * scaleFactor
    },
    invert(pixel: number): number {
      return domainMin + (pixel - rangeMin) * inverseScaleFactor
    },
  }
}
