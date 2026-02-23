import type { AxisScaleConfig } from '../../config/types'

export type ScaleType = 'linear' | 'log'

export type LinearScale = {
  readonly type: 'linear'
  readonly domain: readonly [number, number]
  readonly range: readonly [number, number]
  forward(value: number): number
  invert(pixel: number): number
}

export type LogScale = {
  readonly type: 'log'
  readonly base: number
  readonly domain: readonly [number, number]
  readonly range: readonly [number, number]
  forward(value: number): number
  invert(pixel: number): number
}

export type ContinuousScale = LinearScale | LogScale

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

export function createLogScale(
  domain: readonly [number, number],
  range: readonly [number, number],
  base = 10
): ContinuousScale {
  assertFinitePair('domain', domain)
  assertFinitePair('range', range)

  const [domainMin, domainMax] = domain
  const [rangeMin, rangeMax] = range
  const rangeSpan = rangeMax - rangeMin

  invariant(domainMin > 0 && domainMax > 0, 'log scale domain must be > 0')
  invariant(domainMin !== domainMax, 'log scale domain span must be non-zero')
  invariant(rangeSpan !== 0, 'log scale range span must be non-zero')
  invariant(Number.isFinite(base) && base > 1, 'log scale base must be > 1')

  const logBase = Math.log(base)
  const logDomainMin = Math.log(domainMin) / logBase
  const logDomainMax = Math.log(domainMax) / logBase
  const logDomainSpan = logDomainMax - logDomainMin

  invariant(
    logDomainSpan !== 0,
    'log scale transformed domain span must be non-zero'
  )

  const scaleFactor = rangeSpan / logDomainSpan
  const inverseScaleFactor = logDomainSpan / rangeSpan

  return {
    type: 'log',
    base,
    domain,
    range,
    forward(value: number): number {
      invariant(value > 0, 'log scale forward value must be > 0')
      const logValue = Math.log(value) / logBase
      return rangeMin + (logValue - logDomainMin) * scaleFactor
    },
    invert(pixel: number): number {
      const logValue = logDomainMin + (pixel - rangeMin) * inverseScaleFactor
      return base ** logValue
    },
  }
}

export function createScale(
  config: AxisScaleConfig | undefined,
  domain: readonly [number, number],
  range: readonly [number, number]
): ContinuousScale {
  if (config == null || config.type === 'linear') {
    return createLinearScale(domain, range)
  }
  return createLogScale(domain, range, config.base ?? 10)
}
