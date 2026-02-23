import type { ContinuousScale } from './scale'

const LOG_EPSILON = 1e-12
const LOG_EXP_EPSILON = 1e-12

export function generateLinearTicks(
  scale: ContinuousScale,
  count: number
): number[] {
  const [domainMin, domainMax] = scale.domain
  if (count < 2) return [domainMin, domainMax]
  const span = domainMax - domainMin
  const step = span / (count - 1)
  const ticks: number[] = []
  for (let i = 0; i < count; i++) {
    ticks.push(domainMin + step * i)
  }
  return ticks
}

export function generateLogTicks(scale: ContinuousScale): number[] {
  if (scale.type !== 'log') return []

  const [domainMin, domainMax] = scale.domain
  const base = scale.base
  const logBase = Math.log(base)

  const rawMinExp = Math.log(domainMin) / logBase
  const rawMaxExp = Math.log(domainMax) / logBase
  const minExp = Math.ceil(rawMinExp - LOG_EXP_EPSILON)
  const maxExp = Math.floor(rawMaxExp + LOG_EXP_EPSILON)
  const ticks: number[] = []

  for (let exp = minExp; exp <= maxExp; exp++) {
    const value = base ** exp
    if (
      value + LOG_EPSILON >= domainMin &&
      value - LOG_EPSILON <= domainMax
    ) {
      ticks.push(value)
    }
  }
  return ticks
}

export function generateTicks(
  scale: ContinuousScale,
  count: number
): number[] {
  if (scale.type === 'log') {
    return generateLogTicks(scale)
  }
  return generateLinearTicks(scale, count)
}
