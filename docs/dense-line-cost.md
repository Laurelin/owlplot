# Dense-line SVG cost (canvas gate)

Measurement for issue #20. One fixture size. No `@owlplot/renderer-canvas` in this round.

## Fixture

| Field | Value |
| --- | --- |
| Points | **50,000** |
| Series | 1 (`dense`) |
| `showPoints` | `false` (line path only) |
| Size | 640×360 |
| MeasureText | `approximateMeasureText` (Node) |

Command (after `npm run build`):

```sh
npm run measure:dense-line
```

## Recorded cost (primary)

| Metric | Value |
| --- | --- |
| **SVG node count** after `renderSvgScene` | **23** |
| Scene node count after `computeChartScene` | 23 |

Local wall times (not a CI gate; machine-dependent):

| Step | Approx. |
| --- | --- |
| compute | ~120 ms |
| renderSvgScene | ~10 ms |

## Call

**Keep canvas closed.**

A 50k-point line still mounts as a small SVG tree (one path plus axes/chrome). SVG node count does not explode with point density for line-only scenes. That is not a density product need for `@owlplot/renderer-canvas`.

Reopen the deferred canvas bar only if Laura or Spine ask for a second interactive renderer, or a future fixture shows a node/frame cost that matters under a different mount (for example forced per-point marks).

## Not in this ticket

- `@owlplot/renderer-canvas`
- SVG tuning (`point.focus.only`, etc.)
- Size matrix, workers, benchmark harness
- CI timing as the decision input
