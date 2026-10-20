/**
 * Fixture registry: one entry per ChartKind. The mapped `satisfies` type
 * makes a new ChartKind a type error until it has an entry here.
 * Each variant names the bug class it covers.
 */
import { ChartKind, type ChartConfig } from '@owlplot/core'

export type Variant<K extends ChartKind> = {
  id: string
  /** Bug class this variant guards against. */
  covers: string
  config: Extract<ChartConfig, { kind: K }>
}

export type KindFixtures<K extends ChartKind> = {
  /** First entry is the default. */
  variants: readonly Variant<K>[]
}

export const chartKindFixtures = {
  [ChartKind.LINE]: {
    variants: [],
  },
} satisfies { [K in ChartKind]: KindFixtures<K> }
