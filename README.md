# owlplot

Owlplot is a compute-first visualization engine.

It happens to render charts. It is not a charting library that happens to do compute.

The core idea is simple:

- core turns `data -> layout -> scene`
- renderers turn `scene -> pixels`

That separation is the product.

## Thesis

Most chart libraries entangle meaning, visuals, styling, and interaction into one runtime object.

Owlplot treats meaning as a first-class artifact.

If the core can produce a clean, typed, deterministic scene, then the same output can:

- render to SVG
- render to canvas or HTML
- serialize to image or PDF
- drive hover and selection
- support accessibility and narration
- power custom projections and transforms

Charts are one projection of that scene, not the whole system.

## Design Principles

### 1. Compute-first

The important pipeline is:

`config -> normalized config -> layout -> scene`

The core decides meaning. Renderers consume that meaning.

### 2. Typed internals

Internals should prefer enums and discriminated unions over ad hoc string protocols.

Strings belong at boundaries. Inside the core, we want explicit states and shapes.

### 3. Semantic paint

Paint should be expressed semantically, not in renderer-specific coordinates.

The core should be able to say "left-to-right gradient" without knowing how SVG or canvas encodes it.

### 4. Replaceable renderers

The SVG renderer is an implementation, not a pillar.

If the SVG package disappeared tomorrow, the core should still make architectural sense.

### 5. Deterministic output

Scene output should be pure, predictable, and snapshot-testable.

No hidden DOM dependence. No renderer state leaking back into compute.

## What Owlplot Is

- A typed scene graph for data visualization
- A deterministic compute pipeline
- A foundation for renderers, interactions, accessibility, and exports
- A system where customization should usually mean transforming the scene

## What Owlplot Is Not

- Not D3-style imperative DOM mutation
- Not a monolithic chart instance with a god object API
- Not a thin wrapper around SVG primitives
- Not "a bunch of chart types" as the primary abstraction

## Current Status

Today the repo includes:

- core compute logic for line charts
- deterministic scene generation with snapshot tests
- an SVG renderer with modular rendering, tooltip, and hover systems
- `sceneToSvgString` for Node/SSR markup from the same scene (tooltip, hover, and legend overlay are out of string v1)
- a Node export sample under `scripts/` that writes a `.svg` file with no `document` and no Chromium
- playground text measure via `createCanvasMeasureText` in the browser (`approximateMeasureText` remains the Node/test fallback)
- a demo playground for exploring scene output and renderer behavior
- a React playground app (`apps/react-playground`) that mounts SVG from props (not a published `@owlplot/react` package)

Current interaction work includes:

- customizable tooltips with a default renderer
- hover modes for node, x-axis, and y-axis resolution
- hover indicators like x-line, y-line, and point emphasis

Near-term expansion is still what the architecture already points toward:

- more projections built on the same scene model
- more renderers and integration surfaces
- more scene-transform examples in the playground

## Recipes

Docs below use Simplified Technical English (ASD-STE100): short sentences, one idea per sentence, and plain approved words. The goal is clear steps, not marketing tone.

### SVG mount (browser)

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

### Node export (SVG string)

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


### Scene transform (customize the scene)

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


### React host (playground)

The React playground is a thin host: props → `computeChartScene` → `renderSvgScene`. Updates are new props. There is no `@owlplot/react` package and no `renderer=` slot.

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { computeChartScene, type ChartConfig } from '@owlplot/core'
import {
  createCanvasMeasureText,
  renderSvgScene,
} from '@owlplot/renderer-svg'

type OwlplotChartProps = {
  config: ChartConfig
  width: number
  height: number
}

function OwlplotChart({ config, width, height }: OwlplotChartProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const measureText = useMemo(() => createCanvasMeasureText(), [])

  useEffect(() => {
    const host = hostRef.current
    const svg = svgRef.current
    if (!host || !svg) return

    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))

    const { scene } = computeChartScene(
      config,
      { width, height },
      {
        devicePixelRatio: window.devicePixelRatio || 1,
        measureText,
      }
    )

    renderSvgScene(scene, svg, {
      legendHost: host,
    })
  }, [config, width, height, measureText])

  return (
    <div ref={hostRef}>
      <svg ref={svgRef} role="img" aria-label="owlplot chart" />
    </div>
  )
}
```

Runnable app (after `npm run build`):

```sh
npm run dev:react
```

Full host with legend toggle and hover options: [`apps/react-playground/src/OwlplotChart.tsx`](apps/react-playground/src/OwlplotChart.tsx).

## Example

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

## Tooltip Semantics

Owlplot treats x as semantic only when explicitly signaled, such as a string domain, formatter, unit, or scale type. Purely positional x values are intentionally omitted from default tooltips.

## Architecture Doctrine

The internal decision-making guide lives in [docs/architecture.md](docs/architecture.md).

If we drift from scene-first, compute-first design, we are building a more typed version of the same chart-library trap Owlplot is supposed to avoid.

## Quickstart

```sh
git clone https://github.com/Laurelin/owlplot
cd owlplot
npm install
npm run build
```

Workspace packages (`@owlplot/core`, `@owlplot/renderer-svg`) expose a single public entry via `exports` (`.` + types). After build, verify package-name resolution:

```sh
npm run check:exports
```

That runs `scripts/check-exports.mjs` → vitest project `exports` (`test/exports.resolve.test.ts`), which dynamic-imports both package names. It is also part of `npm run ci`.
