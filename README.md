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
- a demo playground for exploring scene output and renderer behavior

Current interaction work includes:

- customizable tooltips with a default renderer
- hover modes for node, x-axis, and y-axis resolution
- hover indicators like x-line, y-line, and point emphasis

Near-term expansion is still what the architecture already points toward:

- more projections built on the same scene model
- more renderers and integration surfaces
- better docs and examples around scene transforms

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
```
