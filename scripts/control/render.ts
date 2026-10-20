/** Pure render step shared by `npm run control -- render` and the fixture test. */
import { approximateMeasureText, computeChartScene } from '@owlplot/core'
import type { ChartConfig } from '@owlplot/core'
import { sceneToSvgString } from '@owlplot/renderer-svg'

export const RENDER_SIZE = { width: 640, height: 360 }

export function renderFixtureSvg(config: ChartConfig): string {
  const { scene } = computeChartScene(config, RENDER_SIZE, {
    devicePixelRatio: 1,
    measureText: approximateMeasureText,
  })
  return sceneToSvgString(scene, RENDER_SIZE)
}
