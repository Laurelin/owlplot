import type { TooltipDatum } from '@owlplot/core'

export interface TooltipRenderer {
  render(datum: TooltipDatum): HTMLElement
  destroy?(el: HTMLElement): void
}
