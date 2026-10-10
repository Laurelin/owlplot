# recipes

[back to readme](../README.md)

## browser rendering

Build a scene, then mount it into an SVG element. Use `createCanvasMeasureText` in the browser so layout uses canvas text metrics.

```ts
import { ChartKind, computeChartScene } from '@owlplot/core'
import {
  createCanvasMeasureText,
  renderSvgScene,
} from '@owlplot/renderer-svg'

const size = { width: 640, height: 360 }
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('width', String(size.width))
svg.setAttribute('height', String(size.height))
document.body.appendChild(svg)

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
        ],
      },
    ],
  },
  size,
  {
    devicePixelRatio: window.devicePixelRatio || 1,
    measureText: createCanvasMeasureText(),
  }
)

renderSvgScene(scene, svg)
```

`renderSvgScene` attaches tooltip, hover, and legend when you pass those options.

## node export

Write SVG from the same scene in Node. Do not use `document` or Chromium. Use `approximateMeasureText` for layout. Tooltip, hover, and legend overlay are not part of the string path.

```ts
import { writeFileSync } from 'node:fs'
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
        ],
      },
    ],
  },
  size,
  { devicePixelRatio: 1, measureText: approximateMeasureText }
)

writeFileSync('chart.svg', sceneToSvgString(scene, size))
```

Runnable sample (after `npm run build`):

```sh
npm run export:svg
# optional path:
npm run export:svg -- ./out/chart.svg
```

That runs `scripts/export-chart-svg.ts` via `scripts/export-chart-svg.mjs`.


## scene transforms

Customization is a pure `scene → scene` function. Compute the scene, transform it, then render. Do not add a new chart option for a one-off visual change.

```ts
import { ChartKind, SceneNodeKind, computeChartScene } from '@owlplot/core'
import {
  createCanvasMeasureText,
  renderSvgScene,
  sceneToSvgString,
} from '@owlplot/renderer-svg'
import type { SceneNode } from '@owlplot/core'

/** Drop path/fill/point nodes for one series id. Pure: no SVG, Symbols, or DOM. */
function dropSeriesNodes(seriesId: string) {
  return (scene: SceneNode): SceneNode => {
    if (scene.kind !== SceneNodeKind.GROUP) return scene
    return {
      ...scene,
      children: scene.children.filter(
        node =>
          node.id !== `series:${seriesId}` &&
          node.id !== `series-fill:${seriesId}` &&
          !node.id.startsWith(`point:${seriesId}:`)
      ),
    }
  }
}

const size = { width: 640, height: 360 }
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
svg.setAttribute('width', String(size.width))
svg.setAttribute('height', String(size.height))
document.body.appendChild(svg)

const { scene } = computeChartScene(
  {
    kind: ChartKind.LINE,
    series: [
      {
        id: 'revenue',
        points: [
          { x: 0, y: 100 },
          { x: 1, y: 120 },
          { x: 2, y: 110 },
        ],
      },
      {
        id: 'expenses',
        points: [
          { x: 0, y: 80 },
          { x: 1, y: 85 },
          { x: 2, y: 90 },
        ],
      },
    ],
  },
  size,
  {
    devicePixelRatio: window.devicePixelRatio || 1,
    measureText: createCanvasMeasureText(),
  }
)

const transformed = dropSeriesNodes('expenses')(scene)
renderSvgScene(transformed, svg)

// Same transform before Node export:
// sceneToSvgString(transformed, size)
```

The SVG playground wires the same pattern via `sceneTransforms` on a demo (see **Scene Transforms** tab). Helpers stay in the app or a README snippet — there is no `@owlplot/transforms` package.

## curve options

Line charts currently default to `{ type: 'monotoneX' }`.

```ts
{
  kind: ChartKind.LINE,
  series: [
    {
      id: 'series-1',
      curve: { type: 'linear' },
      points: [...],
    },
  ],
}
```

Available curve modes are `{ type: 'linear' }`, `{ type: 'monotoneX' }`, and `{ type: 'catmullRom', tension?: number }`.

## tooltip values

Owlplot treats x as semantic only when explicitly signaled, such as a string domain, formatter, unit, or scale type. Purely positional x values are intentionally omitted from default tooltips.

