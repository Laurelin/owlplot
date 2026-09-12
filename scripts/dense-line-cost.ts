/**
 * Dense-line canvas-gate measurement (~50k points, one series).
 *
 * Records SVG node count after renderSvgScene (primary) and optional scene
 * node count after compute. Wall time is printed for local notes only —
 * not a CI timing gate.
 *
 * Run after build: npm run measure:dense-line
 */
import { measureDenseLineCost } from './dense-line-cost-lib'

const result = measureDenseLineCost()
console.log(
  JSON.stringify(
    {
      ...result,
      note: 'Wall times are local notes only — not a CI gate.',
    },
    null,
    2
  )
)
