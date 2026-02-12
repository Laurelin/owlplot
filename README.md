# owlplot

framework-agnostic charting library (typescript).  
svg mvp with clean core + scene graph → easy integrations.

## vision

owlplot exists to make charts that are:

- simple to work with
- visually appealing by default
- designed to minimize bugs and surprises
- framework-agnostic at the core
- easy to extend with renderers, themes, and interactions

## current status

✅ core compute logic for line charts  
✅ deterministic scene graph + vitest snapshot tests  
✅ SVG renderer with modular architecture

- Scene rendering (groups, paths, rects, circles, text)
- Customizable tooltips with default renderer
- Hover modes (node, x-axis, y-axis)
- Hover indicators (x-line, y-line, point-emphasis with animation)  
  🚧 integrations (react/vue) coming soon  
  🚧 docs/examples expanding

### Tooltips

Owlplot treats x as semantic only when explicitly signaled (string domain, formatter, unit, or scale type). Positional x values are intentionally omitted from default tooltips.

### Line Curves

Line charts default to `{ type: 'monotoneX' }`.

Set curve per series:

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

Available modes are `{ type: 'linear' }`, `{ type: 'monotoneX' }`, and `{ type: 'catmullRom', tension?: number }`.

## quickstart (dev)

clone + install:

```sh
git clone https://github.com/Laurelin/owlplot
cd owlplot
npm install
```