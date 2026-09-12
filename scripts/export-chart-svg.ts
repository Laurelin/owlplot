/**
 * Node export sample: computeChartScene → sceneToSvgString → .svg file.
 *
 * No document. No Chromium. Tooltip, hover, and legend overlay stay on
 * renderSvgScene (interactive mount).
 *
 * Run after build: npm run export:svg
 * Optional path: npm run export:svg -- ./out/chart.svg
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  ChartKind,
  approximateMeasureText,
  computeChartScene,
} from '@owlplot/core'
import { sceneToSvgString } from '@owlplot/renderer-svg'

const size = { width: 640, height: 360 }

const { scene } = computeChartScene(
  {
    kind: ChartKind.LINE,
    series: [
      {
        id: 'series-1',
        points: [
          { x: 0, y: 10 },
          { x: 1, y: 15 },
          { x: 2, y: 12 },
          { x: 3, y: 18 },
        ],
      },
    ],
    options: { showPoints: true },
  },
  size,
  { devicePixelRatio: 1, measureText: approximateMeasureText }
)

const svg = sceneToSvgString(scene, size)
const out = resolve(process.argv[2] ?? 'chart.svg')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, svg)
console.log(`Wrote ${out} (${svg.length} bytes)`)
